import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

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
  skuMatches: number
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const sessionId = crypto.randomUUID()
  console.log(`Starting scan session: ${sessionId}`)

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header')
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing environment variables')
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Helper to send progress updates
    const sendUpdate = async (update: Partial<ScanProgress>) => {
      try {
        const channel = supabase.channel(`storage-scan-${sessionId}`)
        await channel.send({
          type: 'broadcast',
          event: 'scan_progress',
          payload: { ...update, sessionId }
        })
      } catch (e) {
        console.error('Failed to send update:', e)
      }
    }

    // Helper to send log messages
    const sendLog = async (level: string, message: string) => {
      console.log(`[${level}] ${message}`)
      try {
        const channel = supabase.channel(`storage-scan-${sessionId}`)
        await channel.send({
          type: 'broadcast',
          event: 'scan_log',
          payload: { sessionId, level, message, timestamp: new Date().toISOString() }
        })
      } catch (e) {
        console.error('Failed to send log:', e)
      }
    }

    // Start background processing
    const processInBackground = async () => {
      const progress: ScanProgress = {
        sessionId,
        status: 'initializing',
        currentStep: 'Starting scan',
        processed: 0,
        successful: 0,
        failed: 0,
        total: 0,
        errors: [],
        startTime: new Date().toISOString(),
        foundImages: 0,
        matchedProducts: 0,
        skuMatches: 0
      }

      try {
        await sendLog('info', '🚀 Starting storage scan')
        await sendUpdate(progress)

        // Step 1: Get products
        progress.status = 'scanning'
        progress.currentStep = 'Fetching products'
        await sendUpdate(progress)
        await sendLog('info', '📦 Fetching products from database')

        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('id, sku, name')
          .not('sku', 'is', null)
          .limit(5000) // Limit for testing

        if (productsError) {
          throw new Error(`Failed to fetch products: ${productsError.message}`)
        }

        const validProducts = products?.filter(p => p.sku && p.sku.trim() !== '') || []
        await sendLog('info', `✅ Found ${validProducts.length} products with SKUs`)

        // Step 2: Scan storage
        progress.currentStep = 'Scanning storage bucket'
        await sendUpdate(progress)
        await sendLog('info', '🔍 Scanning storage bucket for images')

        const imageFiles: any[] = []
        const scanDir = async (path: string = '') => {
          const { data: files, error } = await supabase.storage
            .from('product-images')
            .list(path, { limit: 1000 })

          if (error) {
            await sendLog('error', `Failed to list files in ${path}: ${error.message}`)
            return
          }

          if (!files || files.length === 0) return

          for (const file of files) {
            const fullPath = path ? `${path}/${file.name}` : file.name
            
            // Check if it's a directory
            if (!file.id && !file.metadata) {
              await sendLog('info', `📁 Scanning subdirectory: ${fullPath}`)
              await scanDir(fullPath)
            } else if (file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
              imageFiles.push({ ...file, path: fullPath })
            }
          }
        }

        await scanDir()
        progress.foundImages = imageFiles.length
        await sendLog('info', `📸 Found ${imageFiles.length} images`)

        // Step 3: Build SKU to image mapping
        progress.status = 'processing'
        progress.currentStep = 'Building SKU mappings'
        await sendUpdate(progress)
        await sendLog('info', '🧠 Building SKU to image mappings')

        const skuToImage = new Map<string, any>()
        
        for (const image of imageFiles) {
          const filename = image.name.toLowerCase()
          const nameWithoutExt = filename.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '')
          
          // Extract potential SKUs from filename
          const parts = nameWithoutExt.split(/[\.\-_\s,]+/)
          for (const part of parts) {
            if (part.length >= 3) {
              skuToImage.set(part, image)
              skuToImage.set(part.toUpperCase(), image)
              
              // Handle zero-padding
              if (/^\d{3}$/.test(part)) {
                skuToImage.set('0' + part, image)
              }
              if (/^0\d{3}$/.test(part)) {
                skuToImage.set(part.substring(1), image)
              }
            }
          }
        }

        await sendLog('info', `✅ Created ${skuToImage.size} SKU mappings`)

        // Step 4: Match products to images
        progress.total = validProducts.length
        progress.currentStep = 'Matching products to images'
        await sendUpdate(progress)
        await sendLog('info', '🔗 Matching products to images')

        const matches = []
        const batchSize = 50

        for (let i = 0; i < validProducts.length; i += batchSize) {
          const batch = validProducts.slice(i, Math.min(i + batchSize, validProducts.length))
          
          for (const product of batch) {
            progress.currentFile = product.sku
            progress.processed++
            
            // Try to find image for this SKU
            const image = skuToImage.get(product.sku) || 
                         skuToImage.get(product.sku.toLowerCase()) ||
                         skuToImage.get(product.sku.toUpperCase())
            
            if (image) {
              matches.push({ product, image })
              progress.matchedProducts++
              progress.skuMatches++
              
              if (progress.matchedProducts % 10 === 0) {
                await sendLog('info', `✅ Matched ${progress.matchedProducts} products so far`)
              }
            }
            
            // Update progress every 10 items
            if (progress.processed % 10 === 0) {
              await sendUpdate(progress)
            }
          }
          
          // Small delay between batches
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        await sendLog('info', `📊 Matched ${matches.length} of ${validProducts.length} products`)

        // Step 5: Update database
        progress.currentStep = 'Updating database'
        progress.total = matches.length
        progress.processed = 0
        await sendUpdate(progress)
        await sendLog('info', '💾 Updating database with matches')

        for (const { product, image } of matches) {
          try {
            progress.currentFile = `Updating ${product.sku}`
            
            // Get public URL
            const { data: urlData } = supabase.storage
              .from('product-images')
              .getPublicUrl(image.path)

            if (urlData?.publicUrl) {
              // Check if image already exists
              const { data: existing } = await supabase
                .from('product_images')
                .select('id')
                .eq('product_id', product.id)
                .eq('image_url', urlData.publicUrl)
                .single()

              if (!existing) {
                // Insert new image
                const { error: insertError } = await supabase
                  .from('product_images')
                  .insert({
                    product_id: product.id,
                    image_url: urlData.publicUrl,
                    alt_text: `${product.name} image`,
                    is_primary: true,
                    sort_order: 0
                  })

                if (insertError) {
                  progress.failed++
                  await sendLog('warn', `Failed to insert image for ${product.sku}`)
                } else {
                  progress.successful++
                }
              } else {
                progress.successful++
              }
            }
            
            progress.processed++
            if (progress.processed % 10 === 0) {
              await sendUpdate(progress)
              await sendLog('info', `📝 Updated ${progress.successful} database records`)
            }
          } catch (e) {
            progress.failed++
            console.error(`Error updating ${product.sku}:`, e)
          }
        }

        // Complete
        progress.status = 'completed'
        progress.currentStep = 'Scan completed'
        await sendUpdate(progress)
        await sendLog('info', `🎉 Scan completed! Matched ${progress.matchedProducts} products, updated ${progress.successful} records`)

      } catch (error) {
        console.error('Scan error:', error)
        progress.status = 'error'
        progress.currentStep = `Error: ${error.message}`
        progress.errors.push(error.message)
        await sendUpdate(progress)
        await sendLog('error', `❌ Scan failed: ${error.message}`)
      }
    }

    // Start background processing
    processInBackground().catch(console.error)

    // Return immediate response
    return new Response(
      JSON.stringify({ 
        success: true, 
        sessionId,
        message: 'Scan started successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Fatal error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error',
        sessionId 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})