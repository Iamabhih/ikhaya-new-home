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
        const channel = supabaseClient.channel(`storage-scan-${sessionId}`)
        await channel.send({
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
        const channel = supabaseClient.channel(`storage-scan-${sessionId}`)
        await channel.send({
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

    // Enhanced multi-SKU image cache with comprehensive mapping
    const createImageCache = () => {
      // Use Maps to handle multiple images per SKU
      const skuToImages = new Map<string, StorageFile[]>()
      const imageToSkus = new Map<string, string[]>()
      const stats = { 
        processed: 0, 
        matched: 0, 
        failed: 0, 
        multiSkuFiles: 0,
        uniqueSkus: 0,
        duplicateSkus: 0
      }
      
      return {
        buildMapping: (storageFiles: StorageFile[]) => {
          skuToImages.clear()
          imageToSkus.clear()
          stats.processed = storageFiles?.length || 0
          stats.matched = 0
          stats.failed = 0
          stats.multiSkuFiles = 0
          stats.uniqueSkus = 0
          stats.duplicateSkus = 0
          
          if (!storageFiles || storageFiles.length === 0) return
          
          for (const file of storageFiles) {
            try {
              if (!file?.name) continue
              
              const codes = extractProductCodes(file.name)
              if (codes.length === 0) {
                stats.failed++
                continue
              }
              
              // Track multi-SKU files
              if (codes.length > 1) {
                stats.multiSkuFiles++
              }
              
              // Store bidirectional mapping
              imageToSkus.set(file.name, codes)
              
              for (const code of codes) {
                if (!skuToImages.has(code)) {
                  skuToImages.set(code, [])
                  stats.uniqueSkus++
                } else {
                  stats.duplicateSkus++
                }
                skuToImages.get(code)!.push(file)
                stats.matched++
              }
            } catch (error) {
              stats.failed++
              continue
            }
          }
        },
        
        getImage: (sku: string) => {
          if (!sku) return { found: false, image: null, alternatives: [] }
          
          const normalizedSku = sku.toLowerCase().trim()
          
          // Direct match
          if (skuToImages.has(normalizedSku)) {
            const images = skuToImages.get(normalizedSku)!
            return { 
              found: true, 
              image: images[0], // Primary match
              alternatives: images.slice(1), // Additional matches
              allCodes: imageToSkus.get(images[0].name) || []
            }
          }
          
          // Try with zero padding for 3-digit SKUs
          if (/^\d{3}$/.test(normalizedSku)) {
            const paddedSku = '0' + normalizedSku
            if (skuToImages.has(paddedSku)) {
              const images = skuToImages.get(paddedSku)!
              return { 
                found: true, 
                image: images[0],
                alternatives: images.slice(1),
                allCodes: imageToSkus.get(images[0].name) || []
              }
            }
          }
          
          // Try without leading zero for 4-digit SKUs
          if (/^0\d{3}$/.test(normalizedSku)) {
            const unpaddedSku = normalizedSku.substring(1)
            if (skuToImages.has(unpaddedSku)) {
              const images = skuToImages.get(unpaddedSku)!
              return { 
                found: true, 
                image: images[0],
                alternatives: images.slice(1),
                allCodes: imageToSkus.get(images[0].name) || []
              }
            }
          }
          
          // Fuzzy matching for similar SKUs
          for (const [cachedSku, images] of skuToImages.entries()) {
            if (calculateSimilarity(normalizedSku, cachedSku) > 0.8) {
              return { 
                found: true, 
                image: images[0],
                alternatives: images.slice(1),
                allCodes: imageToSkus.get(images[0].name) || [],
                fuzzyMatch: true,
                matchedSku: cachedSku
              }
            }
          }
          
          return { found: false, image: null, alternatives: [] }
        },
        
        getStats: () => ({ ...stats, totalMappings: skuToImages.size }),
        
        getSkusForImage: (imageName: string) => imageToSkus.get(imageName) || [],
        
        getAllMappings: () => {
          const mappings: Array<{sku: string, images: StorageFile[], isMultiSku: boolean}> = []
          for (const [sku, images] of skuToImages.entries()) {
            mappings.push({
              sku,
              images,
              isMultiSku: images.some(img => (imageToSkus.get(img.name) || []).length > 1)
            })
          }
          return mappings.sort((a, b) => a.sku.localeCompare(b.sku))
        }
      }
    }
    
    // Helper function for fuzzy matching
    function calculateSimilarity(str1: string, str2: string): number {
      const longer = str1.length > str2.length ? str1 : str2
      const shorter = str1.length > str2.length ? str2 : str1
      
      if (longer.length === 0) return 1.0
      
      const editDistance = levenshteinDistance(longer, shorter)
      return (longer.length - editDistance) / longer.length
    }
    
    function levenshteinDistance(str1: string, str2: string): number {
      const matrix = Array(str2.length + 1).fill(null).map(() => 
        Array(str1.length + 1).fill(null))
      
      for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
      for (let j = 0; j <= str2.length; j++) matrix[j][0] = j
      
      for (let j = 1; j <= str2.length; j++) {
        for (let i = 1; i <= str1.length; i++) {
          const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
          matrix[j][i] = Math.min(
            matrix[j][i - 1] + 1,
            matrix[j - 1][i] + 1,
            matrix[j - 1][i - 1] + indicator
          )
        }
      }
      
      return matrix[str2.length][str1.length]
    }

    // Enhanced multi-SKU extraction function inspired by PowerShell script
    function extractProductCodes(filename: string): string[] {
      if (!filename || typeof filename !== 'string') return []
      
      try {
        const codes = new Set<string>()
        const nameWithoutExt = filename.replace(/\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i, '')
        const cleanName = nameWithoutExt.toLowerCase()
        
        // Multi-SKU pattern: Handle files like "319027.319026.PNG" or "123.456.789.jpg"
        const multiSkuPattern = /\b\d{3,6}(?:\.\d{3,6})+\b/g
        const multiSkuMatches = cleanName.match(multiSkuPattern)
        if (multiSkuMatches) {
          multiSkuMatches.forEach(match => {
            // Split by dots and extract individual SKUs
            const skus = match.split('.').filter(sku => sku.length >= 3)
            skus.forEach(sku => {
              codes.add(sku)
              // Auto-pad 3-digit codes
              if (sku.length === 3 && /^\d{3}$/.test(sku)) {
                codes.add('0' + sku)
              }
            })
          })
        }
        
        // Standard numeric codes (3-6 digits) - enhanced patterns
        const numericMatches = cleanName.match(/\b\d{3,6}\b/g)
        if (numericMatches) {
          numericMatches.forEach(match => {
            codes.add(match)
            // Auto-pad short codes
            if (match.length === 3) {
              codes.add('0' + match)
            }
            // Also try with leading zeros stripped
            if (match.length > 3 && match.startsWith('0')) {
              codes.add(match.substring(1))
            }
          })
        }
        
        // Enhanced alphanumeric codes (3-10 characters)
        const alphanumericMatches = cleanName.match(/\b[a-z0-9]{3,10}\b/g)
        if (alphanumericMatches) {
          alphanumericMatches.forEach(match => codes.add(match))
        }
        
        // Handle multiple delimiters: dots, dashes, underscores, spaces
        const delimiters = /[-_\s\.]+/
        const parts = cleanName.split(delimiters).filter(part => part && part.length > 0)
        for (const part of parts) {
          if (/^\d{3,6}$/.test(part)) {
            codes.add(part)
            if (part.length === 3) {
              codes.add('0' + part)
            }
          } else if (/^[a-z0-9]{3,10}$/.test(part)) {
            codes.add(part)
          }
        }
        
        // Enhanced prefix patterns - more comprehensive
        const prefixes = ['product', 'item', 'sku', 'code', 'img', 'pic', 'photo']
        for (const prefix of prefixes) {
          const regex = new RegExp(`${prefix}[-_\\s]*([a-z0-9]{3,10})`, 'gi')
          let match
          while ((match = regex.exec(cleanName)) !== null) {
            const code = match[1].toLowerCase()
            codes.add(code)
            if (/^\d{3}$/.test(code)) {
              codes.add('0' + code)
            }
          }
        }
        
        // Extract from path segments (handle subdirectories)
        const pathParts = filename.split('/').filter(part => part && !part.includes('.'))
        for (const pathPart of pathParts) {
          const pathCodes = extractProductCodes(pathPart)
          pathCodes.forEach(code => codes.add(code))
        }
        
        // Handle bracket patterns: [SKU123] or (456)
        const bracketMatches = cleanName.match(/[\[\(]([a-z0-9]{3,10})[\]\)]/g)
        if (bracketMatches) {
          bracketMatches.forEach(match => {
            const code = match.replace(/[\[\(\]\)]/g, '').toLowerCase()
            codes.add(code)
            if (/^\d{3}$/.test(code)) {
              codes.add('0' + code)
            }
          })
        }
        
        return Array.from(codes).filter(code => code.length >= 3)
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

    // Step 4: Match products to images with enhanced reporting
    progress.total = products.length
    progress.currentStep = 'Matching products to images using enhanced multi-SKU cache'
    await sendProgressUpdate(progress)

    const matches: Array<{ 
      product: any, 
      image: StorageFile, 
      matchType: string,
      allCodes?: string[],
      alternatives?: StorageFile[]
    }> = []
    const missingSkus: Array<{sku: string, productName: string}> = []
    let fuzzyMatches = 0
    let multiSkuMatches = 0
    
    for (const product of products) {
      if (!product.sku) {
        progress.processed++
        continue
      }

      progress.currentFile = `Analyzing SKU: ${product.sku}`
      await sendProgressUpdate(progress)

      const result = imageCache.getImage(product.sku)
      if (result.found && result.image) {
        const matchType = result.fuzzyMatch ? 'fuzzy' : 'exact'
        if (result.fuzzyMatch) fuzzyMatches++
        if ((result.allCodes || []).length > 1) multiSkuMatches++
        
        matches.push({ 
          product, 
          image: result.image,
          matchType,
          allCodes: result.allCodes,
          alternatives: result.alternatives
        })
        progress.matchedProducts++
        
        const matchInfo = result.fuzzyMatch 
          ? `✅ Fuzzy matched SKU ${product.sku} to ${result.matchedSku} in ${result.image.name}`
          : `✅ Matched SKU ${product.sku} to image ${result.image.name}`
        
        if ((result.allCodes || []).length > 1) {
          await logMessage('info', `${matchInfo} [Multi-SKU: ${result.allCodes?.join(', ')}]`)
        } else {
          await logMessage('info', matchInfo)
        }
        
        if ((result.alternatives || []).length > 0) {
          await logMessage('info', `   📎 ${result.alternatives?.length} additional images available for this SKU`)
        }
      } else {
        missingSkus.push({sku: product.sku, productName: product.name})
      }

      progress.processed++
      await sendProgressUpdate(progress)
    }
    
    // Log summary statistics
    const cacheStats = imageCache.getStats()
    await logMessage('info', `📊 Cache Statistics: ${cacheStats.totalMappings} unique SKU mappings, ${cacheStats.multiSkuFiles} multi-SKU files`)
    await logMessage('info', `📊 Match Statistics: ${matches.length} total matches (${fuzzyMatches} fuzzy, ${multiSkuMatches} multi-SKU)`)
    
    if (missingSkus.length > 0) {
      await logMessage('warn', `⚠️ Missing images for ${missingSkus.length} SKUs`)
      // Log first few missing SKUs as examples
      const exampleMissing = missingSkus.slice(0, 5).map(item => item.sku).join(', ')
      await logMessage('warn', `   Examples: ${exampleMissing}${missingSkus.length > 5 ? '...' : ''}`)
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

    // Generate comprehensive final report
    const finalStats = imageCache.getStats()
    const mappingReport = imageCache.getAllMappings()
    
    await logMessage('info', `🎉 Storage scan completed!`)
    await logMessage('info', `📈 Final Results:`)
    await logMessage('info', `   • ${progress.foundImages} images found in storage`)
    await logMessage('info', `   • ${progress.matchedProducts} products matched (${fuzzyMatches} fuzzy matches)`)
    await logMessage('info', `   • ${progress.successful} database records updated successfully`)
    await logMessage('info', `   • ${progress.failed} operations failed`)
    await logMessage('info', `   • ${finalStats.multiSkuFiles} files contained multiple SKUs`)
    await logMessage('info', `   • ${missingSkus.length} SKUs had no matching images`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Enhanced storage image scan and mapping completed',
        sessionId,
        results: {
          foundImages: progress.foundImages,
          matchedProducts: progress.matchedProducts,
          processed: progress.processed,
          successful: progress.successful,
          failed: progress.failed,
          errors: progress.errors,
          fuzzyMatches,
          multiSkuMatches,
          missingSkus: missingSkus.length,
          cacheStats: finalStats,
          detailedMappings: mappingReport.slice(0, 100), // Limit for response size
          missingSkusList: missingSkus.slice(0, 50) // Limit for response size
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