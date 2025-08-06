import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface StorageFile {
  name: string
  id: string
  updated_at: string
  created_at: string
  last_accessed_at: string
  metadata: any
}

interface ScanProgress {
  sessionId: string
  status: 'initializing' | 'scanning' | 'processing' | 'completed' | 'error'
  currentStep: string
  processed: number
  successful: number
  failed: number
  total: number
  currentFile?: string
  errors: string[]
  startTime: string
  foundImages: number
  matchedProducts: number
  uuidMatches: number
  skuMatches: number
  folderStructures: Record<string, { type: 'uuid' | 'sku', count: number }>
}

// Helper functions
function isImageFile(filename: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.svg']
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'))
  return imageExtensions.includes(ext)
}

function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

function analyzeFolderStructure(imagePath: string): { type: 'uuid' | 'sku', productId?: string, pathSegments: string[] } {
  const segments = imagePath.split('/').filter(s => s.length > 0)
  
  // Check for UUID-based folder structure (products/uuid/...)
  if (segments.length >= 2 && segments[0] === 'products' && isUUID(segments[1])) {
    return {
      type: 'uuid',
      productId: segments[1],
      pathSegments: segments
    }
  }
  
  // Otherwise assume SKU-based filename structure
  return {
    type: 'sku',
    pathSegments: segments
  }
}

function extractProductCodes(filename: string, filepath: string): string[] {
  if (!filename || typeof filename !== 'string') return []
  
  try {
    const codes = new Set<string>()
    
    // Remove file extension
    const nameWithoutExt = filename.replace(/\.(jpg|jpeg|png|gif|webp|bmp|tiff|svg)$/i, '')
    
    console.log(`🔍 [EXTRACT_CODES] Processing: ${filename} -> ${nameWithoutExt}`)
    
    // PRIORITY 1: Check for exact SKU as complete filename (highest priority)
    // This handles files like "319027.png" or "ABC123.jpg"
    if (/^[A-Z0-9\-_]+$/i.test(nameWithoutExt)) {
      codes.add(nameWithoutExt.toLowerCase())
      codes.add(nameWithoutExt.toUpperCase())
      console.log(`✅ [EXACT_FILENAME] Found exact SKU: ${nameWithoutExt}`)
    }
    
    // PRIORITY 2: Handle multi-SKU files (e.g., "319027.319026.PNG")
    // Split by common delimiters and check each part
    const parts = nameWithoutExt.split(/[\.\-_\s,]+/)
    for (const part of parts) {
      if (part.length >= 3 && part.length <= 20) {
        // Add the part in various cases
        codes.add(part.toLowerCase())
        codes.add(part.toUpperCase())
        
        // If it's purely numeric and 3-4 digits, also add padded versions
        if (/^\d{3,4}$/.test(part)) {
          // Add zero-padded version
          if (part.length === 3) {
            codes.add('0' + part)
            codes.add('0' + part.toUpperCase())
          }
          // Add unpadded version if it starts with 0
          if (part.startsWith('0') && part.length === 4) {
            codes.add(part.substring(1))
          }
        }
        
        console.log(`📝 [PART] Found potential SKU part: ${part}`)
      }
    }
    
    // PRIORITY 3: Extract from folder path
    // Check if any folder in the path could be a SKU
    const pathParts = filepath.split('/')
    for (const pathPart of pathParts) {
      if (pathPart && pathPart !== filename && !['products', 'images', 'assets'].includes(pathPart.toLowerCase())) {
        // Check if this looks like a SKU
        if (/^[A-Z0-9\-_]{3,20}$/i.test(pathPart)) {
          codes.add(pathPart.toLowerCase())
          codes.add(pathPart.toUpperCase())
          console.log(`📁 [PATH_SKU] Found SKU in path: ${pathPart}`)
        }
      }
    }
    
    // PRIORITY 4: Look for SKU patterns in the filename
    // Pattern: SKU followed by underscore or dash (e.g., "ABC123_front.jpg")
    const skuPatterns = [
      /([A-Z0-9]{3,20})(?:[-_]|$)/gi,  // Alphanumeric codes
      /\b(\d{3,8})\b/g,                 // Numeric codes
      /SKU[-_]?([A-Z0-9]+)/gi,          // Explicit SKU prefix
      /ITEM[-_]?([A-Z0-9]+)/gi,         // ITEM prefix
      /PRODUCT[-_]?([A-Z0-9]+)/gi,      // PRODUCT prefix
    ]
    
    for (const pattern of skuPatterns) {
      const matches = nameWithoutExt.matchAll(pattern)
      for (const match of matches) {
        if (match[1]) {
          codes.add(match[1].toLowerCase())
          codes.add(match[1].toUpperCase())
          console.log(`🎯 [PATTERN] Found SKU via pattern: ${match[1]}`)
        }
      }
    }
    
    const result = Array.from(codes)
    console.log(`✅ [RESULT] Extracted ${result.length} potential codes from "${filename}": [${result.slice(0, 5).join(', ')}${result.length > 5 ? '...' : ''}]`)
    return result
  } catch (error) {
    console.error(`❌ [ERROR] extracting codes from: ${filename}`, error)
    return []
  }
}

function createImageCache() {
  const skuToImages = new Map<string, StorageFile[]>()
  const filenameToImages = new Map<string, StorageFile>()
  const stats = { processed: 0, matched: 0, failed: 0 }
  
  return {
    buildMapping: (storageFiles: StorageFile[]) => {
      skuToImages.clear()
      filenameToImages.clear()
      stats.processed = storageFiles?.length || 0
      stats.matched = 0
      stats.failed = 0
      
      if (!storageFiles || storageFiles.length === 0) return
      
      for (const file of storageFiles) {
        try {
          if (!file?.name) continue
          
          // Extract just the filename from the full path
          const filename = file.name.split('/').pop() || file.name
          
          // Store by filename for direct lookups
          filenameToImages.set(filename.toLowerCase(), file)
          filenameToImages.set(filename.toUpperCase(), file)
          
          // Extract all possible SKU codes from both filename and full path
          const codes = extractProductCodes(filename, file.name)
          
          for (const code of codes) {
            if (!skuToImages.has(code)) {
              skuToImages.set(code, [])
            }
            skuToImages.get(code)!.push(file)
            stats.matched++
          }
        } catch (error) {
          stats.failed++
          console.error(`❌ [CACHE_ERROR] Failed to process file:`, error)
          continue
        }
      }
      
      console.log(`📊 [CACHE_BUILT] Created ${skuToImages.size} SKU mappings from ${storageFiles.length} files`)
    },
    
    findImageForSKU: (sku: string): StorageFile | null => {
      if (!sku) return null
      
      const normalizedSku = sku.trim()
      
      console.log(`🔍 [SEARCH] Looking for SKU: ${normalizedSku}`)
      
      // PRIORITY 1: Direct exact match with original SKU (case-insensitive)
      const variations = [
        normalizedSku.toLowerCase(),
        normalizedSku.toUpperCase(),
        normalizedSku
      ]
      
      for (const variation of variations) {
        if (skuToImages.has(variation)) {
          const images = skuToImages.get(variation)!
          // Prefer images where the SKU is the complete filename
          const exactMatch = images.find(img => {
            const filename = img.name.split('/').pop() || ''
            const nameWithoutExt = filename.replace(/\.(jpg|jpeg|png|gif|webp|bmp|tiff|svg)$/i, '')
            return nameWithoutExt.toLowerCase() === variation.toLowerCase() ||
                   nameWithoutExt.toUpperCase() === variation.toUpperCase()
          })
          
          const image = exactMatch || images[0]
          console.log(`✅ [EXACT_MATCH] Found direct match: ${variation} -> ${image.name}`)
          return image
        }
      }
      
      // PRIORITY 2: Check if it's a filename directly
      const filenameVariations = [
        `${normalizedSku.toLowerCase()}.jpg`,
        `${normalizedSku.toLowerCase()}.png`,
        `${normalizedSku.toLowerCase()}.jpeg`,
        `${normalizedSku.toUpperCase()}.jpg`,
        `${normalizedSku.toUpperCase()}.png`,
        `${normalizedSku.toUpperCase()}.jpeg`,
        normalizedSku.toLowerCase(),
        normalizedSku.toUpperCase()
      ]
      
      for (const fileVariation of filenameVariations) {
        if (filenameToImages.has(fileVariation)) {
          const image = filenameToImages.get(fileVariation)!
          console.log(`✅ [FILENAME_MATCH] Found by filename: ${fileVariation} -> ${image.name}`)
          return image
        }
      }
      
      // PRIORITY 3: Zero padding variations for numeric SKUs
      if (/^\d{3,4}$/.test(normalizedSku)) {
        const paddingVariations = []
        
        // If 3 digits, try with leading zero
        if (normalizedSku.length === 3) {
          paddingVariations.push('0' + normalizedSku)
        }
        
        // If 4 digits starting with 0, try without leading zero
        if (normalizedSku.length === 4 && normalizedSku.startsWith('0')) {
          paddingVariations.push(normalizedSku.substring(1))
        }
        
        for (const padVariation of paddingVariations) {
          if (skuToImages.has(padVariation)) {
            const image = skuToImages.get(padVariation)![0]
            console.log(`✅ [PADDED_MATCH] Found padded variation: ${padVariation} -> ${image.name}`)
            return image
          }
        }
      }
      
      // PRIORITY 4: Partial match - SKU appears as part of a multi-SKU filename
      for (const [cachedSku, images] of skuToImages.entries()) {
        // Check if our SKU is part of a multi-SKU key
        const skuParts = cachedSku.split(/[\.\-_\s,]+/)
        for (const part of skuParts) {
          if (part.toLowerCase() === normalizedSku.toLowerCase() ||
              part.toUpperCase() === normalizedSku.toUpperCase()) {
            const image = images[0]
            console.log(`🎯 [PARTIAL_MATCH] Found in multi-SKU: ${normalizedSku} in ${cachedSku} -> ${image.name}`)
            return image
          }
        }
      }
      
      // PRIORITY 5: Fuzzy search - look for SKU in any part of the filename
      for (const [, images] of skuToImages.entries()) {
        for (const image of images) {
          const filename = image.name.toLowerCase()
          const searchSku = normalizedSku.toLowerCase()
          
          // Check if SKU appears as a word boundary in the filename
          const regex = new RegExp(`\\b${searchSku}\\b`, 'i')
          if (regex.test(filename)) {
            console.log(`🎯 [FUZZY_MATCH] Found fuzzy match: ${normalizedSku} -> ${image.name}`)
            return image
          }
        }
      }
      
      console.log(`❌ [NO_MATCH] No image found for SKU: ${normalizedSku}`)
      return null
    },
    
    getStats: () => ({ ...stats, totalMappings: skuToImages.size })
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const sessionId = crypto.randomUUID();
  let supabaseClient: any;

  // Auth check first
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Authentication required'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    });
  }

  const sendProgressUpdate = async (progress: Partial<ScanProgress>) => {
    try {
      if (supabaseClient) {
        const channel = supabaseClient.channel(`storage-scan-${sessionId}`);
        await channel.send({
          type: 'broadcast',
          event: 'scan_progress',
          payload: { ...progress, sessionId }
        });
      }
    } catch (error) {
      console.error('Failed to send progress update:', error);
    }
  };

  const logMessage = async (level: 'info' | 'warn' | 'error', message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`, data || '');
    
    // Send both progress update and separate log entry
    await sendProgressUpdate({
      currentStep: message,
      errors: level === 'error' ? [message] : undefined
    });

    // Send dedicated log message through realtime
    try {
      if (supabaseClient) {
        const channel = supabaseClient.channel(`storage-scan-${sessionId}`);
        await channel.send({
          type: 'broadcast',
          event: 'scan_log',
          payload: {
            sessionId,
            timestamp: timestamp,
            level: level,
            message: message,
            data: data
          }
        });
      }
    } catch (error) {
      console.error('Failed to send log message:', error);
    }
  };

  try {
    supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const startTime = new Date().toISOString();
    await logMessage('info', '🚀 Starting storage bucket image scanning and product mapping');

    // Initialize progress
    const progress: ScanProgress = {
      sessionId,
      status: 'initializing',
      currentStep: 'Initializing storage scan process',
      processed: 0,
      successful: 0,
      failed: 0,
      total: 0,
      errors: [],
      startTime,
      foundImages: 0,
      matchedProducts: 0,
      uuidMatches: 0,
      skuMatches: 0,
      folderStructures: {}
    };

    await sendProgressUpdate(progress);
    
    // Start processing in background using waitUntil
    EdgeRuntime.waitUntil(processStorageScan());
    
    // Return initial response immediately to prevent timeout
    return new Response(JSON.stringify({ 
      success: true, 
      sessionId, 
      message: 'Storage scan started successfully' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

    async function processStorageScan() {
      try {
        await logMessage('info', '🔧 Background processing started');

        // Step 1: Get all products with their SKUs
        progress.status = 'scanning';
        progress.currentStep = 'Fetching products from database';
        await sendProgressUpdate(progress);

        const { data: products, error: productsError } = await supabaseClient
          .from('products')
          .select('id, sku, name, categories (name)')
          .limit(10000);

        if (productsError) {
          console.error(`❌ [DB_ERROR] Failed to fetch products:`, productsError);
          await logMessage('error', `Failed to fetch products: ${productsError.message}`);
          throw new Error(`Failed to fetch products: ${productsError.message}`);
        }

        // Filter out products without SKU for SKU-based matching
        const productsWithSku = products.filter(p => p.sku && p.sku.trim() !== '');
        
        console.log(`✅ [PRODUCTS] Found ${products.length} products (${productsWithSku.length} with SKUs)`);
        await logMessage('info', `Found ${products.length} products (${productsWithSku.length} with SKUs)`);

        // Step 2: Recursively scan storage bucket for all images
        progress.currentStep = 'Scanning storage bucket for images';
        await sendProgressUpdate(progress);

        // Helper function to recursively scan storage directories
        async function scanStorageDirectory(prefix: string = ''): Promise<StorageFile[]> {
          const allFiles: StorageFile[] = [];
          let hasMore = true;
          let offset = 0;
          const limit = 1000;
          
          await logMessage('info', `📂 Scanning directory: "${prefix || 'root'}"`);

          while (hasMore) {
            try {
              const { data: files, error } = await supabaseClient.storage
                .from('product-images')
                .list(prefix, {
                  limit,
                  offset,
                  sortBy: { column: 'name', order: 'asc' }
                });

              if (error) {
                console.error(`❌ [STORAGE_ERROR] Failed to list files in "${prefix}":`, error);
                await logMessage('error', `Failed to list files in "${prefix}": ${error.message}`);
                break;
              }

              if (!files || files.length === 0) {
                hasMore = false;
                break;
              }

              await logMessage('info', `📂 Found ${files.length} items in "${prefix}" (offset: ${offset})`);

              for (const file of files) {
                if (!file.name) continue;
                
                const fullPath = prefix ? `${prefix}/${file.name}` : file.name;
                
                // Check if it's a directory (no metadata and no file extension)
                const isDirectory = !file.id && !file.metadata && !file.name.includes('.');
                
                if (isDirectory) {
                  console.log(`📁 [DIRECTORY] Found subdirectory: ${fullPath}`);
                  await logMessage('info', `📁 Found subdirectory: ${fullPath}`);
                  try {
                    const subFiles = await scanStorageDirectory(fullPath);
                    allFiles.push(...subFiles);
                  } catch (subError) {
                    console.error(`⚠️ [SUBDIRECTORY_ERROR] Failed to scan ${fullPath}:`, subError);
                    await logMessage('warn', `⚠️ Failed to scan subdirectory ${fullPath}`);
                  }
                } else if (isImageFile(file.name)) {
                  // This is an image file
                  allFiles.push({
                    id: file.id || crypto.randomUUID(),
                    name: fullPath,
                    updated_at: file.updated_at || new Date().toISOString(),
                    created_at: file.created_at || new Date().toISOString(),
                    last_accessed_at: file.last_accessed_at || new Date().toISOString(),
                    metadata: file.metadata || {}
                  });
                  
                  // Log progress periodically
                  if (allFiles.length % 100 === 0) {
                    await logMessage('info', `📸 Found ${allFiles.length} images so far...`);
                  }
                }
              }

              offset += limit;
              if (files.length < limit) {
                hasMore = false;
              }

              // Add a small delay to prevent overwhelming the API
              if (hasMore) {
                await new Promise(resolve => setTimeout(resolve, 100));
              }

            } catch (error) {
              await logMessage('error', `Error during scan at offset ${offset}: ${error.message}`);
              break;
            }
          }

          return allFiles;
        }

        // Get all image files from storage
        await logMessage('info', '🔍 Starting comprehensive storage scan...');
        
        let storageImages: StorageFile[] = [];
        try {
          const scanPromise = scanStorageDirectory();
          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Storage scan timeout after 5 minutes')), 5 * 60 * 1000)
          );
          
          storageImages = await Promise.race([scanPromise, timeoutPromise]);
          
        } catch (error) {
          await logMessage('error', `Storage scan failed: ${error.message}`);
          throw error;
        }
        
        progress.foundImages = storageImages.length;
        console.log(`✅ [SCAN_COMPLETE] Found ${storageImages.length} total images`);
        await logMessage('info', `✅ Found ${storageImages.length} images in storage`);

        // Step 3: Build the image cache for efficient SKU lookups
        progress.status = 'processing'
        progress.currentStep = 'Building image cache for SKU matching'
        await sendProgressUpdate(progress)

        const imageCache = createImageCache()
        console.log(`🧠 [CACHE_BUILD] Building cache from ${storageImages.length} images`)
        await logMessage('info', `🧠 Building image cache from ${storageImages.length} images`)
        
        imageCache.buildMapping(storageImages)
        
        const cacheStats = imageCache.getStats()
        console.log(`✅ [CACHE_STATS] Cache built: ${cacheStats.totalMappings} SKU mappings`)
        await logMessage('info', `✅ Cache built: ${cacheStats.totalMappings} SKU mappings created`)

        // Step 4: Match products to images
        progress.total = products.length
        progress.currentStep = 'Matching products to images'
        await sendProgressUpdate(progress)

        const matches: Array<{ product: any, image: StorageFile, matchType: 'uuid' | 'sku' }> = []
        const missingSkus: Array<{sku: string, productName: string, category?: string}> = []
        
        console.log(`🔍 [MATCHING_START] Starting product-to-image matching process`)
        await logMessage('info', `🔍 Starting to match ${products.length} products to images`)

        // Process each product in batches
        const processingBatchSize = 100;
        for (let batchStart = 0; batchStart < products.length; batchStart += processingBatchSize) {
          const batchEnd = Math.min(batchStart + processingBatchSize, products.length);
          const batch = products.slice(batchStart, batchEnd);
          
          await logMessage('info', `🔄 Processing batch ${Math.floor(batchStart/processingBatchSize) + 1}/${Math.ceil(products.length/processingBatchSize)}`);

          for (let i = 0; i < batch.length; i++) {
            const product = batch[i]
            
            progress.currentFile = `${product.sku || product.id} (${batchStart + i + 1}/${products.length})`
            
            // Update progress periodically
            if ((batchStart + i) % 20 === 0 || batchStart + i === products.length - 1) {
              await sendProgressUpdate(progress)
            }

            let matchedImage: StorageFile | null = null
            let matchType: 'uuid' | 'sku' = 'sku'

            // First priority: Match by SKU if available
            if (product.sku) {
              matchedImage = imageCache.findImageForSKU(product.sku)
              if (matchedImage) {
                matchType = 'sku'
                progress.skuMatches++
                console.log(`✅ [SKU_MATCH] ${product.sku} -> ${matchedImage.name}`)
              }
            }

            // Second priority: Check UUID-based folder structure
            if (!matchedImage && product.id) {
              // Look for images in products/[uuid]/ folder
              const uuidImages = storageImages.filter(img => {
                const analysis = analyzeFolderStructure(img.name)
                return analysis.type === 'uuid' && analysis.productId === product.id
              })
              
              if (uuidImages.length > 0) {
                matchedImage = uuidImages[0]
                matchType = 'uuid'
                progress.uuidMatches++
                console.log(`✅ [UUID_MATCH] ${product.sku || product.id} -> ${matchedImage.name}`)
              }
            }

            // Record result
            if (matchedImage) {
              matches.push({ 
                product, 
                image: matchedImage,
                matchType
              })
              progress.matchedProducts++
              
              // Log progress periodically
              if (progress.matchedProducts % 25 === 0 || progress.matchedProducts === 1) {
                await logMessage('info', `✅ Matched ${progress.matchedProducts} products (${matchType.toUpperCase()}: ${product.sku} → ${matchedImage.name})`)
              }
            } else {
              const categoryName = product.categories?.name || 'Uncategorized'
              missingSkus.push({
                sku: product.sku || product.id, 
                productName: product.name,
                category: categoryName
              })
              
              // Log missing items periodically
              if (missingSkus.length <= 5 || missingSkus.length % 50 === 0) {
                await logMessage('warn', `❌ No image found for: ${product.sku || product.id} (${missingSkus.length} total missing)`)
              }
            }

            progress.processed++
          }

          // Small delay between batches
          if (batchEnd < products.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        // Summary statistics
        const totalProducts = products.length
        const foundCount = matches.length
        const notFoundCount = missingSkus.length
        const successRate = Math.round((foundCount / totalProducts) * 100)
        
        await logMessage('info', `📊 Matching complete: ${foundCount}/${totalProducts} products matched (${successRate}% success rate)`)
        await logMessage('info', `   • SKU matches: ${progress.skuMatches}`)
        await logMessage('info', `   • UUID matches: ${progress.uuidMatches}`)
        await logMessage('info', `   • Not found: ${notFoundCount}`)

        // Step 5: Update database with matched images
        progress.currentStep = 'Updating product image records in database'
        progress.total = matches.length
        progress.processed = 0
        await sendProgressUpdate(progress)

        const updateBatchSize = 10
        for (let i = 0; i < matches.length; i += updateBatchSize) {
          const batch = matches.slice(i, Math.min(i + updateBatchSize, matches.length))
          
          await logMessage('info', `📝 Updating database batch ${Math.floor(i/updateBatchSize) + 1}/${Math.ceil(matches.length/updateBatchSize)}`)
          
          for (const { product, image } of batch) {
            try {
              progress.currentFile = `Updating ${product.sku || product.id}`
              
              if (progress.processed % 5 === 0) {
                await sendProgressUpdate(progress)
              }

              // Get existing images for this product
              const { data: existingImages } = await supabaseClient
                .from('product_images')
                .select('image_url, is_primary')
                .eq('product_id', product.id)

              // Get public URL for the storage file
              const { data: urlData } = supabaseClient.storage
                .from('product-images')
                .getPublicUrl(image.name)

              if (!urlData?.publicUrl) {
                await logMessage('warn', `Failed to generate public URL for ${product.sku}`)
                progress.failed++
                progress.processed++
                continue
              }

              // Skip if this URL already exists for this product
              const existingUrls = new Set(existingImages?.map(img => img.image_url) || [])
              if (existingUrls.has(urlData.publicUrl)) {
                progress.processed++
                progress.successful++
                continue
              }

              // Determine if this should be the primary image
              const isPrimary = !existingImages?.some(img => img.is_primary)

              // Insert new image record
              const { error: insertError } = await supabaseClient
                .from('product_images')
                .insert({
                  product_id: product.id,
                  image_url: urlData.publicUrl,
                  alt_text: `${product.name} product image`,
                  is_primary: isPrimary,
                  sort_order: existingImages?.length || 0
                })

              if (insertError) {
                await logMessage('warn', `Failed to insert image for ${product.sku}: ${insertError.message}`)
                progress.failed++
              } else {
                progress.successful++
                
                if (progress.successful % 25 === 0 || progress.successful === 1) {
                  await logMessage('info', `✅ Updated ${progress.successful} product images in database`)
                }
              }

            } catch (error) {
              progress.failed++
              await logMessage('error', `Failed to process ${product.sku}: ${error.message}`)
            }

            progress.processed++
          }
          
          if (i + updateBatchSize < matches.length) {
            await new Promise(resolve => setTimeout(resolve, 200))
          }
        }

        // Completion
        progress.status = 'completed';
        progress.currentStep = 'Storage scan completed successfully';
        progress.currentFile = undefined;
        await sendProgressUpdate(progress);

        await logMessage('info', `🎉 Storage scan completed successfully!`);
        await logMessage('info', `📈 Final Results:`);
        await logMessage('info', `   • Total products: ${products.length}`);
        await logMessage('info', `   • Images found: ${storageImages.length}`);
        await logMessage('info', `   • Products matched: ${matches.length}`);
        await logMessage('info', `   • Success rate: ${successRate}%`);
        await logMessage('info', `   • Database updated: ${progress.successful} records`);
        await logMessage('info', `   • Failed updates: ${progress.failed}`);

      } catch (error) {
        console.error('❌ [FATAL_ERROR] Storage scan failed:', error);
        progress.status = 'error';
        progress.currentStep = `Error: ${error.message}`;
        progress.errors.push(error.message);
        await sendProgressUpdate(progress);
        await logMessage('error', `Storage scan failed: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ [FATAL_ERROR] Storage scan failed:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      sessionId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});