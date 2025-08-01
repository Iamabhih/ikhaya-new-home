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

    // Enhanced helper function to extract all possible SKU variants from filename
    function extractProductCodes(filename: string): string[] {
      const codes: string[] = []
      
      // Remove file extension and path
      const nameWithoutExt = filename.replace(/\.(jpg|jpeg|png|gif|webp|bmp|tiff|svg)$/i, '')
      const baseFilename = nameWithoutExt.split('/').pop() || nameWithoutExt
      
      // Pattern 1: Pure numeric codes (2-8 digits)
      const numericCodes = baseFilename.match(/\b\d{2,8}\b/g)
      if (numericCodes) {
        codes.push(...numericCodes)
      }
      
      // Pattern 2: Alphanumeric codes (2-12 characters)
      const alphanumericCodes = baseFilename.match(/\b[A-Z0-9]{2,12}\b/gi)
      if (alphanumericCodes) {
        codes.push(...alphanumericCodes.map(code => code.toLowerCase()))
      }
      
      // Pattern 3: Split by common delimiters and check each part
      const delimiters = /[-_\s\.#\(\)\[\]]+/
      const parts = baseFilename.split(delimiters)
      for (const part of parts) {
        const cleanPart = part.trim()
        if (cleanPart.length >= 2 && /^[A-Z0-9]+$/i.test(cleanPart)) {
          codes.push(cleanPart.toLowerCase())
        }
      }
      
      // Pattern 4: Extract from common SKU patterns
      // SKU-123, ITEM_456, PROD-ABC123, etc.
      const skuPatterns = baseFilename.match(/(?:sku|item|prod|code|ref)[-_\s]*([a-z0-9]+)/gi)
      if (skuPatterns) {
        skuPatterns.forEach(pattern => {
          const match = pattern.match(/([a-z0-9]+)$/i)
          if (match) {
            codes.push(match[1].toLowerCase())
          }
        })
      }
      
      // Pattern 5: Handle zero-padded variations
      const originalCodes = [...codes]
      for (const code of originalCodes) {
        if (/^\d{2,3}$/.test(code)) {
          // Add zero-padded versions for short numeric codes
          codes.push('0' + code)
          if (code.length === 2) {
            codes.push('00' + code)
          }
        }
        if (/^0+\d+$/.test(code)) {
          // Add version without leading zeros
          codes.push(code.replace(/^0+/, ''))
        }
      }
      
      // Pattern 6: Handle common variations
      for (const code of originalCodes) {
        // Add with/without common prefixes
        if (code.startsWith('0')) {
          codes.push(code.substring(1))
        } else {
          codes.push('0' + code)
        }
      }
      
      // Remove duplicates and sort by length (longer codes first for better matching)
      return [...new Set(codes)].sort((a, b) => b.length - a.length)
    }

    // Enhanced matching function with fuzzy matching capabilities
    function findBestMatch(productSku: string, storageImages: StorageFile[]): StorageFile[] {
      const normalizedSku = productSku.toLowerCase().trim()
      const matches: { file: StorageFile, score: number }[] = []
      
      for (const file of storageImages) {
        const fileName = file.name.toLowerCase()
        const extractedCodes = extractProductCodes(file.name)
        
        let score = 0
        
        // Exact filename match (highest score)
        if (fileName.includes(`${normalizedSku}.`) || 
            fileName.includes(`/${normalizedSku}.`) ||
            fileName.includes(`_${normalizedSku}.`) ||
            fileName.includes(`-${normalizedSku}.`)) {
          score = 100
        }
        
        // Exact code match in extracted codes
        else if (extractedCodes.includes(normalizedSku)) {
          score = 90
        }
        
        // Handle numeric SKU variations
        else if (/^\d+$/.test(normalizedSku)) {
          // For numeric SKUs, try different padding
          if (extractedCodes.includes('0' + normalizedSku)) {
            score = 85
          } else if (normalizedSku.startsWith('0') && extractedCodes.includes(normalizedSku.substring(1))) {
            score = 85
          } else if (extractedCodes.includes('00' + normalizedSku)) {
            score = 80
          }
        }
        
        // Partial matches
        if (score === 0) {
          for (const code of extractedCodes) {
            if (code.includes(normalizedSku) || normalizedSku.includes(code)) {
              if (Math.abs(code.length - normalizedSku.length) <= 1) {
                score = Math.max(score, 70)
              } else {
                score = Math.max(score, 50)
              }
            }
          }
        }
        
        // Filename contains SKU
        if (score === 0 && fileName.includes(normalizedSku)) {
          score = 40
        }
        
        if (score > 0) {
          matches.push({ file, score })
        }
      }
      
      // Sort by score (highest first) and return all matches above threshold
      return matches
        .filter(m => m.score >= 40)
        .sort((a, b) => b.score - a.score)
        .map(m => m.file)
    }

    // Step 3: Match products to images
    progress.status = 'processing'
    progress.total = products.length
    progress.currentStep = 'Matching products to storage images'
    await sendProgressUpdate(progress)

    const matches: Array<{ product: any, images: StorageFile[] }> = []
    
    for (const product of products) {
      if (!product.sku) {
        progress.processed++
        continue
      }

      progress.currentFile = `Analyzing SKU: ${product.sku}`
      await sendProgressUpdate(progress)

      const matchingImages = findBestMatch(product.sku, storageImages)
      if (matchingImages.length > 0) {
        matches.push({ product, images: matchingImages })
        progress.matchedProducts++
        await logMessage('info', `Found ${matchingImages.length} image(s) for SKU ${product.sku}`)
      }

      progress.processed++
      await sendProgressUpdate(progress)
    }

    // Step 4: Process matches and update database
    progress.currentStep = 'Updating product image records'
    progress.total = matches.length
    progress.processed = 0
    await sendProgressUpdate(progress)

    for (const { product, images } of matches) {
      try {
        progress.currentFile = `Updating ${product.sku}`
        await sendProgressUpdate(progress)

        // Get existing images for this product
        const { data: existingImages } = await supabaseClient
          .from('product_images')
          .select('*')
          .eq('product_id', product.id)

        const existingUrls = new Set(existingImages?.map(img => img.image_url) || [])

        // Process each matched image
        for (let i = 0; i < images.length; i++) {
          const image = images[i]
          
          // Get public URL for the storage file
          const { data: urlData } = supabaseClient.storage
            .from('product-images')
            .getPublicUrl(image.name)

          // Skip if this URL already exists for this product
          if (existingUrls.has(urlData.publicUrl)) {
            continue
          }

          // Determine if this should be the primary image
          const isPrimary = i === 0 && !existingImages?.some(img => img.is_primary)

          // Insert new image record
          const { error: insertError } = await supabaseClient
            .from('product_images')
            .insert({
              product_id: product.id,
              image_url: urlData.publicUrl,
              alt_text: `${product.name} product image`,
              is_primary: isPrimary,
              sort_order: existingImages?.length ? existingImages.length + i : i
            })

          if (insertError) {
            await logMessage('warn', `Failed to insert image record for ${product.sku}: ${insertError.message}`)
          }
        }

        progress.successful++
        await logMessage('info', `✅ Updated image records for ${product.sku} (${images.length} images)`)

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