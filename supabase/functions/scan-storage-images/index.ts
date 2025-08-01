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
        await supabaseClient
          .channel(`storage-scan-${sessionId}`)
          .send({
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
        await supabaseClient
          .channel(`storage-scan-${sessionId}`)
          .send({
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
      .select('id, sku, name')
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

    // Enhanced matching functions inspired by ImageSKUMatcher from GDrive migration
    const createImageCache = () => {
      const cache = new Map<string, StorageFile>()
      const stats = { processed: 0, matched: 0, failed: 0 }
      
      return {
        buildMapping: (storageFiles: StorageFile[]) => {
          cache.clear()
          stats.processed = storageFiles?.length || 0
          stats.matched = 0
          stats.failed = 0
          
          if (!storageFiles || storageFiles.length === 0) return
          
          for (const file of storageFiles) {
            try {
              if (!file?.name) continue
              
              const codes = extractProductCodes(file.name)
              for (const code of codes) {
                if (!cache.has(code)) {
                  cache.set(code, file)
                  stats.matched++
                }
              }
            } catch (error) {
              stats.failed++
              continue
            }
          }
        },
        
        getImage: (sku: string) => {
          if (!sku) return { found: false, image: null }
          
          const normalizedSku = sku.toLowerCase().trim()
          
          // Direct match
          if (cache.has(normalizedSku)) {
            return { found: true, image: cache.get(normalizedSku) }
          }
          
          // Try with zero padding for 3-digit SKUs
          if (/^\d{3}$/.test(normalizedSku)) {
            const paddedSku = '0' + normalizedSku
            if (cache.has(paddedSku)) {
              return { found: true, image: cache.get(paddedSku) }
            }
          }
          
          // Try without leading zero for 4-digit SKUs
          if (/^0\d{3}$/.test(normalizedSku)) {
            const unpaddedSku = normalizedSku.substring(1)
            if (cache.has(unpaddedSku)) {
              return { found: true, image: cache.get(unpaddedSku) }
            }
          }
          
          return { found: false, image: null }
        },
        
        getStats: () => ({ ...stats, cacheSize: cache.size })
      }
    }

    function extractProductCodes(filename: string): string[] {
      if (!filename || typeof filename !== 'string') return []
      
      try {
        const codes = new Set<string>()
        const nameWithoutExt = filename.replace(/\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i, '')
        const cleanName = nameWithoutExt.toLowerCase()
        
        // Extract numeric codes (3-6 digits)
        const numericMatches = cleanName.match(/\b\d{3,6}\b/g)
        if (numericMatches) {
          numericMatches.forEach(match => {
            codes.add(match)
            // Auto-pad short codes
            if (match.length === 3) {
              codes.add('0' + match)
            }
          })
        }
        
        // Extract alphanumeric codes (3-8 characters)
        const alphanumericMatches = cleanName.match(/\b[a-z0-9]{3,8}\b/g)
        if (alphanumericMatches) {
          alphanumericMatches.forEach(match => codes.add(match))
        }
        
        // Handle separators and split by common delimiters
        const parts = cleanName.split(/[-_\s\.]+/).filter(part => part && part.length > 0)
        for (const part of parts) {
          if (/^\d{3,6}$/.test(part) || /^[a-z0-9]{3,8}$/.test(part)) {
            codes.add(part)
            if (/^\d{3}$/.test(part)) {
              codes.add('0' + part)
            }
          }
        }
        
        // Try common prefixes
        const prefixes = ['product', 'item', 'sku', 'code']
        for (const prefix of prefixes) {
          const regex = new RegExp(`${prefix}[-_\\s]*([a-z0-9]{3,8})`, 'g')
          let match
          while ((match = regex.exec(cleanName)) !== null) {
            codes.add(match[1])
            if (/^\d{3}$/.test(match[1])) {
              codes.add('0' + match[1])
            }
          }
        }
        
        return Array.from(codes)
      } catch (error) {
        console.error('Error extracting codes from:', filename, error)
        return []
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
    await logMessage('info', `Image cache built: ${cacheStats.cacheSize} unique mappings from ${cacheStats.processed} images`)

    // Step 4: Match products to images efficiently using intelligent cache
    progress.total = products.length
    progress.currentStep = 'Matching products to images using intelligent cache'
    await sendProgressUpdate(progress)

    const matches: Array<{ product: any, image: StorageFile }> = []
    
    for (const product of products) {
      if (!product.sku) {
        progress.processed++
        continue
      }

      progress.currentFile = `Analyzing SKU: ${product.sku}`
      await sendProgressUpdate(progress)

      const result = imageCache.getImage(product.sku)
      if (result.found && result.image) {
        matches.push({ product, image: result.image })
        progress.matchedProducts++
        await logMessage('info', `✅ Matched SKU ${product.sku} to image ${result.image.name}`)
      }

      progress.processed++
      await sendProgressUpdate(progress)
    }

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

    await logMessage('info', `🎉 Storage scan completed: Found ${progress.foundImages} images, matched ${progress.matchedProducts} products, updated ${progress.successful} successfully, ${progress.failed} failed`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Storage image scan and mapping completed',
        sessionId,
        results: {
          foundImages: progress.foundImages,
          matchedProducts: progress.matchedProducts,
          processed: progress.processed,
          successful: progress.successful,
          failed: progress.failed,
          errors: progress.errors
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