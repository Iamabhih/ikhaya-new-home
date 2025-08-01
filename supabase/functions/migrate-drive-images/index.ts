import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DriveFile {
  id: string
  name: string
  mimeType: string
}

interface MigrationProgress {
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
  estimatedTimeRemaining?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const sessionId = crypto.randomUUID()
  let supabaseClient: any

  const sendProgressUpdate = async (progress: Partial<MigrationProgress>) => {
    try {
      if (supabaseClient) {
        await supabaseClient
          .channel(`migration-${sessionId}`)
          .send({
            type: 'broadcast',
            event: 'migration_progress',
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
    
    await sendProgressUpdate({
      currentStep: message,
      errors: level === 'error' ? [message] : undefined
    })
  }

  try {
    supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const googleApiKey = Deno.env.get('GOOGLE_DRIVE_API_KEY')
    const folderId = '1tG66zQTXGR-BQwjYZheRHVQ7s4n6-Jan' // Your Google Drive folder ID

    if (!googleApiKey) {
      await logMessage('error', 'Google Drive API key not configured')
      throw new Error('Google Drive API key not configured')
    }

    const startTime = new Date().toISOString()
    await logMessage('info', 'Starting enhanced image migration from Google Drive to Supabase')

    // Initialize progress
    const progress: MigrationProgress = {
      sessionId,
      status: 'initializing',
      currentStep: 'Initializing migration process',
      processed: 0,
      successful: 0,
      failed: 0,
      total: 0,
      errors: [],
      startTime
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

    // Step 2: Get all files from Google Drive with pagination support
    progress.currentStep = 'Scanning Google Drive folder (this may take a while for large folders)'
    await sendProgressUpdate(progress)

    let allDriveFiles: DriveFile[] = []
    let nextPageToken: string | null = null
    let pageCount = 0
    
    do {
      pageCount++
      await logMessage('info', `Scanning Google Drive page ${pageCount}...`)
      
      let url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType+contains+'image/'&key=${googleApiKey}&fields=files(id,name,mimeType),nextPageToken&pageSize=1000`
      if (nextPageToken) {
        url += `&pageToken=${nextPageToken}`
      }

      const driveResponse = await fetch(url)
      
      if (!driveResponse.ok) {
        throw new Error(`Google Drive API error: ${driveResponse.statusText}`)
      }

      const driveData = await driveResponse.json()
      const pageFiles = driveData.files || []
      allDriveFiles.push(...pageFiles)
      nextPageToken = driveData.nextPageToken
      
      await logMessage('info', `Found ${pageFiles.length} images on page ${pageCount}. Total so far: ${allDriveFiles.length}`)
      
      // Add delay between API calls to avoid rate limiting
      if (nextPageToken) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } while (nextPageToken)

    await logMessage('info', `Scan complete! Found ${allDriveFiles.length} total images across ${pageCount} pages`)

    // Enhanced matching functions inspired by ImageSKUMatcher
    const createImageCache = () => {
      const cache = new Map<string, DriveFile>()
      const stats = { processed: 0, matched: 0, failed: 0 }
      
      return {
        buildMapping: (driveFiles: DriveFile[]) => {
          cache.clear()
          stats.processed = driveFiles?.length || 0
          stats.matched = 0
          stats.failed = 0
          
          if (!driveFiles || driveFiles.length === 0) return
          
          for (const file of driveFiles) {
            try {
              if (!file?.name || !file?.mimeType?.includes('image/')) continue
              
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

    await logMessage('info', `Building image cache from ${allDriveFiles.length} images`)
    imageCache.buildMapping(allDriveFiles)
    
    const cacheStats = imageCache.getStats()
    await logMessage('info', `Image cache built: ${cacheStats.cacheSize} unique mappings from ${cacheStats.processed} images`)

    // Step 4: Match products to images efficiently
    progress.total = products?.length || 0
    progress.currentStep = 'Matching products to images using intelligent cache'
    await sendProgressUpdate(progress)

    const matchedProducts: Array<{product: any, imageFile: DriveFile}> = []
    
    if (!products || products.length === 0) {
      await logMessage('warn', 'No products found to process')
      progress.total = 0
      await sendProgressUpdate(progress)
    } else {
      for (const product of products) {
        try {
          if (!product || !product.sku) continue

          const result = imageCache.getImage(product.sku)
          if (result.found && result.image) {
            matchedProducts.push({ product, imageFile: result.image })
          }
        } catch (error) {
          await logMessage('error', `Error matching product ${product?.sku || 'unknown'}: ${error.message}`)
        }
      }
    }

    progress.total = matchedProducts.length
    await logMessage('info', `Intelligent matching complete: ${matchedProducts.length} products matched from ${allDriveFiles.length} images`)
    await sendProgressUpdate(progress)

    // Step 5: Process matched products with enhanced error handling
    const batchSize = 5 // Increased batch size for better efficiency  
    
    await logMessage('info', `Starting migration of ${matchedProducts.length} matched products in batches of ${batchSize}`)
    
    if (matchedProducts.length === 0) {
      await logMessage('warn', 'No products to migrate - check SKU matching logic')
      progress.status = 'completed'
      progress.currentStep = 'No products matched - migration completed'
      await sendProgressUpdate(progress)
      return new Response(JSON.stringify({
        success: true,
        message: 'Migration completed - no products matched',
        sessionId,
        results: { processed: 0, successful: 0, failed: 0, errors: [] }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }
    
    for (let i = 0; i < matchedProducts.length; i += batchSize) {
      const batch = matchedProducts.slice(i, Math.min(i + batchSize, matchedProducts.length))
      const batchNumber = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(matchedProducts.length / batchSize)
      
      await logMessage('info', `Processing batch ${batchNumber}/${totalBatches}`)
      
      // Process batch sequentially for better stability with large datasets
      for (const { product, imageFile } of batch) {
        try {
          progress.currentFile = `${product.sku} (${imageFile.name})`
          await sendProgressUpdate(progress)
          await logMessage('info', `Processing ${product.sku}: ${imageFile.name}`)

          // Download image with enhanced retry logic and rate limiting
          let imageResponse
          let retries = 5 // Increased retries for large datasets
          let backoffDelay = 1000 // Start with 1 second
          
          while (retries > 0) {
            try {
              imageResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files/${imageFile.id}?alt=media&key=${googleApiKey}`
              )
              if (imageResponse.ok) break
              
              // Handle rate limiting specifically
              if (imageResponse.status === 429) {
                await logMessage('warn', `Rate limited for ${product.sku}, waiting ${backoffDelay}ms before retry`)
                await new Promise(resolve => setTimeout(resolve, backoffDelay))
                backoffDelay *= 2 // Exponential backoff
              } else {
                throw new Error(`HTTP ${imageResponse.status}: ${imageResponse.statusText}`)
              }
            } catch (error) {
              retries--
              if (retries === 0) throw error
              await logMessage('warn', `Retry downloading ${product.sku}, attempts remaining: ${retries}`)
              await new Promise(resolve => setTimeout(resolve, backoffDelay))
            }
          }

          if (!imageResponse.ok) {
            throw new Error(`Failed to download image: ${imageResponse.statusText}`)
          }

          const imageBlob = await imageResponse.blob()
          
          // Validate image size to prevent memory issues
          if (imageBlob.size > 10 * 1024 * 1024) { // 10MB limit
            await logMessage('warn', `Skipping ${product.sku}: Image too large (${Math.round(imageBlob.size / 1024 / 1024)}MB)`)
            continue
          }
          
          const fileExtension = imageFile.name.toLowerCase().endsWith('.png') ? 'png' : 'jpg'
          const fileName = `${product.sku}.${fileExtension}`

          // Upload to Supabase Storage with enhanced retry logic
          let uploadResult
          retries = 5
          backoffDelay = 1000
          
          while (retries > 0) {
            try {
              uploadResult = await supabaseClient.storage
                .from('product-images')
                .upload(fileName, imageBlob, {
                  contentType: imageFile.mimeType,
                  upsert: true
                })
              if (!uploadResult.error) break
              throw uploadResult.error
            } catch (error) {
              retries--
              if (retries === 0) throw error
              await logMessage('warn', `Retry uploading ${product.sku}, attempts remaining: ${retries}`)
              await new Promise(resolve => setTimeout(resolve, backoffDelay))
              backoffDelay *= 1.5
            }
          }

          if (uploadResult.error) {
            throw new Error(`Upload failed: ${uploadResult.error.message}`)
          }

          // Get the public URL
          const { data: urlData } = supabaseClient.storage
            .from('product-images')
            .getPublicUrl(fileName)

          // Update or create product image record
          const { data: existingImage } = await supabaseClient
            .from('product_images')
            .select('id')
            .eq('product_id', product.id)
            .eq('is_primary', true)
            .single()

          if (existingImage) {
            const { error: updateError } = await supabaseClient
              .from('product_images')
              .update({
                image_url: urlData.publicUrl,
                alt_text: `${product.name} product image`
              })
              .eq('id', existingImage.id)

            if (updateError) {
              throw new Error(`Failed to update product image: ${updateError.message}`)
            }
          } else {
            const { error: insertError } = await supabaseClient
              .from('product_images')
              .insert({
                product_id: product.id,
                image_url: urlData.publicUrl,
                alt_text: `${product.name} product image`,
                is_primary: true,
                sort_order: 0
              })

            if (insertError) {
              throw new Error(`Failed to create product image record: ${insertError.message}`)
            }
          }

          progress.successful++
          await logMessage('info', `✅ Successfully migrated ${product.sku}`)
          
        } catch (error) {
          progress.failed++
          const errorMsg = `❌ ${product.sku}: ${error.message}`
          progress.errors.push(errorMsg)
          await logMessage('error', errorMsg)
        } finally {
          progress.processed++
          
          // Calculate and update estimated time remaining
          if (progress.processed > 0) {
            const elapsed = Date.now() - new Date(startTime).getTime()
            const avgTimePerItem = elapsed / progress.processed
            const remaining = (progress.total - progress.processed) * avgTimePerItem
            progress.estimatedTimeRemaining = `${Math.round(remaining / 1000 / 60)}min ${Math.round((remaining / 1000) % 60)}s`
          }
          
          await sendProgressUpdate(progress)
        }
      }
      
      // Enhanced delay between batches to respect API limits (longer for large datasets)
      if (i + batchSize < matchedProducts.length) {
        const delay = Math.min(5000, 1000 + (batchNumber * 100)) // Progressive delay up to 5 seconds
        await logMessage('info', `Batch ${batchNumber} complete. Waiting ${delay}ms before next batch...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    // Completion
    progress.status = 'completed'
    progress.currentStep = 'Migration completed successfully'
    progress.currentFile = undefined
    await sendProgressUpdate(progress)

    await logMessage('info', `🎉 Migration completed: ${progress.successful} successful, ${progress.failed} failed`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Image migration completed',
        sessionId,
        results: {
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
    console.error('Migration error:', error)
    
    await sendProgressUpdate({
      status: 'error',
      currentStep: `Migration failed: ${error.message}`,
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