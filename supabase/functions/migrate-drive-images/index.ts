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
        // Send real-time update via broadcast
        const channel = supabaseClient.channel(`migration-${sessionId}`)
        await channel.send({
          type: 'broadcast',
          event: 'migration_progress',
          payload: { ...progress, sessionId, timestamp: new Date().toISOString() }
        })
        
        // Also log to console for debugging
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

    const googleApiKey = Deno.env.get('GOOGLE_DRIVE_API_KEY')
    const folderId = '1tG66zQTXGR-BQwjYZheRHVQ7s4n6-Jan' // Your Google Drive folder ID

    console.log('🔑 Checking Google Drive API key...')
    if (!googleApiKey) {
      console.error('❌ Google Drive API key not configured')
      await logMessage('error', 'Google Drive API key not configured')
      throw new Error('Google Drive API key not configured')
    }
    console.log('✅ Google Drive API key found')

    const startTime = new Date().toISOString()
    console.log('📋 Initializing migration process...')
    await logMessage('info', '🚀 Starting enhanced image migration from Google Drive to Supabase')

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

    // Step 2: Get all files from Google Drive with pagination support
    console.log('🔍 Starting Google Drive scan...')
    progress.currentStep = 'Scanning Google Drive folder (this may take a while for large folders)'
    await sendProgressUpdate(progress)

    let allDriveFiles: DriveFile[] = []
    
    // Check MULTI_MATCH_ORGANIZED folder in storage bucket first
    console.log('🗄️ Checking existing images in MULTI_MATCH_ORGANIZED folder...')
    const { data: storageFiles, error: storageError } = await supabaseClient
      .storage
      .from('product-images')
      .list('MULTI_MATCH_ORGANIZED', { recursive: true })

    if (storageError) {
      console.error('❌ Error accessing storage:', storageError)
      await logMessage('error', `Error accessing storage: ${storageError.message}`)
    } else {
      console.log(`✅ Found ${storageFiles?.length || 0} files in MULTI_MATCH_ORGANIZED folder`)
      
      // Convert storage files to DriveFile format
      const storageImages = storageFiles
        ?.filter(file => file.name && !file.name.endsWith('/') && 
                 (file.name.toLowerCase().includes('.png') || 
                  file.name.toLowerCase().includes('.jpg') || 
                  file.name.toLowerCase().includes('.jpeg')))
        .map(file => ({
          id: file.name, // Use file path as ID
          name: file.name.split('/').pop() || file.name, // Get just filename
          mimeType: file.name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg',
          storagePath: `MULTI_MATCH_ORGANIZED/${file.name}`
        })) || []
      
      allDriveFiles = storageImages as DriveFile[]
      console.log(`📊 Converted ${allDriveFiles.length} storage files for processing`)
      await logMessage('info', `Found ${allDriveFiles.length} images in storage MULTI_MATCH_ORGANIZED folder`)
    }

    // Cache all discovered images to database for manual linking
    console.log('🗄️ Caching discovered images...')
    progress.currentStep = 'Caching discovered images for manual linking...'
    progress.total = allDriveFiles.length
    await sendProgressUpdate(progress)

    // Helper function to extract SKU from filename
    const extractSKUFromFilename = (filename: string): string | null => {
      const codes = extractProductCodes(filename)
      return codes.length > 0 ? codes[0] : null
    }

    // Helper function to format storage URL
    const formatStorageURL = (storagePath: string): string => {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      return `${supabaseUrl}/storage/v1/object/public/product-images/${storagePath}`
    }

    // Cache images in batches to avoid overwhelming the database
    const cacheImagesBatchSize = 50
    let cachedCount = 0
    
    for (let i = 0; i < allDriveFiles.length; i += cacheImagesBatchSize) {
      const batch = allDriveFiles.slice(i, i + cacheImagesBatchSize)
      const cacheData = batch.map(image => ({
        sku: extractSKUFromFilename(image.name),
        filename: image.name,
        drive_id: image.id,
        direct_url: formatStorageURL((image as any).storagePath || image.name),
        file_size: null,
        mime_type: image.mimeType,
        scan_session_id: sessionId,
        metadata: {
          scan_timestamp: new Date().toISOString(),
          source: 'storage_migration'
        }
      }))

      try {
        const { error: cacheError } = await supabaseClient
          .from('cached_drive_images')
          .upsert(cacheData, { 
            onConflict: 'drive_id',
            ignoreDuplicates: false 
          })

        if (cacheError) {
          console.error('❌ Error caching images batch:', cacheError)
          await logMessage('error', `Error caching images batch: ${cacheError.message}`)
        } else {
          cachedCount += batch.length
          console.log(`✅ Cached batch of ${batch.length} images (${cachedCount}/${allDriveFiles.length})`)
          
          // Update progress for caching
          progress.processed = cachedCount
          await sendProgressUpdate(progress)
        }
      } catch (error) {
        console.error('❌ Error caching images batch:', error)
        await logMessage('error', `Error caching images batch: ${error.message}`)
      }

      // Small delay between batches to avoid overwhelming the database
      if (i + cacheImagesBatchSize < allDriveFiles.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    console.log(`🗄️ Cached ${cachedCount} images for manual linking`)
    await logMessage('info', `Cached ${cachedCount} images for manual linking in cached_drive_images table`)

    // Reset progress counters for the actual migration process
    progress.processed = 0
    progress.successful = 0
    progress.failed = 0

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

          // For storage files, create direct URL
          const imageUrl = formatStorageURL((imageFile as any).storagePath || imageFile.name)

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

          // Insert product image record directly using storage URL
          const { error: insertError } = await supabaseClient
            .from('product_images')
            .insert({
              product_id: product.id,
              image_url: imageUrl,
              alt_text: `${product.name} product image`,
              is_primary: true,
              sort_order: 0
            })

          if (insertError) {
            console.error(`❌ Failed to insert image record for ${product.sku}:`, insertError)
            await logMessage('error', `Failed to insert image record for ${product.sku}: ${insertError.message}`)
            progress.failed++
            progress.errors.push(`${product.sku}: ${insertError.message}`)
          } else {
            console.log(`✅ Successfully migrated ${product.sku}`)
            await logMessage('info', `✅ Successfully migrated ${product.sku}`)
            progress.successful++
          }

          progress.processed++
          await sendProgressUpdate(progress)
          
        } catch (error) {
          progress.failed++
          const errorMsg = `❌ ${product.sku}: ${error.message}`
          progress.errors.push(errorMsg)
          await logMessage('error', errorMsg)
          progress.processed++
          await sendProgressUpdate(progress)
        }
      }
      
      // Enhanced delay between batches to respect API limits
      if (i + batchSize < matchedProducts.length) {
        const delay = Math.min(2500, 1000 + (batchNumber * 100))
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