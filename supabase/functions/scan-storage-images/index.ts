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

interface FolderAnalysis {
  path: string
  type: 'uuid' | 'sku' | 'mixed'
  imageCount: number
  products?: Array<{ id: string; sku: string; name: string }>
}

// Helper functions defined at module level
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

function extractProductCodes(filename: string): string[] {
  if (!filename || typeof filename !== 'string') return []
  
  try {
    const codes = new Set<string>()
    const nameWithoutExt = filename.replace(/\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i, '')
    
    console.log(`🔍 [EXTRACT_CODES] Processing: ${filename} -> ${nameWithoutExt}`)
    
    // PRIORITY 1: Check for exact numeric filename (highest priority)
    if (/^\d{3,8}$/.test(nameWithoutExt)) {
      codes.add(nameWithoutExt)
      console.log(`✅ [EXACT_FILENAME] Found exact code: ${nameWithoutExt}`)
    }
    
    // PRIORITY 2: Extract numeric sequences, prioritizing longer ones
    const allMatches = nameWithoutExt.match(/\b[a-zA-Z0-9]{3,10}\b/g) || []
    const numericMatches = allMatches.filter(match => /\d+/.test(match))
    
    // Sort by length to prioritize longer, more specific codes
    numericMatches.sort((a, b) => b.length - a.length)
    
    for (const match of numericMatches) {
      const code = match.toLowerCase()
      codes.add(code)
      console.log(`✅ [NUMERIC_CODE] Found numeric sequence: ${match} -> ${code}`)
      
      // Handle zero-padding for numeric codes only
      if (/^\d{3}$/.test(code)) {
        codes.add('0' + code)
        console.log(`📝 [PADDED] Added zero-padded: 0${code}`)
      }
      if (/^0\d{3}$/.test(code)) {
        codes.add(code.substring(1))
        console.log(`📝 [UNPADDED] Added unpadded: ${code.substring(1)}`)
      }
    }
    
    const result = Array.from(codes)
    console.log(`✅ [RESULT] Extracted codes [${result.join(', ')}] from "${filename}"`)
    return result
  } catch (error) {
    console.error(`❌ [ERROR] extracting codes from: ${filename}`, error)
    return []
  }
}

function createImageCache() {
  const skuToImages = new Map<string, StorageFile[]>()
  const stats = { processed: 0, matched: 0, failed: 0 }
  
  return {
    buildMapping: (storageFiles: StorageFile[]) => {
      skuToImages.clear()
      stats.processed = storageFiles?.length || 0
      stats.matched = 0
      stats.failed = 0
      
      if (!storageFiles || storageFiles.length === 0) return
      
      for (const file of storageFiles) {
        try {
          if (!file?.name) continue
          
          const codes = extractProductCodes(file.name)
          for (const code of codes) {
            if (!skuToImages.has(code)) {
              skuToImages.set(code, [])
            }
            skuToImages.get(code)!.push(file)
            stats.matched++
          }
        } catch (error) {
          stats.failed++
          continue
        }
      }
    },
    
    findImageForSKU: (sku: string) => {
      if (!sku) return null
      
      const normalizedSku = sku.toLowerCase().trim()
      
      console.log(`🔍 [SEARCH] Looking for SKU: ${normalizedSku}`)
      
      // PRIORITY 1: Direct exact match (highest priority)
      if (skuToImages.has(normalizedSku)) {
        const image = skuToImages.get(normalizedSku)![0]
        console.log(`✅ [EXACT_MATCH] Found direct match: ${normalizedSku} -> ${image.name}`)
        return image
      }
      
      // PRIORITY 2: Case variations
      const caseVariations = [normalizedSku.toUpperCase(), normalizedSku.toLowerCase()]
      for (const variation of caseVariations) {
        if (skuToImages.has(variation)) {
          const image = skuToImages.get(variation)![0]
          console.log(`✅ [CASE_MATCH] Found case variation: ${variation} -> ${image.name}`)
          return image
        }
      }
      
      // PRIORITY 3: Zero padding variations
      if (/^\d{3}$/.test(normalizedSku)) {
        const paddedSku = '0' + normalizedSku
        if (skuToImages.has(paddedSku)) {
          const image = skuToImages.get(paddedSku)![0]
          console.log(`✅ [PADDED_MATCH] Found padded variation: ${paddedSku} -> ${image.name}`)
          return image
        }
      }
      
      if (/^0\d{3}$/.test(normalizedSku)) {
        const unpaddedSku = normalizedSku.substring(1)
        if (skuToImages.has(unpaddedSku)) {
          const image = skuToImages.get(unpaddedSku)![0]
          console.log(`✅ [UNPADDED_MATCH] Found unpadded variation: ${unpaddedSku} -> ${image.name}`)
          return image
        }
      }
      
      // PRIORITY 4: Word boundary search through all filenames (fuzzy fallback)
      console.log(`🔍 [FUZZY_SEARCH] Attempting fuzzy match for: ${normalizedSku}`)
      for (const [cachedSku, images] of skuToImages.entries()) {
        for (const image of images) {
          const regex = new RegExp(`\\b${normalizedSku}\\b`, 'i')
          if (regex.test(image.name)) {
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
          .not('sku', 'is', null)
          .limit(10000);

        if (productsError) {
          console.error(`❌ [DB_ERROR] Failed to fetch products:`, productsError);
          await logMessage('error', `Failed to fetch products: ${productsError.message}`);
          throw new Error(`Failed to fetch products: ${productsError.message}`);
        }

        console.log(`✅ [PRODUCTS] Found ${products.length} products with SKUs`);
        await logMessage('info', `Found ${products.length} products with SKUs (limit: 10,000)`);

        // Step 2: Recursively scan storage bucket for all images
        progress.currentStep = 'Scanning storage bucket for images';
        await sendProgressUpdate(progress);

        // Helper function to recursively scan storage directories with better error handling
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

              await logMessage('info', `📂 [SCAN] Found ${files.length} items in "${prefix}" (offset: ${offset})`);

              for (const file of files) {
                if (!file.name) continue;
                
                const fullPath = prefix ? `${prefix}/${file.name}` : file.name;
                
                // Check if it's a directory (no metadata and no file extension)
                const isDirectory = !file.id && !file.metadata && !file.name.includes('.');
                
                if (isDirectory) {
                  console.log(`📁 [DIRECTORY] Found subdirectory: ${fullPath}`);
                  await logMessage('info', `📁 [DIRECTORY] Found subdirectory: ${fullPath}`);
                  try {
                    const subFiles = await scanStorageDirectory(fullPath);
                    allFiles.push(...subFiles);
                    console.log(`✅ [SUBDIRECTORY] Scanned ${subFiles.length} files from ${fullPath}`);
                    await logMessage('info', `✅ [SUBDIRECTORY] Scanned ${subFiles.length} files from ${fullPath}`);
                  } catch (subError) {
                    console.error(`⚠️ [SUBDIRECTORY_ERROR] Failed to scan ${fullPath}:`, subError);
                    await logMessage('warn', `⚠️ [SUBDIRECTORY_ERROR] Failed to scan subdirectory ${fullPath}: ${subError.message}`);
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
                  
                  // Log every 100th image to avoid spam but provide progress
                  if (allFiles.length % 100 === 0) {
                    console.log(`📸 [PROGRESS] Found ${allFiles.length} images so far...`);
                    await logMessage('info', `📸 [PROGRESS] Found ${allFiles.length} images so far...`);
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

        // Get all image files from storage with timeout protection
        await logMessage('info', '🔍 Starting comprehensive storage scan...');
        
        let storageImages: StorageFile[] = [];
        try {
          // Set a timeout for the storage scan to prevent hanging
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
        console.log(`✅ [SCAN_COMPLETE] Found ${storageImages.length} total images in all directories`);
        await logMessage('info', `✅ [SCAN_COMPLETE] Found ${storageImages.length} images in all directories`);

        // Step 3: Analyze folder structure and implement hybrid matching
        progress.status = 'processing'
        progress.currentStep = 'Analyzing storage folder structure'
        await sendProgressUpdate(progress)

        // Analyze folder structures
        const folderAnalysis = new Map<string, { type: 'uuid' | 'sku', images: StorageFile[], productIds: Set<string> }>()
        
        for (const image of storageImages) {
          const analysis = analyzeFolderStructure(image.name)
          const folderKey = analysis.type === 'uuid' ? 'products' : analysis.pathSegments[0] || 'root'
          
          if (!folderAnalysis.has(folderKey)) {
            folderAnalysis.set(folderKey, { 
              type: analysis.type, 
              images: [], 
              productIds: new Set() 
            })
          }
          
          folderAnalysis.get(folderKey)!.images.push(image)
          if (analysis.productId) {
            folderAnalysis.get(folderKey)!.productIds.add(analysis.productId)
          }
          
          // Update folder structure stats
          if (!progress.folderStructures[folderKey]) {
            progress.folderStructures[folderKey] = { type: analysis.type, count: 0 }
          }
          progress.folderStructures[folderKey].count++
        }

        console.log(`📊 [FOLDER_ANALYSIS] Analyzing ${folderAnalysis.size} folder structures`)
        await logMessage('info', `📊 [FOLDER_ANALYSIS] Folder structure analysis:`)
        for (const [folder, info] of folderAnalysis.entries()) {
          console.log(`   • ${folder}: ${info.type} structure, ${info.images.length} images, ${info.productIds.size} unique product IDs`)
          await logMessage('info', `   • ${folder}: ${info.type} structure, ${info.images.length} images, ${info.productIds.size} unique product IDs`)
        }

        // Create product maps for efficient lookup
        const productsByUuid = new Map<string, any>()
        const productsBySku = new Map<string, any>()
        
        for (const product of products) {
          productsByUuid.set(product.id, product)
          if (product.sku) {
            productsBySku.set(product.sku.toLowerCase(), product)
          }
        }

        // Step 4: Hybrid matching approach
        progress.total = products.length
        progress.currentStep = 'Hybrid image matching (UUID + SKU)'
        await sendProgressUpdate(progress)

        const matches: Array<{ product: any, image: StorageFile, category?: string, matchType: 'uuid' | 'sku' }> = []
        const missingSkus: Array<{sku: string, productName: string, category?: string}> = []
        
        // Build SKU cache for non-UUID folders
        const imageCache = createImageCache()
        const skuImages = storageImages.filter(img => analyzeFolderStructure(img.name).type === 'sku')
        console.log(`🧠 [CACHE_BUILD] Building SKU cache from ${skuImages.length} SKU-based images`)
        await logMessage('info', `🧠 [CACHE_BUILD] Building SKU cache from ${skuImages.length} SKU-based images`)
        imageCache.buildMapping(skuImages)
        
        const cacheStats = imageCache.getStats()
        console.log(`✅ [CACHE_STATS] Built cache: ${cacheStats.totalMappings} mappings from ${cacheStats.processed} images`)
        await logMessage('info', `✅ [CACHE_STATS] Cache built: ${cacheStats.totalMappings} mappings, ${cacheStats.matched} matched, ${cacheStats.failed} failed`)

        console.log(`🔍 [MATCHING_START] Starting PRIORITIZED hybrid matching process...`)
        await logMessage('info', `🔍 [MATCHING_START] Starting PRIORITIZED hybrid matching: UUID first, then SKU exact, then fuzzy`)

        // Process each product in smaller batches to avoid timeouts
        const processingBatchSize = 100;
        for (let batchStart = 0; batchStart < products.length; batchStart += processingBatchSize) {
          const batchEnd = Math.min(batchStart + processingBatchSize, products.length);
          const batch = products.slice(batchStart, batchEnd);
          
          console.log(`🔄 [MATCHING_BATCH] Processing batch ${Math.floor(batchStart/processingBatchSize) + 1}/${Math.ceil(products.length/processingBatchSize)} (${batch.length} products)`);
          await logMessage('info', `🔄 [MATCHING_BATCH] Processing batch ${Math.floor(batchStart/processingBatchSize) + 1}/${Math.ceil(products.length/processingBatchSize)}`);

          for (let i = 0; i < batch.length; i++) {
            const product = batch[i]
            
            if (!product.sku && !product.id) {
              progress.processed++
              continue
            }

            progress.currentFile = `${product.sku || product.id} (${batchStart + i + 1}/${products.length})`
            
            // Update progress every 20 products to reduce noise
            if ((batchStart + i) % 20 === 0 || batchStart + i === products.length - 1) {
              await sendProgressUpdate(progress)
            }

            let matchedImage: StorageFile | null = null
            let matchType: 'uuid' | 'sku' = 'sku'

            // Strategy 1: UUID-based matching (for products/ folder)
            if (product.id && folderAnalysis.has('products')) {
              const uuidFolder = folderAnalysis.get('products')!
              const uuidImages = uuidFolder.images.filter(img => 
                analyzeFolderStructure(img.name).productId === product.id
              )
              
              if (uuidImages.length > 0) {
                matchedImage = uuidImages[0] // Take first image from the product's folder
                matchType = 'uuid'
                progress.uuidMatches++
                console.log(`✅ [UUID_MATCH] ${product.sku} -> ${matchedImage.name} (UUID-based)`)
              }
            }

            // Strategy 2: SKU-based matching (for other folders) - PRIORITIZED exact matching
            if (!matchedImage && product.sku) {
              matchedImage = imageCache.findImageForSKU(product.sku)
              if (matchedImage) {
                matchType = 'sku'
                progress.skuMatches++
                console.log(`✅ [SKU_MATCH] ${product.sku} -> ${matchedImage.name} (SKU-based)`)
              }
            }

            // Record result
            if (matchedImage) {
              const categoryName = product.categories?.name || 'Uncategorized'
              matches.push({ 
                product, 
                image: matchedImage,
                category: categoryName,
                matchType
              })
              progress.matchedProducts++
              
              // Log every 25th match to reduce spam but show progress
              if (progress.matchedProducts % 25 === 0 || progress.matchedProducts === 1) {
                console.log(`✅ [MATCH_PROGRESS] ${matchType.toUpperCase()}: ${product.sku} → ${matchedImage.name} (${progress.matchedProducts} matches so far)`)
                await logMessage('info', `✅ [MATCH_PROGRESS] ${matchType.toUpperCase()}: ${product.sku} → ${matchedImage.name} (${progress.matchedProducts} matches)`)
              }
            } else {
              const categoryName = product.categories?.name || 'Uncategorized'
              missingSkus.push({
                sku: product.sku || product.id, 
                productName: product.name,
                category: categoryName
              })
              
              // Log first 5 missing items, then every 50th to avoid spam
              if (missingSkus.length <= 5 || missingSkus.length % 50 === 0) {
                console.log(`❌ [NO_MATCH] No image found for: ${product.sku || product.id} (${missingSkus.length} total missing)`)
                await logMessage('warn', `❌ [NO_MATCH] ${product.sku || product.id} (${missingSkus.length} total missing)`)
              }
            }

            progress.processed++
          }

          // Small delay between batches
          if (batchEnd < products.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        // Statistics
        const totalProducts = products.length
        const foundCount = matches.length
        const notFoundCount = missingSkus.length
        const successRate = Math.round((foundCount / totalProducts) * 100)
        
        console.log(`📊 [FINAL_SUMMARY] Matching Results:`)
        console.log(`   • Total products: ${totalProducts}`)
        console.log(`   • Found: ${foundCount} (UUID: ${progress.uuidMatches}, SKU: ${progress.skuMatches})`)
        console.log(`   • Not found: ${notFoundCount}`)
        console.log(`   • Success rate: ${successRate}%`)
        console.log(`   • Folder structures: ${Object.keys(progress.folderStructures).join(', ')}`)
        
        await logMessage('info', `📊 [FINAL_SUMMARY] Results Summary:`)
        await logMessage('info', `   • Total products: ${totalProducts}`)
        await logMessage('info', `   • Found: ${foundCount} (UUID: ${progress.uuidMatches}, SKU: ${progress.skuMatches})`)
        await logMessage('info', `   • Not found: ${notFoundCount}`)
        await logMessage('info', `   • Success rate: ${successRate}%`)
        await logMessage('info', `   • Folder structures found: ${Object.keys(progress.folderStructures).join(', ')}`)

        // Step 5: Process matches and update database in batches
        progress.currentStep = 'Updating product image records in database'
        progress.total = matches.length
        progress.processed = 0
        await sendProgressUpdate(progress)

        const batchSize = 10 // Process in smaller batches to avoid timeouts
        for (let i = 0; i < matches.length; i += batchSize) {
          const batch = matches.slice(i, Math.min(i + batchSize, matches.length))
          
          console.log(`📝 [BATCH_PROCESS] Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(matches.length/batchSize)} (${batch.length} items)`)
          await logMessage('info', `📝 [BATCH_PROCESS] Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(matches.length/batchSize)} (${batch.length} items)`)
          
          for (const { product, image } of batch) {
            try {
              progress.currentFile = `Updating ${product.sku}`
              
              // Update progress every 5 items to reduce noise
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
                await logMessage('warn', `Failed to insert image record for ${product.sku}: ${insertError.message}`)
                progress.failed++
              } else {
                progress.successful++
                
                // Log every 25th success to reduce noise but show progress
                if (progress.successful % 25 === 0 || progress.successful === 1) {
                  console.log(`✅ [DB_SUCCESS] Updated image record for ${product.sku} (${progress.successful} total successful)`)
                  await logMessage('info', `✅ [DB_SUCCESS] Updated image record for ${product.sku} (${progress.successful} total)`)
                }
              }

            } catch (error) {
              progress.failed++
              const errorMsg = `❌ [DB_ERROR] ${product.sku}: ${error.message}`
              console.error(`❌ [DB_ERROR] Processing error for ${product.sku}:`, error)
              progress.errors.push(errorMsg)
              await logMessage('error', errorMsg)
            }

            progress.processed++
          }
          
          // Small delay between batches to prevent overwhelming the database
          if (i + batchSize < matches.length) {
            await new Promise(resolve => setTimeout(resolve, 200))
          }
        }

        // Completion
        progress.status = 'completed';
        progress.currentStep = 'Storage scan and mapping completed';
        progress.currentFile = undefined;
        await sendProgressUpdate(progress);

        // Final report
        console.log(`🎉 [COMPLETED] Storage scan and image linking completed!`);
        console.log(`📈 [FINAL_RESULTS] Complete Summary:`);
        console.log(`   • Total products: ${products.length}`);
        console.log(`   • Images found: ${matches.length}`);
        console.log(`   • Images not found: ${missingSkus.length}`);
        console.log(`   • Success rate: ${Math.round((matches.length / products.length) * 100)}%`);
        console.log(`   • Database records updated: ${progress.successful}`);
        console.log(`   • Failed updates: ${progress.failed}`);
        
        await logMessage('info', `🎉 [COMPLETED] Storage scan completed!`);
        await logMessage('info', `📈 [FINAL_RESULTS] Complete Results:`);
        await logMessage('info', `   • Total products: ${products.length}`);
        await logMessage('info', `   • Images found: ${matches.length}`);
        await logMessage('info', `   • Images not found: ${missingSkus.length}`);
        await logMessage('info', `   • Success rate: ${Math.round((matches.length / products.length) * 100)}%`);
        await logMessage('info', `   • Database records updated: ${progress.successful}`);
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
