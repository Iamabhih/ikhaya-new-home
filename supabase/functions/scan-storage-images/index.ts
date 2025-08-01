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

    // Step 1: Get all products with their SKUs and categories
    progress.status = 'scanning'
    progress.currentStep = 'Fetching products from database'
    await sendProgressUpdate(progress)

    const { data: products, error: productsError } = await supabaseClient
      .from('products')
      .select(`
        id, 
        sku, 
        name,
        categories (name)
      `)
      .not('sku', 'is', null)

    if (productsError) {
      throw new Error(`Failed to fetch products: ${productsError.message}`)
    }

    await logMessage('info', `Found ${products.length} products with SKUs`)

    // Step 2: Recursively scan storage bucket for all images
    progress.currentStep = 'Scanning storage bucket for images'
    await sendProgressUpdate(progress)

    // Helper function to recursively scan storage directories
    async function scanStorageDirectory(prefix: string = ''): Promise<StorageFile[]> {
      const allFiles: StorageFile[] = []
      let hasMore = true
      let offset = 0
      const limit = 100

      while (hasMore) {
        const { data: files, error } = await supabaseClient.storage
          .from('product-images')
          .list(prefix, {
            limit,
            offset,
            sortBy: { column: 'name', order: 'asc' }
          })

        if (error) {
          throw new Error(`Failed to list storage files: ${error.message}`)
        }

        if (!files || files.length === 0) {
          hasMore = false
          break
        }

        for (const file of files) {
          if (file.name) {
            const fullPath = prefix ? `${prefix}/${file.name}` : file.name
            
            // If it's a directory, recursively scan it
            if (!file.id && !file.metadata) {
              // This is likely a folder
              const subFiles = await scanStorageDirectory(fullPath)
              allFiles.push(...subFiles)
            } else if (file.metadata && isImageFile(file.name)) {
              // This is an image file
              allFiles.push({
                ...file,
                name: fullPath
              })
            }
          }
        }

        offset += limit
        if (files.length < limit) {
          hasMore = false
        }
      }

      return allFiles
    }

    // Helper function to check if file is an image
    function isImageFile(filename: string): boolean {
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.svg']
      const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'))
      return imageExtensions.includes(ext)
    }

    // Get all image files from storage
    const storageImages = await scanStorageDirectory()
    progress.foundImages = storageImages.length
    await logMessage('info', `Found ${storageImages.length} images in storage bucket (including subdirectories)`)

    // Simplified but more reliable SKU extraction inspired by PowerShell script
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

    // Simplified image cache focused on reliability
    const createImageCache = () => {
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
          
          // Use word boundary matching like PowerShell script
          for (const [cachedSku, images] of skuToImages.entries()) {
            // Direct match
            if (cachedSku === normalizedSku) {
              return images[0] // Take first match like PowerShell script
            }
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
          
          // Word boundary search through all filenames (like PowerShell \b$sku\b)
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


    // Initialize image cache
    const imageCache = createImageCache()

    // Step 3: Build image mapping using enhanced cache
    progress.status = 'processing'
    progress.currentStep = 'Building intelligent image mapping cache'
    await sendProgressUpdate(progress)

    await logMessage('info', `Building image cache from ${storageImages.length} images`)
    imageCache.buildMapping(storageImages)
    
    const cacheStats = imageCache.getStats()
    await logMessage('info', `Image cache built: ${cacheStats.totalMappings} unique mappings from ${cacheStats.processed} images`)

    // Step 4: Simple, reliable matching like PowerShell script
    progress.total = products.length
    progress.currentStep = 'Finding images for each SKU using word boundary matching'
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
    
    // Process each category
    for (const [categoryName, categoryProducts] of productsByCategory.entries()) {
      await logMessage('info', `📁 Processing category: ${categoryName} (${categoryProducts.length} products)`)
      
      for (const product of categoryProducts) {
        if (!product.sku) {
          progress.processed++
          continue
        }

        progress.currentFile = `${categoryName}: ${product.sku}`
        await sendProgressUpdate(progress)

        // Find image using simplified matching (like PowerShell \b$sku\b)
        const matchedImage = imageCache.findImageForSKU(product.sku)
        
        if (matchedImage) {
          matches.push({ 
            product, 
            image: matchedImage,
            category: categoryName
          })
          progress.matchedProducts++
          await logMessage('info', `✅ Found ${product.sku} in ${matchedImage.name}`)
        } else {
          missingSkus.push({
            sku: product.sku, 
            productName: product.name,
            category: categoryName
          })
          await logMessage('warn', `❌ Not found: ${product.sku}`)
        }

        progress.processed++
        await sendProgressUpdate(progress)
      }
    }
    
    // Simple statistics like PowerShell script
    const totalProducts = products.length
    const foundCount = matches.length
    const notFoundCount = missingSkus.length
    const successRate = Math.round((foundCount / totalProducts) * 100)
    
    await logMessage('info', `📊 Results Summary:`)
    await logMessage('info', `   • Found: ${foundCount}`)
    await logMessage('info', `   • Not found: ${notFoundCount}`)
    await logMessage('info', `   • Success rate: ${successRate}%`)

    // Step 4: Process matches and update database
    progress.currentStep = 'Updating product image records'
    progress.total = matches.length
    progress.processed = 0
    await sendProgressUpdate(progress)

    for (const { product, image } of matches) {
      try {
        progress.currentFile = `Updating ${product.sku}`
        await sendProgressUpdate(progress)

        // Get existing images for this product
        const { data: existingImages } = await supabaseClient
          .from('product_images')
          .select('*')
          .eq('product_id', product.id)

        // Get public URL for the storage file
        const { data: urlData } = supabaseClient.storage
          .from('product-images')
          .getPublicUrl(image.name)

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
          await logMessage('info', `✅ Updated image record for ${product.sku}`)
        }

      } catch (error) {
        progress.failed++
        const errorMsg = `❌ ${product.sku}: ${error.message}`
        progress.errors.push(errorMsg)
        await logMessage('error', errorMsg)
      }

      progress.processed++
      await sendProgressUpdate(progress)
    }

    // Completion
    progress.status = 'completed'
    progress.currentStep = 'Storage scan and mapping completed'
    progress.currentFile = undefined
    await sendProgressUpdate(progress)

    // Generate simple, clear final report like PowerShell script
    const totalProducts = products.length
    const foundCount = matches.length
    const notFoundCount = missingSkus.length
    const successRate = Math.round((foundCount / totalProducts) * 100)
    
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
        message: 'Simplified storage image scan completed',
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
          missingSkusList: missingSkus.slice(0, 50) // Sample for debugging
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