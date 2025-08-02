import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface StorageImage {
  filename: string
  sku: string
  storagePath: string
  metadata: any
}

interface Product {
  id: string
  sku: string
  name: string
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

// Enhanced SKU extraction with multiple pattern matching
function extractSKUFromFilename(filename: string): string | null {
  if (!filename || typeof filename !== 'string') return null
  
  // Remove file extension and path
  const nameWithoutExt = filename.replace(/.*\//, '').replace(/\.[^/.]+$/, '')
  
  console.log(`🔍 Extracting SKU from: ${filename} -> ${nameWithoutExt}`)
  
  // Enhanced SKU patterns - try multiple extraction methods
  const patterns = [
    // Direct SKU: "455404" or "455404-1" or "455404_image"
    /^(\d{4,8})(?:[_-].*)?$/,
    // SKU in complex names: "455100.455101.455102.455103" -> take first
    /^(\d{4,8})(?:\.\d+)*/,
    // SKU with text: "SKU455404" or "PROD-455404"
    /(?:SKU|PROD)[_-]?(\d{4,8})/i,
    // Generic number patterns (4-8 digits)
    /(\d{4,8})/,
  ]
  
  for (const pattern of patterns) {
    const match = nameWithoutExt.match(pattern)
    if (match && match[1]) {
      console.log(`✅ Extracted SKU "${match[1]}" from "${filename}" using pattern: ${pattern}`)
      return match[1]
    }
  }
  
  console.log(`❌ Could not extract SKU from filename: ${filename}`)
  return null
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
        console.log(`[PROGRESS] ${progress.currentStep || 'Update'} - ${JSON.stringify({
          status: progress.status,
          processed: progress.processed,
          successful: progress.successful,
          failed: progress.failed,
          total: progress.total
        })}`)
      }
    } catch (error) {
      console.error('Failed to send progress update:', error)
    }
  }

  const logMessage = async (level: 'info' | 'warn' | 'error', message: string, data?: any) => {
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`
    
    if (data) {
      console.log(logEntry, JSON.stringify(data, null, 2))
    } else {
      console.log(logEntry)
    }
    
    await sendProgressUpdate({
      currentStep: message,
      errors: level === 'error' ? [message] : undefined
    })
  }

  try {
    console.log('🚀 Starting migration function...')
    
    supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    console.log('✅ Supabase client initialized')

    const startTime = new Date().toISOString()
    console.log('📋 Initializing migration process...')
    await logMessage('info', '🚀 Starting enhanced image migration from Storage to Supabase')

    // Initialize progress with detailed logging
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

    console.log('📤 Sending initial progress update...')
    await sendProgressUpdate(progress)
    console.log('✅ Initial progress sent')

    // Step 1: Get all products with their SKUs
    console.log('📊 Starting product fetch...')
    progress.status = 'scanning'
    progress.currentStep = 'Fetching products from database'
    await sendProgressUpdate(progress)

    console.log('🔍 Querying products table...')
    const { data: products, error: productsError } = await supabaseClient
      .from('products')
      .select('id, sku, name')
      .not('sku', 'is', null)

    if (productsError) {
      console.error('❌ Products fetch failed:', productsError)
      await logMessage('error', `Failed to fetch products: ${productsError.message}`)
      throw new Error(`Failed to fetch products: ${productsError.message}`)
    }

    console.log(`✅ Found ${products?.length || 0} products with SKUs`)
    await logMessage('info', `Found ${products?.length || 0} products with SKUs`)

    // Step 2: Recursively scan MULTI_MATCH_ORGANIZED folder
    console.log('🔍 Starting Storage scan...')
    progress.currentStep = 'Scanning MULTI_MATCH_ORGANIZED folder recursively'
    await sendProgressUpdate(progress)

    const imageFiles: StorageImage[] = []
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    
    // Function to recursively scan folders
    async function scanFolder(folderPath: string = 'MULTI_MATCH_ORGANIZED') {
      const { data: storageFiles, error: storageError } = await supabaseClient.storage
        .from('product-images')
        .list(folderPath, {
          limit: 1000,
          sortBy: { column: 'name', order: 'asc' }
        })

      if (storageError) {
        console.error(`❌ Error accessing storage folder ${folderPath}:`, storageError)
        throw new Error(`Storage access failed: ${storageError.message}`)
      }

      if (!storageFiles) return

      for (const file of storageFiles) {
        const fullPath = folderPath === 'MULTI_MATCH_ORGANIZED' ? file.name : `${folderPath}/${file.name}`
        
        // If it's a directory, scan it recursively
        if (!file.metadata && file.name && !file.name.includes('.')) {
          await scanFolder(`${folderPath}/${file.name}`)
          continue
        }
        
        // Check if it's an image file
        const isImage = file.metadata?.mimetype?.startsWith('image/') || 
                       file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/)
        
        if (isImage) {
          const sku = extractSKUFromFilename(file.name)
          if (sku) {
            const storagePath = fullPath.startsWith('MULTI_MATCH_ORGANIZED/') 
              ? fullPath 
              : `MULTI_MATCH_ORGANIZED/${fullPath.replace('MULTI_MATCH_ORGANIZED/', '')}`
            
            imageFiles.push({
              filename: file.name,
              sku,
              storagePath,
              metadata: file.metadata || {}
            })
            console.log(`📎 Found image: ${file.name} -> SKU: ${sku}`)
          } else {
            console.log(`⚠️ Skipping image without extractable SKU: ${file.name}`)
          }
        }
      }
    }
    
    await scanFolder()
    
    console.log(`📊 Found ${imageFiles.length} processable images with SKUs`)
    await logMessage('info', `Found ${imageFiles.length} images in storage MULTI_MATCH_ORGANIZED folder`)

    // Step 3: Build intelligent image cache for faster lookups
    console.log("[PROGRESS] Building intelligent image mapping cache", JSON.stringify({
      status: 'processing',
      processed: 0,
      successful: 0,
      failed: 0,
      total: imageFiles.length
    }))
    
    console.log(`🗄️ Building image cache from ${imageFiles.length} images`)
    const imageCache = new Map<string, StorageImage>()
    
    for (const image of imageFiles) {
      // Store by SKU for O(1) lookup, handle multiple images per SKU
      const existingImage = imageCache.get(image.sku)
      if (!existingImage) {
        imageCache.set(image.sku, image)
      } else {
        console.log(`🔄 Multiple images found for SKU ${image.sku}, keeping first: ${existingImage.filename}`)
      }
    }
    
    console.log(`✅ Image cache built: ${imageCache.size} unique SKU mappings from ${imageFiles.length} images`)
    await logMessage('info', `Image cache built: ${imageCache.size} unique mappings from ${imageFiles.length} images`)

    // Step 4: Match products to images efficiently
    progress.total = products?.length || 1000
    progress.currentStep = 'Matching products to images using intelligent cache'
    await sendProgressUpdate(progress)

    const matchedProducts: Array<{product: Product, imageFile: StorageImage}> = []
    
    if (!products || products.length === 0) {
      await logMessage('warn', 'No products found to process')
      progress.total = 0
      await sendProgressUpdate(progress)
    } else {
      for (const product of products) {
        try {
          if (!product || !product.sku) continue

          const matchedImage = imageCache.get(product.sku)
          if (matchedImage) {
            matchedProducts.push({ product, imageFile: matchedImage })
            console.log(`✅ Matched product ${product.sku} to image ${matchedImage.filename}`)
          }
        } catch (error) {
          await logMessage('error', `Error matching product ${product?.sku || 'unknown'}: ${error.message}`)
        }
      }
    }

    progress.total = matchedProducts.length
    await logMessage('info', `Intelligent matching complete: ${matchedProducts.length} products matched from ${imageFiles.length} images`)
    await sendProgressUpdate(progress)

    // Step 5: Process matched products with enhanced error handling
    const batchSize = 5
    
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
      
      // Process batch sequentially for better stability
      for (const { product, imageFile } of batch) {
        try {
          progress.currentFile = `${product.sku} (${imageFile.filename})`
          await sendProgressUpdate(progress)
          await logMessage('info', `Processing ${product.sku}: ${imageFile.filename}`)

          // Check if product already has an image
          const { data: existingImages } = await supabaseClient
            .from('product_images')
            .select('id')
            .eq('product_id', product.id)
            .limit(1)

          if (existingImages && existingImages.length > 0) {
            await logMessage('info', `⏭️ Skipping ${product.sku} - already has image`)
            progress.processed++
            progress.successful++
            await sendProgressUpdate(progress)
            continue
          }

          // Create product_images record with direct storage URL
          const imageUrl = `${supabaseUrl}/storage/v1/object/public/product-images/${imageFile.storagePath}`
          
          console.log(`🔗 Linking product ${product.name} (${product.sku}) to image: ${imageUrl}`)
          
          const { error: insertError } = await supabaseClient
            .from('product_images')
            .insert({
              product_id: product.id,
              image_url: imageUrl,
              alt_text: `${product.name} product image`,
              sort_order: 0,
              is_primary: true
            })

          if (insertError) {
            console.error(`❌ Failed to insert image for ${product.sku}:`, insertError)
            await logMessage('error', `Failed to insert image for ${product.sku}: ${insertError.message}`)
            progress.failed++
            progress.errors.push(`${product.sku}: ${insertError.message}`)
          } else {
            console.log(`✅ Successfully linked ${product.sku} to ${imageFile.filename}`)
            progress.successful++
          }

          progress.processed++
          await sendProgressUpdate(progress)

        } catch (error) {
          console.error(`❌ Error processing ${product.sku}:`, error)
          await logMessage('error', `Error processing ${product.sku}: ${error.message}`)
          progress.failed++
          progress.errors.push(`${product.sku}: ${error.message}`)
          progress.processed++
          await sendProgressUpdate(progress)
        }
      }

      // Small delay between batches to avoid overwhelming the database
      if (i + batchSize < matchedProducts.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    // Final status update
    progress.status = 'completed'
    progress.currentStep = `Migration completed: ${progress.successful} successful, ${progress.failed} failed`
    await sendProgressUpdate(progress)

    const endTime = new Date().toISOString()
    const duration = new Date(endTime).getTime() - new Date(startTime).getTime()
    
    await logMessage('info', `🎉 Migration completed in ${Math.round(duration / 1000)}s`)
    
    return new Response(JSON.stringify({
      success: true,
      message: `Migration completed successfully`,
      sessionId,
      results: {
        processed: progress.processed,
        successful: progress.successful,
        failed: progress.failed,
        errors: progress.errors.slice(0, 10) // Limit error list
      },
      performance: {
        duration: Math.round(duration / 1000),
        itemsPerSecond: Math.round(progress.processed / (duration / 1000))
      }
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 200 
    })

  } catch (error) {
    console.error('❌ Migration failed:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      sessionId,
      results: { processed: 0, successful: 0, failed: 0, errors: [error.message] }
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 500 
    })
  }
})