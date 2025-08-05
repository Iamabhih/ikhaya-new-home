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
  category_name?: string
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

interface MatchResult {
  product: Product
  imageFile: StorageImage
  matchType: 'exact' | 'fuzzy' | 'category-boosted'
  matchScore: number
  sourceFolder: string
}

// Enhanced robust SKU extraction with fuzzy matching and multiple pattern strategies
function extractSKUFromFilename(filename: string): string[] {
  if (!filename || typeof filename !== 'string') return []
  
  // Remove file extension and path
  const nameWithoutExt = filename.replace(/.*\//, '').replace(/\.[^/.]+$/, '')
  
  console.log(`🔍 Extracting SKUs from: ${filename} -> ${nameWithoutExt}`)
  
  const skus = new Set<string>()
  
  try {
    // Pattern 1: Direct numeric SKUs (most common)
    const directNumbers = nameWithoutExt.match(/\b\d{3,8}\b/g)
    if (directNumbers) {
      directNumbers.forEach(num => {
        skus.add(num)
        // Add zero-padded versions for short SKUs
        if (num.length === 3) skus.add('0' + num)
        if (num.length === 4 && !num.startsWith('0')) skus.add('0' + num)
      })
    }
  
    // Pattern 2: Complex multi-SKU patterns (455100.455101.455102.455103)
    const multiSku = nameWithoutExt.match(/^(\d{3,8})(?:\.(\d{3,8}))+/)
    if (multiSku) {
      const allMatches = nameWithoutExt.match(/\d{3,8}/g)
      if (allMatches) {
        allMatches.forEach(sku => skus.add(sku))
      }
    }
    
    // Pattern 3: SKU with separators (455404-1, SKU_455404, PROD-455404)
    const separatorPatterns = [
      /(?:SKU|PROD|ITEM)[_-]?(\d{3,8})/gi,
      /(\d{3,8})[_-]\d+/g,
      /(\d{3,8})[_-][a-zA-Z]+/g,
      /(\d{3,8})\s*\([^)]*\)/g // Handle patterns like "455110 (blue)"
    ]
    
    separatorPatterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(nameWithoutExt)) !== null) {
        skus.add(match[1])
      }
    })
    
    // Pattern 4: Category-based extraction (BAKEWARE/447604)
    const pathMatch = filename.match(/\/(\d{3,8})/)
    if (pathMatch) {
      skus.add(pathMatch[1])
    }
    
    // Pattern 5: Space-separated patterns "455112 (2)"
    const spacePattern = nameWithoutExt.match(/(\d{3,8})\s+\([^)]*\)/)
    if (spacePattern) {
      skus.add(spacePattern[1])
    }
    
    // Pattern 6: Alphanumeric codes (for special products)
    const alphaNumeric = nameWithoutExt.match(/\b[A-Z]\d{3,7}\b/g)
    if (alphaNumeric) {
      alphaNumeric.forEach(code => skus.add(code.toLowerCase()))
    }
    
    const result = Array.from(skus)
    console.log(`✅ Extracted SKUs [${result.join(', ')}] from "${filename}"`)
    return result
  } catch (error) {
    console.error(`❌ Error extracting SKUs from "${filename}":`, error)
    return []
  }
}

// Category mapping for better matching
function getCategoryKeywords(): Record<string, string[]> {
  return {
    'TOYS': ['toy', 'game', 'play', 'kids', 'children', 'puzzle', 'doll', 'car', 'truck', 'action', 'figure'],
    'BAKEWARE': ['bake', 'cake', 'pan', 'tin', 'mould', 'baking', 'oven', 'pastry', 'bread', 'cookie'],
    'KITCHEN': ['kitchen', 'cook', 'pot', 'knife', 'utensil', 'bowl', 'plate', 'cup', 'mug', 'spoon'],
    'HOMEWARE': ['home', 'decor', 'vase', 'candle', 'cushion', 'picture', 'frame', 'storage', 'organize'],
    'ELECTRONICS': ['electronic', 'battery', 'cable', 'charger', 'adapter', 'tech', 'digital', 'smart'],
    'TOOLS': ['tool', 'drill', 'hammer', 'screwdriver', 'wrench', 'saw', 'measure', 'hardware'],
    'GARDEN': ['garden', 'plant', 'seed', 'watering', 'soil', 'fertilizer', 'outdoor', 'lawn'],
    'CLOTHING': ['shirt', 'dress', 'pants', 'jacket', 'shoe', 'sock', 'hat', 'clothing', 'apparel'],
    'STATIONERY': ['pen', 'pencil', 'paper', 'notebook', 'eraser', 'ruler', 'stapler', 'office'],
    'BEAUTY': ['beauty', 'makeup', 'cream', 'lotion', 'shampoo', 'soap', 'cosmetic', 'skincare']
  }
}

// Extract folder name from storage path for category matching
function extractFolderFromPath(storagePath: string): string {
  const pathParts = storagePath.split('/')
  // Get the immediate parent folder of the image file
  if (pathParts.length >= 3) {
    return pathParts[pathParts.length - 2].toUpperCase()
  }
  return 'UNKNOWN'
}

// Calculate category match score
function calculateCategoryScore(productName: string, productCategory: string | undefined, imageFolder: string): number {
  const categoryKeywords = getCategoryKeywords()
  let score = 0
  
  const productNameLower = productName.toLowerCase()
  const productCategoryLower = productCategory?.toLowerCase() || ''
  
  // Direct folder match with product category gets highest score
  if (productCategory && imageFolder.toLowerCase() === productCategoryLower) {
    score += 10
  }
  
  // Check if product name contains keywords matching the image folder
  if (categoryKeywords[imageFolder]) {
    for (const keyword of categoryKeywords[imageFolder]) {
      if (productNameLower.includes(keyword)) {
        score += 3
      }
    }
  }
  
  // Check if product category contains keywords matching the image folder  
  if (productCategory && categoryKeywords[imageFolder]) {
    for (const keyword of categoryKeywords[imageFolder]) {
      if (productCategoryLower.includes(keyword)) {
        score += 5
      }
    }
  }
  
  return score
}

// Enhanced fuzzy matching for better SKU correlation with category awareness
function createCategoryAwareImageMatcher() {
  const imageCache = new Map<string, StorageImage>()
  const fuzzyCache = new Map<string, string[]>() // normalized SKU -> original SKUs
  const categoryIndex = new Map<string, StorageImage[]>() // folder -> images
  
  return {
    buildMapping: (images: StorageImage[]) => {
      imageCache.clear()
      fuzzyCache.clear()
      categoryIndex.clear()
      
      console.log(`🧠 Building category-aware image mapping from ${images.length} images`)
      
      for (const image of images) {
        try {
          const skus = extractSKUFromFilename(image.filename)
          const folder = extractFolderFromPath(image.storagePath)
          
          // Build category index
          if (!categoryIndex.has(folder)) {
            categoryIndex.set(folder, [])
          }
          categoryIndex.get(folder)!.push(image)
          
          for (const sku of skus) {
            // Store primary mapping
            if (!imageCache.has(sku)) {
              imageCache.set(sku, image)
            }
            
            // Build fuzzy mapping variations
            const variations = generateSKUVariations(sku)
            for (const variation of variations) {
              if (!fuzzyCache.has(variation)) {
                fuzzyCache.set(variation, [])
              }
              fuzzyCache.get(variation)!.push(sku)
            }
          }
        } catch (error) {
          console.error(`Error processing image ${image.filename}:`, error)
          continue
        }
      }
      
      console.log(`🎯 Built mapping: ${imageCache.size} direct matches, ${fuzzyCache.size} fuzzy variations, ${categoryIndex.size} category folders`)
    },
    
    findBestImage: (product: Product): MatchResult | null => {
      if (!product.sku) return null
      
      const normalizedSku = product.sku.toLowerCase().trim()
      const candidates: MatchResult[] = []
      
      // 1. Direct SKU match (highest priority)
      if (imageCache.has(normalizedSku)) {
        const image = imageCache.get(normalizedSku)!
        const folder = extractFolderFromPath(image.storagePath)
        const categoryScore = calculateCategoryScore(product.name, product.category_name, folder)
        
        candidates.push({
          product,
          imageFile: image,
          matchType: 'exact',
          matchScore: 100 + categoryScore,
          sourceFolder: folder
        })
      }
      
      // 2. Fuzzy SKU matches
      const variations = generateSKUVariations(normalizedSku)
      for (const variation of variations) {
        if (imageCache.has(variation)) {
          const image = imageCache.get(variation)!
          const folder = extractFolderFromPath(image.storagePath)
          const categoryScore = calculateCategoryScore(product.name, product.category_name, folder)
          
          candidates.push({
            product,
            imageFile: image,
            matchType: 'fuzzy',
            matchScore: 80 + categoryScore,
            sourceFolder: folder
          })
        }
        
        // Check fuzzy cache for this variation
        if (fuzzyCache.has(variation)) {
          const skuCandidates = fuzzyCache.get(variation)!
          for (const candidate of skuCandidates) {
            if (imageCache.has(candidate)) {
              const image = imageCache.get(candidate)!
              const folder = extractFolderFromPath(image.storagePath)
              const categoryScore = calculateCategoryScore(product.name, product.category_name, folder)
              
              candidates.push({
                product,
                imageFile: image,
                matchType: 'fuzzy',
                matchScore: 70 + categoryScore,
                sourceFolder: folder
              })
            }
          }
        }
      }
      
      // 3. Category-based fallback (if no SKU match found and we have strong category signals)
      if (candidates.length === 0 && product.category_name) {
        const categoryFolder = product.category_name.toUpperCase()
        if (categoryIndex.has(categoryFolder)) {
          const categoryImages = categoryIndex.get(categoryFolder)!
          // Only suggest category-based matches if we have strong keyword matches
          for (const image of categoryImages.slice(0, 5)) { // Limit to first 5 to avoid noise
            const categoryScore = calculateCategoryScore(product.name, product.category_name, categoryFolder)
            if (categoryScore >= 5) { // Only if we have decent keyword match
              candidates.push({
                product,
                imageFile: image,
                matchType: 'category-boosted',
                matchScore: categoryScore,
                sourceFolder: categoryFolder
              })
            }
          }
        }
      }
      
      // Return the best match (highest score)
      if (candidates.length > 0) {
        const bestMatch = candidates.sort((a, b) => b.matchScore - a.matchScore)[0]
        console.log(`🎯 Best match for ${product.sku}: ${bestMatch.imageFile.filename} (${bestMatch.matchType}, score: ${bestMatch.matchScore}, folder: ${bestMatch.sourceFolder})`)
        return bestMatch
      }
      
      return null
    },
    
    // Keep legacy method for backward compatibility
    findImage: (productSku: string): StorageImage | null => {
      if (!productSku) return null
      
      const normalizedSku = productSku.toLowerCase().trim()
      
      // Direct match
      if (imageCache.has(normalizedSku)) {
        return imageCache.get(normalizedSku)!
      }
      
      // Fuzzy match using variations
      const variations = generateSKUVariations(normalizedSku)
      for (const variation of variations) {
        if (imageCache.has(variation)) {
          console.log(`🎯 Fuzzy matched ${productSku} -> ${variation}`)
          return imageCache.get(variation)!
        }
        
        // Check fuzzy cache for this variation
        if (fuzzyCache.has(variation)) {
          const candidates = fuzzyCache.get(variation)!
          for (const candidate of candidates) {
            if (imageCache.has(candidate)) {
              console.log(`🎯 Advanced fuzzy matched ${productSku} -> ${candidate}`)
              return imageCache.get(candidate)!
            }
          }
        }
      }
      
      return null
    },
    
    getStats: () => ({
      directMappings: imageCache.size,
      fuzzyVariations: fuzzyCache.size,
      totalImages: Array.from(new Set(Array.from(imageCache.values()).map(img => img.filename))).length,
      categoryFolders: categoryIndex.size,
      categoryBreakdown: Object.fromEntries(
        Array.from(categoryIndex.entries()).map(([folder, images]) => [folder, images.length])
      )
    })
  }
}

// Legacy image matcher for backward compatibility
function createAdvancedImageMatcher() {
  const imageCache = new Map<string, StorageImage>()
  const fuzzyCache = new Map<string, string[]>() // normalized SKU -> original SKUs
  
  return {
    buildMapping: (images: StorageImage[]) => {
      imageCache.clear()
      fuzzyCache.clear()
      
      console.log(`🧠 Building advanced image mapping from ${images.length} images`)
      
      for (const image of images) {
        try {
          const skus = extractSKUFromFilename(image.filename)
          
          for (const sku of skus) {
            // Store primary mapping
            if (!imageCache.has(sku)) {
              imageCache.set(sku, image)
            }
            
            // Build fuzzy mapping variations
            const variations = generateSKUVariations(sku)
            for (const variation of variations) {
              if (!fuzzyCache.has(variation)) {
                fuzzyCache.set(variation, [])
              }
              fuzzyCache.get(variation)!.push(sku)
            }
          }
        } catch (error) {
          console.error(`Error processing image ${image.filename}:`, error)
          continue
        }
      }
      
      console.log(`🎯 Built mapping: ${imageCache.size} direct matches, ${fuzzyCache.size} fuzzy variations`)
    },
    
    findImage: (productSku: string): StorageImage | null => {
      if (!productSku) return null
      
      const normalizedSku = productSku.toLowerCase().trim()
      
      // Direct match
      if (imageCache.has(normalizedSku)) {
        return imageCache.get(normalizedSku)!
      }
      
      // Fuzzy match using variations
      const variations = generateSKUVariations(normalizedSku)
      for (const variation of variations) {
        if (imageCache.has(variation)) {
          console.log(`🎯 Fuzzy matched ${productSku} -> ${variation}`)
          return imageCache.get(variation)!
        }
        
        // Check fuzzy cache for this variation
        if (fuzzyCache.has(variation)) {
          const candidates = fuzzyCache.get(variation)!
          for (const candidate of candidates) {
            if (imageCache.has(candidate)) {
              console.log(`🎯 Advanced fuzzy matched ${productSku} -> ${candidate}`)
              return imageCache.get(candidate)!
            }
          }
        }
      }
      
      return null
    },
    
    getStats: () => ({
      directMappings: imageCache.size,
      fuzzyVariations: fuzzyCache.size,
      totalImages: Array.from(new Set(Array.from(imageCache.values()).map(img => img.filename))).length
    })
  }
}

// Generate SKU variations for fuzzy matching
function generateSKUVariations(sku: string): string[] {
  const variations = new Set<string>()
  const normalized = sku.toLowerCase().trim()
  
  variations.add(normalized)
  
  // Zero padding variations
  if (/^\d{3}$/.test(normalized)) {
    variations.add('0' + normalized)
    variations.add('00' + normalized) // Sometimes 00123 format
  }
  if (/^0\d{3}$/.test(normalized)) {
    variations.add(normalized.substring(1))
  }
  if (/^\d{4}$/.test(normalized) && !normalized.startsWith('0')) {
    variations.add('0' + normalized)
  }
  if (/^0\d{4}$/.test(normalized)) {
    variations.add(normalized.substring(1))
  }
  if (/^00\d{3}$/.test(normalized)) {
    variations.add(normalized.substring(2)) // Remove 00 prefix
    variations.add(normalized.substring(1)) // Remove single 0 prefix
  }
  
  // Remove common prefixes/suffixes
  const withoutPrefix = normalized.replace(/^(sku|prod|item|product)[_-]?/i, '')
  if (withoutPrefix !== normalized) {
    variations.add(withoutPrefix)
  }
  
  // Remove common suffixes
  const withoutSuffix = normalized.replace(/[_-]?(main|primary|front|back|side|top|bottom|image|img|pic|photo)$/i, '')
  if (withoutSuffix !== normalized) {
    variations.add(withoutSuffix)
  }
  
  // Handle hyphenated versions
  if (normalized.includes('-')) {
    const parts = normalized.split('-')
    variations.add(parts[0]) // First part
    if (parts.length > 1) {
      variations.add(parts.join('')) // Remove hyphens
    }
  }
  
  // Handle underscored versions
  if (normalized.includes('_')) {
    const parts = normalized.split('_')
    variations.add(parts[0]) // First part
    if (parts.length > 1) {
      variations.add(parts.join('')) // Remove underscores
    }
  }
  
  // Handle dotted versions (like 455147.455148.455149)
  if (normalized.includes('.')) {
    const parts = normalized.split('.')
    parts.forEach(part => {
      if (part.length >= 3) variations.add(part)
    })
    variations.add(parts.join('')) // Remove dots
  }
  
  // Handle parentheses versions (like "455112 (2)")
  const parenthesesMatch = normalized.match(/(\d+)\s*\([^)]*\)/)
  if (parenthesesMatch) {
    variations.add(parenthesesMatch[1])
  }
  
  // Handle version numbers and suffixes
  const versionMatch = normalized.match(/(\d+)[_-]?(v\d+|version\d+|\d+)$/i)
  if (versionMatch) {
    variations.add(versionMatch[1])
  }
  
  // Remove file extensions if somehow included
  const withoutExt = normalized.replace(/\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i, '')
  if (withoutExt !== normalized) {
    variations.add(withoutExt)
  }
  
  return Array.from(variations)
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const sessionId = crypto.randomUUID()
  let supabaseClient: any
  
  // Parse request body for optional parameters
  let requestBody: any = {}
  try {
    if (req.method === 'POST') {
      requestBody = await req.json()
    }
  } catch (error) {
    console.log('No request body or invalid JSON, using defaults')
  }
  
  // Extract optional parameters
  const targetFolder = requestBody.targetFolder || 'MULTI_MATCH_ORGANIZED' // Default to existing behavior
  const enableCategoryMatching = requestBody.enableCategoryMatching !== false // Default to true
  const categoryBoostThreshold = requestBody.categoryBoostThreshold || 5

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
      .select(`
        id, 
        sku, 
        name,
        categories!inner(name)
      `)
      .not('sku', 'is', null)
      .limit(50000)

    if (productsError) {
      console.error('❌ Products fetch failed:', productsError)
      await logMessage('error', `Failed to fetch products: ${productsError.message}`)
      throw new Error(`Failed to fetch products: ${productsError.message}`)
    }

    // Transform products to include category name for better matching
    const transformedProducts = products?.map(p => ({
      ...p,
      category_name: p.categories?.name
    })) || []

    console.log(`✅ Found ${transformedProducts.length} products with SKUs`)
    await logMessage('info', `Found ${transformedProducts.length} products with SKUs (${enableCategoryMatching ? 'category-aware' : 'SKU-only'} matching enabled)`)

    // Step 2: Recursively scan specified folder (with manual folder selection support)
    console.log(`🔍 Starting Storage scan of ${targetFolder}...`)
    progress.currentStep = `Scanning ${targetFolder} folder recursively`
    await sendProgressUpdate(progress)

    const imageFiles: StorageImage[] = []
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    
    // Function to recursively scan folders with pagination
    async function scanFolder(folderPath: string = targetFolder) {
      let offset = 0
      const limit = 5000 // Use larger chunks for better performance
      let hasMore = true
      
      while (hasMore) {
        const { data: storageFiles, error: storageError } = await supabaseClient.storage
          .from('product-images')
          .list(folderPath, {
            limit,
            offset,
            sortBy: { column: 'name', order: 'asc' }
          })

        if (storageError) {
          console.error(`❌ Error accessing storage folder ${folderPath}:`, storageError)
          throw new Error(`Storage access failed: ${storageError.message}`)
        }

        if (!storageFiles || storageFiles.length === 0) {
          hasMore = false
          break
        }

        console.log(`📂 Scanning folder ${folderPath}, batch ${Math.floor(offset/limit) + 1}: found ${storageFiles.length} items`)

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
            const skus = extractSKUFromFilename(file.name)
            if (skus.length > 0) {
              const storagePath = fullPath.startsWith('MULTI_MATCH_ORGANIZED/') 
                ? fullPath 
                : `MULTI_MATCH_ORGANIZED/${fullPath.replace('MULTI_MATCH_ORGANIZED/', '')}`
              
              imageFiles.push({
                filename: file.name,
                sku: skus[0], // Use primary SKU for storage
                storagePath,
                metadata: { ...file.metadata || {}, allSkus: skus }
              })
              console.log(`📎 Found image: ${file.name} -> SKUs: [${skus.join(', ')}]`)
            } else {
              console.log(`⚠️ Skipping image without extractable SKU: ${file.name}`)
            }
          }
        }
        
        // Check if we got fewer results than requested, meaning we've reached the end
        if (storageFiles.length < limit) {
          hasMore = false
        } else {
          offset += limit
          // Add a small delay between batches to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
    }
    
    await scanFolder()
    
    console.log(`📊 Found ${imageFiles.length} processable images with SKUs`)
    await logMessage('info', `Found ${imageFiles.length} images in storage MULTI_MATCH_ORGANIZED folder`)

    // Step 3: Build advanced intelligent image mapping
    console.log("[PROGRESS] Building advanced image mapping cache", JSON.stringify({
      status: 'processing',
      processed: 0,
      successful: 0,
      failed: 0,
      total: imageFiles.length
    }))
    
    console.log(`🧠 Building ${enableCategoryMatching ? 'category-aware' : 'legacy'} image matcher from ${imageFiles.length} images`)
    const imageMatcher = enableCategoryMatching ? createCategoryAwareImageMatcher() : createAdvancedImageMatcher()
    imageMatcher.buildMapping(imageFiles)
    
    const matcherStats = imageMatcher.getStats()
    console.log(`✅ Advanced mapping built: ${matcherStats.directMappings} direct, ${matcherStats.fuzzyVariations} fuzzy variants, ${matcherStats.totalImages} unique images`)
    await logMessage('info', `Advanced image mapping: ${matcherStats.directMappings} direct mappings, ${matcherStats.fuzzyVariations} fuzzy variations`)

    // Step 4: Enhanced product-image matching with fuzzy logic
    progress.total = Math.min(products?.length || 50000, 50000)
    progress.currentStep = 'Advanced fuzzy matching products to images'
    await sendProgressUpdate(progress)

    const matchedProducts: Array<{product: Product, imageFile: StorageImage}> = []
    let exactMatches = 0
    let fuzzyMatches = 0
    let categoryMatches = 0
    
    if (!transformedProducts || transformedProducts.length === 0) {
      await logMessage('warn', 'No products found to process')
      progress.total = 0
      await sendProgressUpdate(progress)
    } else {
      
      for (const product of transformedProducts) {
        try {
          if (!product || !product.sku) continue

          // Use category-aware matching if enabled
          if (enableCategoryMatching && typeof imageMatcher.findBestImage === 'function') {
            const bestMatch = imageMatcher.findBestImage(product)
            if (bestMatch) {
              matchedProducts.push({ product: bestMatch.product, imageFile: bestMatch.imageFile })
              
              if (bestMatch.matchType === 'exact') {
                exactMatches++
              } else if (bestMatch.matchType === 'fuzzy') {
                fuzzyMatches++
              } else if (bestMatch.matchType === 'category-boosted') {
                categoryMatches++
              }
              
              console.log(`✅ ${bestMatch.matchType} match: ${product.sku} -> ${bestMatch.imageFile.filename} (score: ${bestMatch.matchScore}, folder: ${bestMatch.sourceFolder})`)
            }
          } else {
            // Fallback to legacy matching
            const matchedImage = imageMatcher.findImage(product.sku)
            if (matchedImage) {
              matchedProducts.push({ product, imageFile: matchedImage })
              
              // Check if it was a direct or fuzzy match
              const directMatch = imageFiles.find(img => img.sku === product.sku)
              if (directMatch) {
                exactMatches++
                console.log(`✅ Direct match: ${product.sku} -> ${matchedImage.filename}`)
              } else {
                fuzzyMatches++
                console.log(`🎯 Fuzzy match: ${product.sku} -> ${matchedImage.filename}`)
              }
            }
          }
        } catch (error) {
          await logMessage('error', `Error matching product ${product?.sku || 'unknown'}: ${error.message}`)
        }
      }
      
      const totalMatches = exactMatches + fuzzyMatches + categoryMatches
      if (enableCategoryMatching) {
        console.log(`📊 Category-aware matching complete: ${exactMatches} exact + ${fuzzyMatches} fuzzy + ${categoryMatches} category = ${totalMatches} total matches`)
      } else {
        console.log(`📊 Legacy matching complete: ${exactMatches} exact + ${fuzzyMatches} fuzzy = ${totalMatches} total matches`)
      }
    }

    progress.total = matchedProducts.length
    const totalMatches = exactMatches + fuzzyMatches + categoryMatches
    if (enableCategoryMatching) {
      await logMessage('info', `Category-aware matching complete: ${totalMatches} products matched (${exactMatches} exact, ${fuzzyMatches} fuzzy, ${categoryMatches} category) from ${imageFiles.length} images`)
    } else {
      await logMessage('info', `Legacy matching complete: ${totalMatches} products matched (${exactMatches} exact, ${fuzzyMatches} fuzzy) from ${imageFiles.length} images`)
    }
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