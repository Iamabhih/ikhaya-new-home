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

interface MigrationCheckpoint {
  sessionId: string
  processedItems: string[]
  lastProcessedIndex: number
  timestamp: string
}

// Enhanced error handling and recovery
class MigrationError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false,
    public context?: any
  ) {
    super(message)
    this.name = 'MigrationError'
  }
}

// Circuit breaker for handling cascading failures
class CircuitBreaker {
  private failureCount = 0
  private lastFailureTime = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'
  
  constructor(
    private threshold: number = 5,
    private timeout: number = 30000
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime < this.timeout) {
        throw new MigrationError('Circuit breaker is OPEN', 'CIRCUIT_OPEN', true)
      }
      this.state = 'HALF_OPEN'
    }
    
    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }
  
  private onSuccess() {
    this.failureCount = 0
    this.state = 'CLOSED'
  }
  
  private onFailure() {
    this.failureCount++
    this.lastFailureTime = Date.now()
    
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN'
    }
  }
}

// Enhanced robust SKU extraction with validation
function extractSKUFromFilename(filename: string): string[] {
  if (!filename || typeof filename !== 'string') return []
  
  try {
    // Remove file extension and path
    const nameWithoutExt = filename.replace(/.*\//, '').replace(/\.[^/.]+$/, '')
    
    console.log(`🔍 [EXTRACT] SKUs from: ${filename} -> ${nameWithoutExt}`)
    
    const skus = new Set<string>()
    
    // PRIORITY 1: Exact filename match (highest priority)
    if (/^\d{3,8}$/.test(nameWithoutExt)) {
      skus.add(nameWithoutExt)
      console.log(`✅ [EXACT] Found exact SKU match: ${nameWithoutExt}`)
    }
    
    // PRIORITY 2: Direct numeric SKUs (most common)
    const directNumbers = nameWithoutExt.match(/\b\d{3,8}\b/g)
    if (directNumbers) {
      // Sort by length to prioritize longer, more specific SKUs
      directNumbers.sort((a, b) => b.length - a.length).forEach(num => {
        // Validate SKU format (basic validation)
        if (isValidSKU(num)) {
          skus.add(num)
          console.log(`✅ [DIRECT] Found direct numeric SKU: ${num}`)
          
          // Add zero-padded versions for short SKUs
          if (num.length === 3) {
            skus.add('0' + num)
            console.log(`📝 [PADDED] Added zero-padded version: 0${num}`)
          }
          if (num.length === 4 && !num.startsWith('0')) {
            skus.add('0' + num)
            console.log(`📝 [PADDED] Added zero-padded version: 0${num}`)
          }
        }
      })
    }

    // Pattern 2: Complex multi-SKU patterns (455100.455101.455102.455103)
    const multiSku = nameWithoutExt.match(/^(\d{3,8})(?:\.(\d{3,8}))+/)
    if (multiSku) {
      const allMatches = nameWithoutExt.match(/\d{3,8}/g)
      if (allMatches) {
        allMatches.forEach(sku => {
          if (isValidSKU(sku)) {
            skus.add(sku)
          }
        })
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
        if (isValidSKU(match[1])) {
          skus.add(match[1])
        }
      }
    })
    
    // Pattern 4: Category-based extraction (BAKEWARE/447604)
    const pathMatch = filename.match(/\/(\d{3,8})/)
    if (pathMatch && isValidSKU(pathMatch[1])) {
      skus.add(pathMatch[1])
    }
    
    // Pattern 5: Space-separated patterns "455112 (2)"
    const spacePattern = nameWithoutExt.match(/(\d{3,8})\s+\([^)]*\)/)
    if (spacePattern && isValidSKU(spacePattern[1])) {
      skus.add(spacePattern[1])
    }
    
    // Pattern 6: Alphanumeric codes (for special products)
    const alphaNumeric = nameWithoutExt.match(/\b[A-Z]\d{3,7}\b/g)
    if (alphaNumeric) {
      alphaNumeric.forEach(code => {
        const normalizedCode = code.toLowerCase()
        if (isValidSKU(normalizedCode)) {
          skus.add(normalizedCode)
        }
      })
    }
    
    const result = Array.from(skus)
    console.log(`✅ Extracted SKUs [${result.join(', ')}] from "${filename}"`)
    return result
  } catch (error) {
    console.error(`❌ Error extracting SKUs from "${filename}":`, error)
    return []
  }
}

// Basic SKU validation
function isValidSKU(sku: string): boolean {
  if (!sku || sku.length < 3 || sku.length > 10) return false
  
  // Reject obviously invalid patterns
  if (/^0+$/.test(sku)) return false // All zeros
  if (/^1+$/.test(sku)) return false // All ones
  
  return true
}

// Enhanced category mapping with more comprehensive keywords
function getCategoryKeywords(): Record<string, string[]> {
  return {
    'TOYS': ['toy', 'game', 'play', 'kids', 'children', 'puzzle', 'doll', 'car', 'truck', 'action', 'figure', 'blocks', 'educational'],
    'BAKEWARE': ['bake', 'cake', 'pan', 'tin', 'mould', 'baking', 'oven', 'pastry', 'bread', 'cookie', 'muffin', 'loaf', 'silicone'],
    'KITCHEN': ['kitchen', 'cook', 'pot', 'knife', 'utensil', 'bowl', 'plate', 'cup', 'mug', 'spoon', 'fork', 'cutting', 'chopping'],
    'HOMEWARE': ['home', 'decor', 'vase', 'candle', 'cushion', 'picture', 'frame', 'storage', 'organize', 'furniture', 'lighting'],
    'ELECTRONICS': ['electronic', 'battery', 'cable', 'charger', 'adapter', 'tech', 'digital', 'smart', 'wireless', 'bluetooth'],
    'TOOLS': ['tool', 'drill', 'hammer', 'screwdriver', 'wrench', 'saw', 'measure', 'hardware', 'repair', 'maintenance'],
    'GARDEN': ['garden', 'plant', 'seed', 'watering', 'soil', 'fertilizer', 'outdoor', 'lawn', 'greenhouse', 'pruning'],
    'CLOTHING': ['shirt', 'dress', 'pants', 'jacket', 'shoe', 'sock', 'hat', 'clothing', 'apparel', 'fashion', 'wear'],
    'STATIONERY': ['pen', 'pencil', 'paper', 'notebook', 'eraser', 'ruler', 'stapler', 'office', 'writing', 'marker'],
    'BEAUTY': ['beauty', 'makeup', 'cream', 'lotion', 'shampoo', 'soap', 'cosmetic', 'skincare', 'fragrance', 'nail']
  }
}

// Extract folder name from storage path for category matching
function extractFolderFromPath(storagePath: string): string {
  const pathParts = storagePath.split('/')
  if (pathParts.length >= 3) {
    return pathParts[pathParts.length - 2].toUpperCase()
  }
  return 'UNKNOWN'
}

// Enhanced category score calculation with fuzzy matching
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

// Enhanced image matcher with improved error handling
function createCategoryAwareImageMatcher() {
  const imageCache = new Map<string, StorageImage>()
  const fuzzyCache = new Map<string, string[]>()
  const categoryIndex = new Map<string, StorageImage[]>()
  
  return {
    buildMapping: (images: StorageImage[]) => {
      imageCache.clear()
      fuzzyCache.clear()
      categoryIndex.clear()
      
      console.log(`🧠 Building category-aware image mapping from ${images.length} images`)
      
      let successCount = 0
      let errorCount = 0
      
      for (const image of images) {
        try {
          if (!image?.filename) {
            console.warn(`⚠️ Skipping image with missing filename:`, image)
            continue
          }
          
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
          successCount++
        } catch (error) {
          console.error(`Error processing image ${image?.filename || 'unknown'}:`, error)
          errorCount++
          continue
        }
      }
      
      console.log(`🎯 Built mapping: ${imageCache.size} direct matches, ${fuzzyCache.size} fuzzy variations, ${categoryIndex.size} category folders`)
      console.log(`📊 Processing stats: ${successCount} successful, ${errorCount} errors`)
    },
    
    findBestImage: (product: Product): MatchResult | null => {
      if (!product?.sku) {
        console.warn(`⚠️ Product missing SKU:`, product)
        return null
      }
      
      const normalizedSku = product.sku.toLowerCase().trim()
      const candidates: MatchResult[] = []
      
      console.log(`🎯 [MATCH] Finding best image for product SKU: ${product.sku}`)
      
      try {
        // PRIORITY 1: Exact SKU match (highest priority - 1000 points base)
        if (imageCache.has(normalizedSku)) {
          const image = imageCache.get(normalizedSku)!
          const folder = extractFolderFromPath(image.storagePath)
          const categoryScore = calculateCategoryScore(product.name, product.category_name, folder)
          
          console.log(`✅ [EXACT] Direct SKU match found: ${normalizedSku} -> ${image.filename}`)
          
          candidates.push({
            product,
            imageFile: image,
            matchType: 'exact',
            matchScore: 1000 + categoryScore,
            sourceFolder: folder
          })
        }
        
        // PRIORITY 2: Exact case-insensitive match
        const exactVariations = [product.sku, product.sku.toUpperCase(), product.sku.toLowerCase()]
        for (const variation of exactVariations) {
          if (imageCache.has(variation) && !candidates.find(c => c.imageFile.filename === imageCache.get(variation)!.filename)) {
            const image = imageCache.get(variation)!
            const folder = extractFolderFromPath(image.storagePath)
            const categoryScore = calculateCategoryScore(product.name, product.category_name, folder)
            
            console.log(`✅ [EXACT-CASE] Case variation match: ${variation} -> ${image.filename}`)
            
            candidates.push({
              product,
              imageFile: image,
              matchType: 'exact',
              matchScore: 950 + categoryScore,
              sourceFolder: folder
            })
          }
        }
        
        // PRIORITY 3: Fuzzy SKU matches
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
        
        // PRIORITY 4: Category-based fallback
        if (candidates.length === 0 && product.category_name) {
          const categoryFolder = product.category_name.toUpperCase()
          if (categoryIndex.has(categoryFolder)) {
            const categoryImages = categoryIndex.get(categoryFolder)!
            for (const image of categoryImages.slice(0, 5)) {
              const categoryScore = calculateCategoryScore(product.name, product.category_name, categoryFolder)
              if (categoryScore >= 5) {
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
        
        console.log(`❌ [NO_MATCH] No image found for SKU: ${normalizedSku}`)
        return null
        
      } catch (error) {
        console.error(`❌ Error finding image for product ${product.sku}:`, error)
        return null
      }
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

// Enhanced SKU variations generator with better validation
function generateSKUVariations(sku: string): string[] {
  const variations = new Set<string>()
  const normalized = sku.toLowerCase().trim()
  
  if (!normalized) return []
  
  variations.add(normalized)
  
  // Zero padding variations
  if (/^\d{3}$/.test(normalized)) {
    variations.add('0' + normalized)
    variations.add('00' + normalized)
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
    variations.add(normalized.substring(2))
    variations.add(normalized.substring(1))
  }
  
  // Remove common prefixes/suffixes
  const withoutPrefix = normalized.replace(/^(sku|prod|item|product)[_-]?/i, '')
  if (withoutPrefix !== normalized && withoutPrefix.length >= 3) {
    variations.add(withoutPrefix)
  }
  
  const withoutSuffix = normalized.replace(/[_-]?(main|primary|front|back|side|top|bottom|image|img|pic|photo)$/i, '')
  if (withoutSuffix !== normalized && withoutSuffix.length >= 3) {
    variations.add(withoutSuffix)
  }
  
  // Handle hyphenated versions
  if (normalized.includes('-')) {
    const parts = normalized.split('-')
    if (parts[0].length >= 3) variations.add(parts[0])
    if (parts.length > 1) {
      const joined = parts.join('')
      if (joined.length >= 3) variations.add(joined)
    }
  }
  
  // Handle underscored versions
  if (normalized.includes('_')) {
    const parts = normalized.split('_')
    if (parts[0].length >= 3) variations.add(parts[0])
    if (parts.length > 1) {
      const joined = parts.join('')
      if (joined.length >= 3) variations.add(joined)
    }
  }
  
  // Handle dotted versions
  if (normalized.includes('.')) {
    const parts = normalized.split('.')
    parts.forEach(part => {
      if (part.length >= 3) variations.add(part)
    })
    const joined = parts.join('')
    if (joined.length >= 3) variations.add(joined)
  }
  
  // Handle parentheses versions
  const parenthesesMatch = normalized.match(/(\d+)\s*\([^)]*\)/)
  if (parenthesesMatch && parenthesesMatch[1].length >= 3) {
    variations.add(parenthesesMatch[1])
  }
  
  // Handle version numbers and suffixes
  const versionMatch = normalized.match(/(\d+)[_-]?(v\d+|version\d+|\d+)$/i)
  if (versionMatch && versionMatch[1].length >= 3) {
    variations.add(versionMatch[1])
  }
  
  // Remove file extensions if somehow included
  const withoutExt = normalized.replace(/\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i, '')
  if (withoutExt !== normalized && withoutExt.length >= 3) {
    variations.add(withoutExt)
  }
  
  return Array.from(variations).filter(v => isValidSKU(v))
}

// Enhanced checkpoint management
class CheckpointManager {
  constructor(private supabaseClient: any) {}
  
  async saveCheckpoint(sessionId: string, processedItems: string[], lastIndex: number): Promise<void> {
    try {
      const checkpoint: MigrationCheckpoint = {
        sessionId,
        processedItems,
        lastProcessedIndex: lastIndex,
        timestamp: new Date().toISOString()
      }
      
      // Store in a temporary table or storage
      await this.supabaseClient
        .from('migration_checkpoints')
        .upsert(checkpoint)
        .eq('sessionId', sessionId)
    } catch (error) {
      console.warn('Failed to save checkpoint:', error)
    }
  }
  
  async loadCheckpoint(sessionId: string): Promise<MigrationCheckpoint | null> {
    try {
      const { data, error } = await this.supabaseClient
        .from('migration_checkpoints')
        .select('*')
        .eq('sessionId', sessionId)
        .single()
      
      if (error || !data) return null
      return data as MigrationCheckpoint
    } catch (error) {
      console.warn('Failed to load checkpoint:', error)
      return null
    }
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const sessionId = crypto.randomUUID()
  let supabaseClient: any
  const circuitBreaker = new CircuitBreaker(3, 30000)
  
  // Auth check first
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Authentication required'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    });
  }
  
  // Parse request body for optional parameters
  let requestBody: any = {}
  try {
    if (req.method === 'POST') {
      requestBody = await req.json()
    }
  } catch (error) {
    console.log('No request body or invalid JSON, using defaults')
  }
  
  // Extract optional parameters with validation
  const targetFolder = requestBody.targetFolder || 'MULTI_MATCH_ORGANIZED'
  const enableCategoryMatching = requestBody.enableCategoryMatching !== false
  const categoryBoostThreshold = Math.max(1, requestBody.categoryBoostThreshold || 5)
  const batchSize = Math.min(Math.max(1, requestBody.batchSize || 5), 20) // Limit batch size
  const enableCheckpoints = requestBody.enableCheckpoints !== false

  const sendProgressUpdate = async (progress: Partial<MigrationProgress>) => {
    try {
      if (supabaseClient) {
        const channel = supabaseClient.channel(`drive-migration-${sessionId}`)
        await channel.send({
          type: 'broadcast',
          event: 'migration_progress',
          payload: { ...progress, sessionId }
        })
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

    // Send dedicated log message through realtime
    try {
      if (supabaseClient) {
        const channel = supabaseClient.channel(`drive-migration-${sessionId}`)
        await channel.send({
          type: 'broadcast',
          event: 'migration_log',
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
    console.log('🚀 Starting enhanced migration function...')
    
    supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    console.log('✅ Supabase client initialized')

    const startTime = new Date().toISOString()
    const checkpointManager = enableCheckpoints ? new CheckpointManager(supabaseClient) : null
    
    console.log('📋 Initializing enhanced migration process...')
    await logMessage('info', '🚀 Starting enhanced image migration with improved error handling')

    // Initialize progress
    const progress: MigrationProgress = {
      sessionId,
      status: 'initializing',
      currentStep: 'Initializing enhanced migration process',
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

    // Start processing in background using waitUntil
    // EdgeRuntime.waitUntil(processMigration());
    
    // Return initial response immediately to prevent timeout
    return new Response(JSON.stringify({
      success: true,
      sessionId,
      message: 'Enhanced drive migration started successfully',
      config: {
        targetFolder,
        enableCategoryMatching,
        categoryBoostThreshold,
        batchSize,
        enableCheckpoints
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

    async function processMigration() {
      try {
        await logMessage('info', '🔧 Enhanced background migration processing started');

        // Check for existing checkpoint
        let checkpoint: MigrationCheckpoint | null = null
        if (checkpointManager) {
          checkpoint = await checkpointManager.loadCheckpoint(sessionId)
          if (checkpoint) {
            await logMessage('info', `📋 Resuming from checkpoint: ${checkpoint.lastProcessedIndex} items processed`)
          }
        }

        // Step 1: Get all products with enhanced error handling
        console.log('📊 Starting product fetch...')
        progress.status = 'scanning'
        progress.currentStep = 'Fetching products from database with validation'
        await sendProgressUpdate(progress)

        console.log('🔍 Querying products table...')
        const { data: products, error: productsError } = await circuitBreaker.execute(async () => {
          return await supabaseClient
            .from('products')
            .select(`
              id, 
              sku, 
              name,
              categories!inner(name)
            `)
            .not('sku', 'is', null)
            .not('name', 'is', null)
            .eq('is_active', true)
            .limit(10000)
        })

        if (productsError) {
          console.error('❌ Products fetch failed:', productsError)
          await logMessage('error', `Failed to fetch products: ${productsError.message}`)
          throw new MigrationError(`Failed to fetch products: ${productsError.message}`, 'DB_ERROR')
        }

        // Transform and validate products
        const transformedProducts = products?.filter((p: any) => p && p.sku && p.name).map((p: any) => ({
          ...p,
          category_name: p.categories?.name
        })) || []

        if (transformedProducts.length === 0) {
          throw new MigrationError('No valid products found', 'NO_PRODUCTS')
        }

        console.log(`✅ Found ${transformedProducts.length} valid products with SKUs`)
        await logMessage('info', `Found ${transformedProducts.length} valid products with SKUs (enhanced matching enabled)`)

        // Step 2: Enhanced storage scanning with better error handling
        console.log(`🔍 Starting enhanced Storage scan of ${targetFolder}...`)
        progress.currentStep = `Scanning ${targetFolder} folder with validation`
        await sendProgressUpdate(progress)

        const imageFiles: StorageImage[] = []
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        
        // Enhanced recursive folder scanning
        async function scanFolder(folderPath: string = targetFolder, depth: number = 0): Promise<void> {
          if (depth > 10) { // Prevent infinite recursion
            console.warn(`⚠️ Maximum depth reached for folder: ${folderPath}`)
            return
          }
          
          let offset = 0
          const limit = 500 // Smaller chunks for better reliability
          let hasMore = true
          let retryCount = 0
          const maxRetries = 3
          
          while (hasMore && retryCount < maxRetries) {
            try {
              const { data: storageFiles, error: storageError } = await circuitBreaker.execute(async () => {
                return await supabaseClient.storage
                  .from('product-images')
                  .list(folderPath, {
                    limit,
                    offset,
                    sortBy: { column: 'name', order: 'asc' }
                  })
              })

              if (storageError) {
                console.error(`❌ Error accessing storage folder ${folderPath}:`, storageError)
                throw new MigrationError(`Storage access failed: ${storageError.message}`, 'STORAGE_ERROR', true)
              }

              if (!storageFiles || storageFiles.length === 0) {
                hasMore = false
                break
              }

              console.log(`📂 Scanning folder ${folderPath}, batch ${Math.floor(offset/limit) + 1}: found ${storageFiles.length} items`)

              for (const file of storageFiles) {
                if (!file?.name) continue
                
                const fullPath = folderPath === targetFolder ? file.name : `${folderPath}/${file.name}`
                
                // Enhanced directory detection
                if (!file.metadata && file.name && !file.name.includes('.') && depth < 10) {
                  await scanFolder(`${folderPath}/${file.name}`, depth + 1)
                  continue
                }
                
                // Enhanced image detection
                const isImage = (file.metadata?.mimetype?.startsWith('image/') || 
                               file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/)) &&
                               file.metadata?.size > 1000 // Minimum file size filter
                
                if (isImage) {
                  const skus = extractSKUFromFilename(file.name)
                  if (skus.length > 0) {
                    const storagePath = fullPath.startsWith(`${targetFolder}/`) 
                      ? fullPath 
                      : `${targetFolder}/${fullPath.replace(`${targetFolder}/`, '')}`
                    
                    imageFiles.push({
                      filename: file.name,
                      sku: skus[0],
                      storagePath,
                      metadata: { ...file.metadata || {}, allSkus: skus }
                    })
                    console.log(`📎 Found image: ${file.name} -> SKUs: [${skus.join(', ')}]`)
                  } else {
                    console.log(`⚠️ Skipping image without extractable SKU: ${file.name}`)
                  }
                }
              }
              
              if (storageFiles.length < limit) {
                hasMore = false
              } else {
                offset += limit
                await new Promise(resolve => setTimeout(resolve, 200)) // Longer delay for stability
              }
              
              retryCount = 0 // Reset retry count on success
              
            } catch (error) {
              retryCount++
              console.error(`❌ [SCAN_ERROR] Error scanning folder ${folderPath} (attempt ${retryCount}/${maxRetries}):`, error)
              
              if (retryCount >= maxRetries) {
                await logMessage('error', `Failed to scan folder ${folderPath} after ${maxRetries} attempts: ${(error as Error).message}`)
                hasMore = false
              } else {
                // Exponential backoff
                const delay = Math.pow(2, retryCount) * 1000
                await new Promise(resolve => setTimeout(resolve, delay))
              }
            }
          }
        }
        
        await scanFolder()
        
        console.log(`📊 Found ${imageFiles.length} processable images with SKUs`)
        await logMessage('info', `Found ${imageFiles.length} valid images in storage ${targetFolder} folder`)

        if (imageFiles.length === 0) {
          throw new MigrationError('No valid images found in storage', 'NO_IMAGES')
        }

        // Step 3: Build enhanced image mapping
        console.log(`🧠 Building enhanced ${enableCategoryMatching ? 'category-aware' : 'legacy'} image matcher`)
        const imageMatcher = createCategoryAwareImageMatcher()
        imageMatcher.buildMapping(imageFiles)
        
        const matcherStats = imageMatcher.getStats()
        console.log(`✅ Enhanced mapping built: ${matcherStats.directMappings} direct, ${matcherStats.fuzzyVariations} fuzzy variants`)
        await logMessage('info', `Enhanced image mapping: ${matcherStats.directMappings} direct mappings, ${matcherStats.fuzzyVariations} fuzzy variations`)

        // Step 4: Enhanced product-image matching with prioritized exact matching
        progress.total = transformedProducts.length
        progress.currentStep = 'Enhanced PRIORITIZED matching: Exact SKU matches first, then fuzzy fallback'
        await sendProgressUpdate(progress)
        
        await logMessage('info', `🔍 [MATCHING] Starting enhanced PRIORITIZED matching process`)

        const matchedProducts: Array<{product: Product, imageFile: StorageImage}> = []
        let exactMatches = 0
        let fuzzyMatches = 0
        let categoryMatches = 0
        
        // Enhanced batch processing with checkpoints
        const processingBatchSize = Math.min(50, batchSize * 10) // Adjust batch size
        for (let batchStart = 0; batchStart < transformedProducts.length; batchStart += processingBatchSize) {
          const batchEnd = Math.min(batchStart + processingBatchSize, transformedProducts.length)
          const batch = transformedProducts.slice(batchStart, batchEnd)
          
          console.log(`🔄 [MATCHING_BATCH] Processing batch ${Math.floor(batchStart/processingBatchSize) + 1}/${Math.ceil(transformedProducts.length/processingBatchSize)} (${batch.length} products)`)
          await logMessage('info', `🔄 [MATCHING_BATCH] Processing batch ${Math.floor(batchStart/processingBatchSize) + 1}/${Math.ceil(transformedProducts.length/processingBatchSize)}`)

          for (const product of batch) {
            try {
              if (!product?.sku) {
                console.warn(`⚠️ Skipping product without SKU:`, product)
                continue
              }

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
                
                console.log(`✅ [${bestMatch.matchType.toUpperCase()}] ${product.sku} -> ${bestMatch.imageFile.filename} (score: ${bestMatch.matchScore})`)
              } else {
                console.log(`❌ [NO_MATCH] No image found for SKU: ${product.sku}`)
              }
            } catch (error) {
              console.error(`❌ [ERROR] Matching product ${product?.sku || 'unknown'}:`, error)
              await logMessage('error', `Failed to match product ${product?.sku || 'unknown'}: ${(error as Error).message}`)
            }
          }

          // Save checkpoint
          if (checkpointManager) {
            const processedIds = transformedProducts.slice(0, batchEnd).map((p: any) => p.id)
            await checkpointManager.saveCheckpoint(sessionId, processedIds, batchEnd)
          }

          // Delay between batches
          if (batchEnd < transformedProducts.length) {
            await new Promise(resolve => setTimeout(resolve, 150))
          }
        }
        
        const totalMatches = exactMatches + fuzzyMatches + categoryMatches
        console.log(`📊 [SUMMARY] Enhanced matching complete: ${exactMatches} exact + ${fuzzyMatches} fuzzy + ${categoryMatches} category = ${totalMatches} total matches`)
        await logMessage('info', `📊 [SUMMARY] Enhanced matching complete: ${totalMatches} total matches from ${imageFiles.length} images`)

        progress.total = matchedProducts.length
        await sendProgressUpdate(progress)

        // Step 5: Enhanced product processing with improved error handling
        await logMessage('info', `Starting enhanced migration of ${matchedProducts.length} matched products`)
        
        if (matchedProducts.length === 0) {
          await logMessage('warn', 'No products to migrate - check SKU matching logic')
          progress.status = 'completed'
          progress.currentStep = 'No products matched - migration completed'
          await sendProgressUpdate(progress)
          return
        }
        
        // Process in smaller, more reliable batches
        for (let i = 0; i < matchedProducts.length; i += batchSize) {
          const batch = matchedProducts.slice(i, Math.min(i + batchSize, matchedProducts.length))
          const batchNumber = Math.floor(i / batchSize) + 1
          const totalBatches = Math.ceil(matchedProducts.length / batchSize)
          
          await logMessage('info', `Processing enhanced batch ${batchNumber}/${totalBatches}`)
          
          // Process batch with enhanced error handling
          for (const { product, imageFile } of batch) {
            let retryCount = 0
            const maxRetries = 2
            
            while (retryCount <= maxRetries) {
              try {
                progress.currentFile = `${product.sku} (${imageFile.filename})`
                await sendProgressUpdate(progress)
                
                console.log(`🔄 [PROCESSING] Product: ${product.name} (${product.sku}) -> Image: ${imageFile.filename}`)

                // Check if product already has an image
                const { data: existingImages } = await circuitBreaker.execute(async () => {
                  return await supabaseClient
                    .from('product_images')
                    .select('id')
                    .eq('product_id', product.id)
                    .limit(1)
                })

                if (existingImages && existingImages.length > 0) {
                  console.log(`⏭️ [SKIP] ${product.sku} already has ${existingImages.length} image(s)`)
                  progress.processed++
                  progress.successful++
                  await sendProgressUpdate(progress)
                  break // Exit retry loop
                }

                // Validate image URL
                const imageUrl = `${supabaseUrl}/storage/v1/object/public/product-images/${imageFile.storagePath}`
                
                console.log(`🔗 [LINKING] Product: ${product.name} (${product.sku})`)
                console.log(`🔗 [LINKING] Image URL: ${imageUrl}`)
                
                const { error: insertError } = await circuitBreaker.execute(async () => {
                  return await supabaseClient
                    .from('product_images')
                    .insert({
                      product_id: product.id,
                      image_url: imageUrl,
                      alt_text: `${product.name} product image`,
                      sort_order: 0,
                      is_primary: true
                    })
                })

                if (insertError) {
                  throw new MigrationError(`Failed to insert image for ${product.sku}: ${insertError.message}`, 'DB_INSERT_ERROR', true)
                }

                console.log(`✅ [SUCCESS] Successfully linked ${product.sku} to ${imageFile.filename}`)
                await logMessage('info', `✅ [SUCCESS] ${product.sku} successfully linked to ${imageFile.filename}`)
                progress.successful++
                progress.processed++
                await sendProgressUpdate(progress)
                break // Exit retry loop on success

              } catch (error) {
                retryCount++
                console.error(`❌ [PROCESSING_ERROR] Error processing ${product.sku} (attempt ${retryCount}/${maxRetries + 1}):`, error)
                
                if (retryCount > maxRetries) {
                  await logMessage('error', `❌ [FINAL_ERROR] Failed to process ${product.sku} after ${maxRetries + 1} attempts: ${(error as Error).message}`)
                  progress.failed++
                  progress.errors.push(`${product.sku}: ${(error as Error).message}`)
                  progress.processed++
                  await sendProgressUpdate(progress)
                } else {
                  // Wait before retry
                  await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
                }
              }
            }
          }

          // Longer delay between batches for stability
          if (i + batchSize < matchedProducts.length) {
            await new Promise(resolve => setTimeout(resolve, 300))
          }
        }

        // Final status update
        progress.status = 'completed'
        progress.currentStep = `Enhanced migration completed: ${progress.successful} successful, ${progress.failed} failed`
        await sendProgressUpdate(progress)

        const endTime = new Date().toISOString()
        const duration = new Date(endTime).getTime() - new Date(startTime).getTime()
        
        console.log(`🎉 [COMPLETED] Enhanced migration finished in ${Math.round(duration / 1000)}s`)
        console.log(`🎉 [FINAL_STATS] Processed: ${progress.processed}, Success: ${progress.successful}, Failed: ${progress.failed}`)
        await logMessage('info', `🎉 [COMPLETED] Enhanced migration completed in ${Math.round(duration / 1000)}s - Success: ${progress.successful}, Failed: ${progress.failed}`)
        
      } catch (error) {
        console.error('❌ [FATAL_ERROR] Enhanced migration failed:', error)
        progress.status = 'error'
        progress.currentStep = `Error: ${(error as Error).message}`
        progress.errors.push((error as Error).message)
        await sendProgressUpdate(progress)
        await logMessage('error', `Enhanced migration failed: ${(error as Error).message}`)
      }
    }

  } catch (error) {
    console.error('❌ Enhanced migration failed:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: (error as Error).message,
      sessionId,
      results: { processed: 0, successful: 0, failed: 0, errors: [(error as Error).message] }
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 500 
    })
  }
})