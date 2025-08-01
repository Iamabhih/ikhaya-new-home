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

    // Step 2: Get all files from Google Drive
    progress.currentStep = 'Scanning Google Drive folder'
    await sendProgressUpdate(progress)

    const driveResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&key=${googleApiKey}&fields=files(id,name,mimeType)&pageSize=1000`
    )

    if (!driveResponse.ok) {
      throw new Error(`Google Drive API error: ${driveResponse.statusText}`)
    }

    const driveData = await driveResponse.json()
    const driveFiles: DriveFile[] = driveData.files || []

    await logMessage('info', `Found ${driveFiles.length} files in Google Drive folder`)

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

    // Step 3: Match products to images using enhanced matching
    progress.status = 'processing'
    progress.total = products.length
    progress.currentStep = 'Matching products to images'
    await sendProgressUpdate(progress)

    const matchedProducts = []
    for (const product of products) {
      if (!product.sku) continue

      const matchingFile = findBestMatch(product.sku, driveFiles)
      if (matchingFile) {
        matchedProducts.push({ product, imageFile: matchingFile })
      }
    }

    progress.total = matchedProducts.length
    await logMessage('info', `Found ${matchedProducts.length} products with matching images`)
    await sendProgressUpdate(progress)

    // Step 4: Process each matched product with enhanced error handling
    const batchSize = 3 // Reduced batch size for better error handling
    for (let i = 0; i < matchedProducts.length; i += batchSize) {
      const batch = matchedProducts.slice(i, Math.min(i + batchSize, matchedProducts.length))
      
      // Process batch in parallel with individual error handling
      const batchPromises = batch.map(async ({ product, imageFile }) => {
        try {
          progress.currentFile = `${product.sku} (${imageFile.name})`
          await sendProgressUpdate(progress)
          await logMessage('info', `Processing ${product.sku}: ${imageFile.name}`)

          // Download image with retry logic
          let imageResponse
          let retries = 3
          while (retries > 0) {
            try {
              imageResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files/${imageFile.id}?alt=media&key=${googleApiKey}`
              )
              if (imageResponse.ok) break
              throw new Error(`HTTP ${imageResponse.status}: ${imageResponse.statusText}`)
            } catch (error) {
              retries--
              if (retries === 0) throw error
              await logMessage('warn', `Retry downloading ${product.sku}, attempts remaining: ${retries}`)
              await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second before retry
            }
          }

          if (!imageResponse.ok) {
            throw new Error(`Failed to download image: ${imageResponse.statusText}`)
          }

          const imageBlob = await imageResponse.blob()
          const fileExtension = imageFile.name.toLowerCase().endsWith('.png') ? 'png' : 'jpg'
          const fileName = `${product.sku}.${fileExtension}`

          // Upload to Supabase Storage with retry logic
          let uploadResult
          retries = 3
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
              await new Promise(resolve => setTimeout(resolve, 1000))
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
          return { success: true, sku: product.sku }

        } catch (error) {
          progress.failed++
          const errorMsg = `❌ ${product.sku}: ${error.message}`
          progress.errors.push(errorMsg)
          await logMessage('error', errorMsg)
          return { success: false, sku: product.sku, error: error.message }
        } finally {
          progress.processed++
          
          // Calculate estimated time remaining
          if (progress.processed > 0) {
            const elapsed = Date.now() - new Date(startTime).getTime()
            const avgTimePerItem = elapsed / progress.processed
            const remaining = (progress.total - progress.processed) * avgTimePerItem
            progress.estimatedTimeRemaining = `${Math.round(remaining / 1000)}s`
          }
          
          await sendProgressUpdate(progress)
        }
      })

      // Wait for batch to complete
      const batchResults = await Promise.allSettled(batchPromises)
      
      // Log batch results
      const batchSuccessful = batchResults.filter(r => r.status === 'fulfilled').length
      const batchFailed = batchResults.filter(r => r.status === 'rejected').length
      await logMessage('info', `Batch completed: ${batchSuccessful} successful, ${batchFailed} failed`)
      
      // Longer delay between batches to avoid rate limiting
      if (i + batchSize < matchedProducts.length) {
        await new Promise(resolve => setTimeout(resolve, 2000)) // Increased to 2 seconds
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