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
}

// Helper functions defined at module level
function isImageFile(filename: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.svg']
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'))
  return imageExtensions.includes(ext)
}

function extractProductCodes(filename: string): string[] {
  if (!filename || typeof filename !== 'string') return []
  
  try {
    const codes = new Set<string>()
    const nameWithoutExt = filename.replace(/\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i, '')
    
    // Simple approach: extract any alphanumeric sequences that could be SKUs
    const allMatches = nameWithoutExt.match(/\b[a-zA-Z0-9]{3,10}\b/g) || []
    
    for (const match of allMatches) {
      const code = match.toLowerCase()
      codes.add(code)
      
      // Handle zero-padding for numeric codes
      if (/^\d{3}$/.test(code)) {
        codes.add('0' + code)
      }
      if (/^0\d{3}$/.test(code)) {
        codes.add(code.substring(1))
      }
    }
    
    return Array.from(codes)
  } catch (error) {
    console.error('Error extracting codes from:', filename, error)
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
      
      // Direct match
      if (skuToImages.has(normalizedSku)) {
        return skuToImages.get(normalizedSku)![0]
      }
      
      // Try with zero padding variations
      if (/^\d{3}$/.test(normalizedSku)) {
        const paddedSku = '0' + normalizedSku
        if (skuToImages.has(paddedSku)) {
          return skuToImages.get(paddedSku)![0]
        }
      }
      
      if (/^0\d{3}$/.test(normalizedSku)) {
        const unpaddedSku = normalizedSku.substring(1)
        if (skuToImages.has(unpaddedSku)) {
          return skuToImages.get(unpaddedSku)![0]
        }
      }
      
      // Word boundary search through all filenames
      for (const [cachedSku, images] of skuToImages.entries()) {
        for (const image of images) {
          const regex = new RegExp(`\\b${normalizedSku}\\b`, 'i')
          if (regex.test(image.name)) {
            return image
          }
        }
      }
      
      return null
    },
    
    getStats: () => ({ ...stats, totalMappings: skuToImages.size })
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const sessionId = crypto.randomUUID()
  let supabaseClient: any

  const sendProgressUpdate = async (progress: Partial<ScanProgress>) => {
    try {
      if (supabaseClient) {
        const channel = supabaseClient.channel(`storage-scan-${sessionId}`)
        await channel.send({
          type: 'broadcast',
          event: 'scan_progress',
          payload: { ...progress, sessionId }
        })
      }
    } catch (error) {
      console.error('Failed to send progress update:', error)
    }
  }

  const logMessage = async (level: 'info' | 'warn' | 'error', message: string, data?: any) => {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`, data || '')
    
    // Send both progress update and separate log entry
    await sendProgressUpdate({
      currentStep: message,
      errors: level === 'error' ? [message] : undefined
    })

    // Send dedicated log message through realtime
    try {
      if (supabaseClient) {
        const channel = supabaseClient.channel(`storage-scan-${sessionId}`)
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
        })
      }
    } catch (error) {
      console.error('Failed to send log message:', error)
    }
  }

  try {
    supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const startTime = new Date().toISOString()
    await logMessage('info', 'Starting storage bucket image scanning and product mapping')

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
      matchedProducts: 0
    }

    await sendProgressUpdate(progress)

    // Step 1: Get all products with their SKUs
    progress.status = 'scanning'
    progress.currentStep = 'Fetching products from database'
    await sendProgressUpdate(progress)

    const { data: products, error: productsError } = await supabaseClient
      .from('products')
      .select('id, sku, name, categories (name)')
      .not('sku', 'is', null)

    if (productsError) {
      throw new Error(`Failed to fetch products: ${productsError.message}`)
    }

    await logMessage('info', `Found ${products.length} products with SKUs`)

    // Step 2: Recursively scan storage bucket for all images
    progress.currentStep = 'Scanning storage bucket for images'
    await sendProgressUpdate(progress)

    // Helper function to recursively scan storage directories with better error handling
    async function scanStorageDirectory(prefix: string = ''): Promise<StorageFile[]> {
      const allFiles: StorageFile[] = []
      let hasMore = true
      let offset = 0
      const limit = 50 // Reduced limit for better memory management
      
      await logMessage('info', `📂 Scanning directory: "${prefix || 'root'}"`)

      while (hasMore) {
        try {
          const { data: files, error } = await supabaseClient.storage
            .from('product-images')
            .list(prefix, {
              limit,
              offset,
              sortBy: { column: 'name', order: 'asc' }
            })

          if (error) {
            await logMessage('error', `Failed to list files in "${prefix}": ${error.message}`)
            break
          }

          if (!files || files.length === 0) {
            hasMore = false
            break
          }

          await logMessage('info', `   Found ${files.length} items in "${prefix}" (offset: ${offset})`)

          for (const file of files) {
            if (!file.name) continue
            
            const fullPath = prefix ? `${prefix}/${file.name}` : file.name
            
            // Check if it's a directory (no metadata and no file extension)
            const isDirectory = !file.id && !file.metadata && !file.name.includes('.')
            
            if (isDirectory) {
              await logMessage('info', `   📁 Found subdirectory: ${fullPath}`)
              try {
                const subFiles = await scanStorageDirectory(fullPath)
                allFiles.push(...subFiles)
                await logMessage('info', `   ✅ Scanned ${subFiles.length} files from ${fullPath}`)
              } catch (subError) {
                await logMessage('warn', `   ⚠️ Failed to scan subdirectory ${fullPath}: ${subError.message}`)
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
              })
              
              // Log every 10th image to avoid spam
              if (allFiles.length % 10 === 0) {
                await logMessage('info', `   📸 Found ${allFiles.length} images so far...`)
              }
            }
          }

          offset += limit
          if (files.length < limit) {
            hasMore = false
          }

          // Add a small delay to prevent overwhelming the API
          if (hasMore) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }

        } catch (error) {
          await logMessage('error', `Error during scan at offset ${offset}: ${error.message}`)
          break
        }
      }

      return allFiles
    }

    // Get all image files from storage with timeout protection
    await logMessage('info', '🔍 Starting comprehensive storage scan...')
    
    let storageImages: StorageFile[] = []
    try {
      // Set a timeout for the storage scan to prevent hanging
      const scanPromise = scanStorageDirectory()
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Storage scan timeout after 5 minutes')), 5 * 60 * 1000)
      )
      
      storageImages = await Promise.race([scanPromise, timeoutPromise])
      
    } catch (error) {
      await logMessage('error', `Storage scan failed: ${error.message}`)
      throw error
    }
    
    progress.foundImages = storageImages.length
    await logMessage('info', `✅ Completed storage scan: Found ${storageImages.length} images in all directories`)

    // Initialize image cache
    const imageCache = createImageCache()

    // Step 3: Build image mapping using cache
    progress.status = 'processing'
    progress.currentStep = 'Building image mapping cache'
    await sendProgressUpdate(progress)

    await logMessage('info', `Building image cache from ${storageImages.length} images`)
    imageCache.buildMapping(storageImages)
    
    const cacheStats = imageCache.getStats()
    await logMessage('info', `Image cache built: ${cacheStats.totalMappings} unique mappings from ${cacheStats.processed} images`)

    // Step 4: Match products to images
    progress.total = products.length
    progress.currentStep = 'Finding images for each SKU'
    await sendProgressUpdate(progress)

    const matches: Array<{ product: any, image: StorageFile, category?: string }> = []
    const missingSkus: Array<{sku: string, productName: string, category?: string}> = []
    
    // Group products by category for better organization
    const productsByCategory = new Map<string, any[]>()
    for (const product of products) {
      const categoryName = product.categories?.name || 'Uncategorized'
      if (!productsByCategory.has(categoryName)) {
        productsByCategory.set(categoryName, [])
      }
      productsByCategory.get(categoryName)!.push(product)
    }
    
    // Process each category with better progress tracking
    let categoryIndex = 0
    const totalCategories = productsByCategory.size
    
    for (const [categoryName, categoryProducts] of productsByCategory.entries()) {
      categoryIndex++
      await logMessage('info', `📁 Processing category ${categoryIndex}/${totalCategories}: ${categoryName} (${categoryProducts.length} products)`)
      
      let categoryMatches = 0
      for (let i = 0; i < categoryProducts.length; i++) {
        const product = categoryProducts[i]
        
        if (!product.sku) {
          progress.processed++
          continue
        }

        progress.currentFile = `${categoryName}: ${product.sku} (${i + 1}/${categoryProducts.length})`
        
        // Update progress every 10 products to reduce noise
        if (i % 10 === 0 || i === categoryProducts.length - 1) {
          await sendProgressUpdate(progress)
        }

        // Find image using matching
        const matchedImage = imageCache.findImageForSKU(product.sku)
        
        if (matchedImage) {
          matches.push({ 
            product, 
            image: matchedImage,
            category: categoryName
          })
          progress.matchedProducts++
          categoryMatches++
          
          // Only log every 5th match to reduce log spam
          if (categoryMatches % 5 === 0 || categoryMatches === 1) {
            await logMessage('info', `✅ Found ${product.sku} in ${matchedImage.name}`)
          }
        } else {
          missingSkus.push({
            sku: product.sku, 
            productName: product.name,
            category: categoryName
          })
          
          // Log only first few missing SKUs per category to avoid spam
          if (missingSkus.length <= 10) {
            await logMessage('warn', `❌ Not found: ${product.sku}`)
          }
        }

        progress.processed++
      }
      
      await logMessage('info', `   ✅ Category "${categoryName}" complete: ${categoryMatches}/${categoryProducts.length} matched`)
    }
    
    // Statistics
    const totalProducts = products.length
    const foundCount = matches.length
    const notFoundCount = missingSkus.length
    const successRate = Math.round((foundCount / totalProducts) * 100)
    
    await logMessage('info', `📊 Results Summary:`)
    await logMessage('info', `   • Found: ${foundCount}`)
    await logMessage('info', `   • Not found: ${notFoundCount}`)
    await logMessage('info', `   • Success rate: ${successRate}%`)

    // Step 5: Process matches and update database in batches
    progress.currentStep = 'Updating product image records in database'
    progress.total = matches.length
    progress.processed = 0
    await sendProgressUpdate(progress)

    const batchSize = 20 // Process in smaller batches to avoid timeouts
    for (let i = 0; i < matches.length; i += batchSize) {
      const batch = matches.slice(i, Math.min(i + batchSize, matches.length))
      
      await logMessage('info', `📝 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(matches.length/batchSize)} (${batch.length} items)`)
      
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
            continue
          }

          // Skip if this URL already exists for this product
          const existingUrls = new Set(existingImages?.map(img => img.image_url) || [])
          if (existingUrls.has(urlData.publicUrl)) {
            progress.processed++
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
            
            // Log only every 10th success to reduce noise
            if (progress.successful % 10 === 0 || progress.successful === 1) {
              await logMessage('info', `✅ Updated image record for ${product.sku}`)
            }
          }

        } catch (error) {
          progress.failed++
          const errorMsg = `❌ ${product.sku}: ${error.message}`
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
    progress.status = 'completed'
    progress.currentStep = 'Storage scan and mapping completed'
    progress.currentFile = undefined
    await sendProgressUpdate(progress)

    // Final report
    await logMessage('info', `🎉 Storage scan completed!`)
    await logMessage('info', `📈 Final Results:`)
    await logMessage('info', `   • Total products: ${totalProducts}`)
    await logMessage('info', `   • Images found: ${foundCount}`)
    await logMessage('info', `   • Images not found: ${notFoundCount}`)
    await logMessage('info', `   • Success rate: ${successRate}%`)
    await logMessage('info', `   • Database records updated: ${progress.successful}`)
    await logMessage('info', `   • Failed updates: ${progress.failed}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Storage image scan completed',
        sessionId,
        results: {
          totalProducts,
          foundImages: progress.foundImages,
          matchedProducts: progress.matchedProducts,
          processed: progress.processed,
          successful: progress.successful,
          failed: progress.failed,
          errors: progress.errors,
          foundCount,
          notFoundCount,
          successRate,
          categoryBreakdown: Array.from(productsByCategory.entries()).map(([cat, prods]) => ({
            category: cat,
            total: prods.length,
            matched: matches.filter(m => m.category === cat).length
          })),
          missingSkusList: missingSkus.slice(0, 50)
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Storage scan error:', error)
    
    await sendProgressUpdate({
      status: 'error',
      currentStep: `Storage scan failed: ${error.message}`,
      errors: [error.message]
    })

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        sessionId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})