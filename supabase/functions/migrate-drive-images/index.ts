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
    const folderId = '1tG66zQTXGR-BQwjYZheRHVQ7s4n6-Jan'

    if (!googleApiKey) {
      throw new Error('Google Drive API key not configured')
    }

    const startTime = new Date().toISOString()
    await logMessage('info', 'Starting image migration from Google Drive to Supabase')

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

    // Step 3: Match products to images
    progress.status = 'processing'
    progress.total = products.length
    progress.currentStep = 'Matching products to images'
    await sendProgressUpdate(progress)

    const matchedProducts = []
    for (const product of products) {
      if (!product.sku) continue

      const matchingFiles = driveFiles.filter(file => {
        const fileName = file.name.toLowerCase()
        const sku = product.sku.toLowerCase()
        return (fileName === `${sku}.png` || fileName === `${sku}.jpg` || fileName === `${sku}.jpeg`) &&
               (file.mimeType === 'image/png' || file.mimeType === 'image/jpeg')
      })

      if (matchingFiles.length > 0) {
        matchedProducts.push({ product, imageFile: matchingFiles[0] })
      }
    }

    progress.total = matchedProducts.length
    await logMessage('info', `Found ${matchedProducts.length} products with matching images`)
    await sendProgressUpdate(progress)

    // Step 4: Process each matched product
    const batchSize = 5 // Process in batches to avoid overwhelming the system
    for (let i = 0; i < matchedProducts.length; i += batchSize) {
      const batch = matchedProducts.slice(i, Math.min(i + batchSize, matchedProducts.length))
      
      // Process batch in parallel
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
                alt_text: `${product.name} product image`,
                updated_at: new Date().toISOString()
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
      await Promise.all(batchPromises)
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < matchedProducts.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
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