import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// Define CORS headers inline
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
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
  skuMatches: number
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const sessionId = crypto.randomUUID()
  console.log(`[${new Date().toISOString()}] Starting scan session: ${sessionId}`)

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header provided')
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log(`[${sessionId}] Supabase client created successfully`)

    // Helper to send progress updates
    const sendUpdate = async (update: Partial<ScanProgress>) => {
      try {
        const channel = supabase.channel(`storage-scan-${sessionId}`)
        const result = await channel.send({
          type: 'broadcast',
          event: 'scan_progress',
          payload: { ...update, sessionId }
        })
        console.log(`[${sessionId}] Progress update sent:`, update.currentStep)
      } catch (e) {
        console.error(`[${sessionId}] Failed to send update:`, e)
      }
    }

    // Helper to send log messages
    const sendLog = async (level: string, message: string) => {
      const timestamp = new Date().toISOString()
      console.log(`[${sessionId}] [${timestamp}] [${level.toUpperCase()}] ${message}`)
      try {
        const channel = supabase.channel(`storage-scan-${sessionId}`)
        await channel.send({
          type: 'broadcast',
          event: 'scan_log',
          payload: { 
            sessionId, 
            level, 
            message, 
            timestamp 
          }
        })
      } catch (e) {
        console.error(`[${sessionId}] Failed to send log:`, e)
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
        await sendLog('info', '🚀 Starting storage scan process')
        await sendUpdate(progress)

        // Step 1: Get products with SKUs
        progress.status = 'scanning'
        progress.currentStep = 'Fetching products from database'
        await sendUpdate(progress)
        await sendLog('info', '📦 Fetching products with SKUs from database')

        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('id, sku, name')
          .not('sku', 'is', null)
          .neq('sku', '')
          .limit(2000) // Start with reasonable limit

        if (productsError) {
          throw new Error(`Database error: ${productsError.message}`)
        }

        if (!products || products.length === 0) {
          throw new Error('No products with SKUs found in database')
        }

        await sendLog('info', `✅ Found ${products.length} products with SKUs`)

        // Step 2: Scan storage for images
        progress.currentStep = 'Scanning storage bucket for images'
        await sendUpdate(progress)
        await sendLog('info', '🔍 Scanning product-images bucket')

        const imageFiles: any[] = []
        
        // Recursive function to scan directories
        const scanDirectory = async (path: string = ''): Promise<void> => {
          try {
            const { data: files, error } = await supabase.storage
              .from('product-images')
              .list(path, { 
                limit: 1000,
                offset: 0,
                sortBy: { column: 'name', order: 'asc' }
              })

            if (error) {
              await sendLog('error', `Failed to list files in "${path}": ${error.message}`)
              return
            }

            if (!files || files.length === 0) {
              if (path === '') {
                await sendLog('warn', 'No files found in product-images bucket')
              }
              return
            }

            await sendLog('info', `📂 Found ${files.length} items in "${path || 'root'}"`)

            for (const file of files) {
              if (!file.name) continue
              
              const fullPath = path ? `${path}/${file.name}` : file.name
              
              // Check if it's a directory (no id and no metadata usually means directory)
              const isDirectory = !file.id && !file.metadata && !file.name.includes('.')
              
              if (isDirectory) {
                await sendLog('info', `📁 Scanning subdirectory: ${fullPath}`)
                await scanDirectory(fullPath)
              } else if (file.name.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)) {
                imageFiles.push({ 
                  name: file.name,
                  path: fullPath,
                  id: file.id,
                  metadata: file.metadata
                })
                
                // Log progress every 50 images
                if (imageFiles.length % 50 === 0) {
                  await sendLog('info', `📸 Found ${imageFiles.length} images so far...`)
                }
              }
            }
          } catch (error) {
            await sendLog('error', `Error scanning directory "${path}": ${error.message}`)
          }
        }

        // Start scanning from root
        await scanDirectory('')
        
        progress.foundImages = imageFiles.length
        await sendLog('info', `✅ Total images found: ${imageFiles.length}`)
        await sendUpdate(progress)

        if (imageFiles.length === 0) {
          throw new Error('No images found in storage bucket')
        }

        // Step 3: Build SKU to image mapping
        progress.status = 'processing'
        progress.currentStep = 'Building SKU to image mappings'
        await sendUpdate(progress)
        await sendLog('info', '🧠 Building SKU to image mappings')

        const skuToImage = new Map<string, any>()
        
        for (const image of imageFiles) {
          const filename = image.name.toLowerCase()
          const nameWithoutExt = filename.replace(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i, '')
          
          // Direct filename match (highest priority)
          skuToImage.set(nameWithoutExt, image)
          skuToImage.set(nameWithoutExt.toUpperCase(), image)
          
          // Split by common delimiters and add each part
          const parts = nameWithoutExt.split(/[\.\-_\s,\/]+/)
          for (const part of parts) {
            if (part && part.length >= 3 && part.length <= 20) {
              // Add in various cases
              skuToImage.set(part, image)
              skuToImage.set(part.toUpperCase(), image)
              skuToImage.set(part.toLowerCase(), image)
              
              // Handle zero-padding for numeric SKUs
              if (/^\d{3,4}$/.test(part)) {
                if (part.length === 3) {
                  skuToImage.set('0' + part, image)
                }
                if (part.startsWith('0') && part.length === 4) {
                  skuToImage.set(part.substring(1), image)
                }
              }
            }
          }
        }

        await sendLog('info', `✅ Created ${skuToImage.size} SKU mappings from ${imageFiles.length} images`)

        // Step 4: Match products to images
        progress.total = products.length
        progress.currentStep = 'Matching products to images'
        await sendUpdate(progress)
        await sendLog('info', '🔗 Starting product to image matching')

        const matches = []
        const notFound = []

        for (let i = 0; i < products.length; i++) {
          const product = products[i]
          progress.currentFile = `${product.sku} (${i + 1}/${products.length})`
          progress.processed++
          
          // Try multiple variations of the SKU
          const skuVariations = [
            product.sku,
            product.sku.toLowerCase(),
            product.sku.toUpperCase(),
            product.sku.trim(),
          ]
          
          let foundImage = null
          for (const sku of skuVariations) {
            if (skuToImage.has(sku)) {
              foundImage = skuToImage.get(sku)
              break
            }
          }
          
          if (foundImage) {
            matches.push({ product, image: foundImage })
            progress.matchedProducts++
            progress.skuMatches++
            
            // Log every 25 matches
            if (progress.matchedProducts % 25 === 0 || progress.matchedProducts === 1) {
              await sendLog('info', `✅ Matched ${progress.matchedProducts} products (latest: ${product.sku})`)
            }
          } else {
            notFound.push(product.sku)
            if (notFound.length <= 10) {
              await sendLog('warn', `❌ No image found for SKU: ${product.sku}`)
            }
          }
          
          // Update progress every 20 items
          if (i % 20 === 0 || i === products.length - 1) {
            await sendUpdate(progress)
          }
        }

        const matchRate = Math.round((matches.length / products.length) * 100)
        await sendLog('info', `📊 Matching complete: ${matches.length}/${products.length} products matched (${matchRate}% success rate)`)

        // Step 5: Update database with matches
        if (matches.length > 0) {
          progress.currentStep = 'Updating database with image URLs'
          progress.total = matches.length
          progress.processed = 0
          await sendUpdate(progress)
          await sendLog('info', `💾 Updating database with ${matches.length} image records`)

          for (let i = 0; i < matches.length; i++) {
            const { product, image } = matches[i]
            
            try {
              progress.currentFile = `Updating ${product.sku}`
              progress.processed++
              
              // Get public URL for the image
              const { data: urlData } = supabase.storage
                .from('product-images')
                .getPublicUrl(image.path)

              if (!urlData?.publicUrl) {
                progress.failed++
                continue
              }

              // Check if this image already exists for this product
              const { data: existing } = await supabase
                .from('product_images')
                .select('id')
                .eq('product_id', product.id)
                .eq('image_url', urlData.publicUrl)
                .maybeSingle()

              if (!existing) {
                // Check if product has any primary image
                const { data: hasPrimary } = await supabase
                  .from('product_images')
                  .select('id')
                  .eq('product_id', product.id)
                  .eq('is_primary', true)
                  .maybeSingle()

                // Insert new image record
                const { error: insertError } = await supabase
                  .from('product_images')
                  .insert({
                    product_id: product.id,
                    image_url: urlData.publicUrl,
                    alt_text: `${product.name} product image`,
                    is_primary: !hasPrimary, // Set as primary if no primary exists
                    sort_order: 0
                  })

                if (insertError) {
                  progress.failed++
                  await sendLog('warn', `Failed to insert image for ${product.sku}: ${insertError.message}`)
                } else {
                  progress.successful++
                }
              } else {
                // Image already exists, count as successful
                progress.successful++
              }
              
              // Update progress every 10 items
              if (i % 10 === 0 || i === matches.length - 1) {
                await sendUpdate(progress)
                if (i % 25 === 0 && i > 0) {
                  await sendLog('info', `📝 Updated ${progress.successful} database records`)
                }
              }
            } catch (error) {
              progress.failed++
              console.error(`Error updating ${product.sku}:`, error)
            }
          }
        }

        // Complete
        progress.status = 'completed'
        progress.currentStep = 'Scan completed successfully'
        await sendUpdate(progress)
        
        await sendLog('info', '🎉 Storage scan completed successfully!')
        await sendLog('info', `📈 Final results:`)
        await sendLog('info', `   • Products scanned: ${products.length}`)
        await sendLog('info', `   • Images found: ${imageFiles.length}`)
        await sendLog('info', `   • Products matched: ${progress.matchedProducts}`)
        await sendLog('info', `   • Database records updated: ${progress.successful}`)
        await sendLog('info', `   • Failed updates: ${progress.failed}`)

      } catch (error) {
        console.error(`[${sessionId}] Scan error:`, error)
        progress.status = 'error'
        progress.currentStep = `Error: ${error.message}`
        progress.errors.push(error.message)
        await sendUpdate(progress)
        await sendLog('error', `❌ Scan failed: ${error.message}`)
      }
    }

    // Start background processing without waiting
    processInBackground().catch(err => {
      console.error(`[${sessionId}] Background process error:`, err)
    })

    // Return immediate success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        sessionId,
        message: 'Storage scan started successfully. Monitor progress in the UI.'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error(`[${sessionId}] Fatal error:`, error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error occurred',
        sessionId 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})