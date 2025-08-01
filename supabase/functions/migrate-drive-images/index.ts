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

    // Enhanced helper function to extract product codes from filename
    function extractProductCodes(filename: string): string[] {
      const codes: string[] = []
      const nameWithoutExt = filename.replace(/\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i, '')
      
      // Enhanced extraction - changed from 4,6 to 3,6 to catch shorter codes like 206
      const numericCodes = nameWithoutExt.match(/\b\d{3,6}\b/g)
      if (numericCodes) {
        codes.push(...numericCodes)
      }
      
      // Enhanced alphanumeric extraction - changed from 4,8 to 3,8
      const alphanumericCodes = nameWithoutExt.match(/\b[A-Z0-9]{3,8}\b/gi)
      if (alphanumericCodes) {
        codes.push(...alphanumericCodes.map(code => code.toLowerCase()))
      }
      
      // Split by common delimiters and check each part
      const parts = nameWithoutExt.split(/[-_\s\.]+/)
      for (const part of parts) {
        const cleanPart = part.trim()
        if (/^\d{3,6}$/.test(cleanPart) || /^[A-Z0-9]{3,8}$/i.test(cleanPart)) {
          codes.push(cleanPart.toLowerCase())
        }
      }
      
      // Special handling for short codes - add zero-padded versions
      const originalCodes = [...codes]
      for (const code of originalCodes) {
        if (/^\d{3}$/.test(code)) {
          codes.push('0' + code) // Add zero-padded version
        }
      }
      
      // Remove duplicates
      return [...new Set(codes)]
    }

    // Enhanced image mapping function
    function findBestMatch(productSku: string, driveFiles: DriveFile[]): DriveFile | null {
      const normalizedSku = productSku.toLowerCase().trim()
      
      // Try exact filename matches first
      for (const file of driveFiles) {
        if (!file.mimeType?.includes('image/')) continue
        
        const fileName = file.name.toLowerCase()
        // Direct filename matches
        if (fileName === `${normalizedSku}.png` || 
            fileName === `${normalizedSku}.jpg` || 
            fileName === `${normalizedSku}.jpeg`) {
          return file
        }
      }
      
      // Try enhanced code extraction matching
      for (const file of driveFiles) {
        if (!file.mimeType?.includes('image/')) continue
        
        const extractedCodes = extractProductCodes(file.name)
        
        // Check if product SKU matches any extracted code
        if (extractedCodes.includes(normalizedSku)) {
          return file
        }
        
        // For 3-digit SKUs, also try zero-padded version
        if (/^\d{3}$/.test(normalizedSku) && extractedCodes.includes('0' + normalizedSku)) {
          return file
        }
        
        // For 4-digit SKUs starting with 0, try without leading zero
        if (/^0\d{3}$/.test(normalizedSku)) {
          const withoutZero = normalizedSku.substring(1)
          if (extractedCodes.includes(withoutZero)) {
            return file
          }
        }
      }
      
      return null
    }

    // Step 3: Match products to images using enhanced matching (process in chunks for memory efficiency)
    progress.status = 'processing'
    progress.total = products.length
    progress.currentStep = 'Matching products to images (processing in chunks for large datasets)'
    await sendProgressUpdate(progress)

    const matchedProducts = []
    const chunkSize = 1000 // Process products in chunks to avoid memory issues
    
    for (let i = 0; i < products.length; i += chunkSize) {
      const productChunk = products.slice(i, Math.min(i + chunkSize, products.length))
      await logMessage('info', `Processing product chunk ${Math.floor(i/chunkSize) + 1}/${Math.ceil(products.length/chunkSize)}`)
      
      for (const product of productChunk) {
        if (!product.sku) continue

        const matchingFile = findBestMatch(product.sku, allDriveFiles)
        if (matchingFile) {
          matchedProducts.push({ product, imageFile: matchingFile })
        }
      }
      
      // Update progress for chunk completion
      await sendProgressUpdate({
        currentStep: `Matched ${matchedProducts.length} products so far... Processing chunk ${Math.floor(i/chunkSize) + 1}/${Math.ceil(products.length/chunkSize)}`
      })
    }

    progress.total = matchedProducts.length
    await logMessage('info', `Found ${matchedProducts.length} products with matching images out of ${allDriveFiles.length} total images`)
    await sendProgressUpdate(progress)

    // Step 4: Process each matched product with enhanced error handling and rate limiting
    const batchSize = 2 // Further reduced for large datasets
    const maxConcurrentBatches = 1 // Process one batch at a time for stability
    
    await logMessage('info', `Starting migration of ${matchedProducts.length} matched products in batches of ${batchSize}`)
    
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