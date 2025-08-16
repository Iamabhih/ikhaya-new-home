// supabase/functions/link-product-images/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExtractedSKU {
  value: string;
  confidence: number;
  source: 'exact' | 'numeric' | 'multi' | 'path' | 'pattern' | 'fuzzy';
}

// Enhanced SKU extraction function - identical to frontend version
function extractSKUs(filename: string, fullPath?: string): ExtractedSKU[] {
  const skus: ExtractedSKU[] = [];
  
  if (!filename || typeof filename !== 'string') return skus;
  
  // Clean filename - remove extension and trim
  const nameWithoutExt = filename.replace(/\.(jpg|jpeg|png|gif|webp|bmp|svg|tiff?)$/i, '');
  const cleanName = nameWithoutExt.trim();
  
  console.log(`Extracting SKUs from: ${filename} (clean: ${cleanName})`);
  
  // 1. EXACT MATCH - Pure numeric filename (highest confidence)
  if (/^\d{3,8}$/.test(cleanName)) {
    skus.push({
      value: cleanName,
      confidence: 100,
      source: 'exact'
    });
    
    // Add zero-padded variations for 5-digit numbers
    if (cleanName.length === 5 && !cleanName.startsWith('0')) {
      skus.push({
        value: '0' + cleanName,
        confidence: 95,
        source: 'exact'
      });
    }
    
    // Remove leading zeros
    if (cleanName.startsWith('0') && cleanName.length > 3) {
      skus.push({
        value: cleanName.substring(1),
        confidence: 95,
        source: 'exact'
      });
    }
  }
  
  // 2. MULTI-SKU FILES (e.g., "445033.446723.png", "319027.319026.PNG")
  const multiSkuMatch = cleanName.match(/^(\d{3,8})(?:[._-](\d{3,8}))+$/);
  if (multiSkuMatch) {
    console.log(`Found multi-SKU pattern in ${cleanName}`);
    const allNumbers = cleanName.match(/\d{3,8}/g) || [];
    allNumbers.forEach((num, index) => {
      skus.push({
        value: num,
        confidence: 90 - (index * 5), // First SKU has higher confidence
        source: 'multi'
      });
    });
  }
  
  // 3. NUMERIC PATTERNS anywhere in filename (should be early for broader matching)
  const numericMatches = cleanName.match(/\b\d{3,8}\b/g) || [];
  if (numericMatches.length > 0) {
    numericMatches.forEach(num => {
      // Check if not already added with higher confidence
      if (!skus.some(s => s.value === num && s.confidence >= 70)) {
        let confidence = 70;
        
        // Boost confidence based on position and context
        if (cleanName === num) confidence = 100; // Pure numeric
        else if (cleanName.startsWith(num)) confidence = 85;
        else if (numericMatches.length === 1) confidence = 80;
        else if (cleanName.endsWith(num)) confidence = 75;
        
        skus.push({
          value: num,
          confidence,
          source: 'numeric'
        });
      }
    });
  }
  
  // 4. PATH-BASED EXTRACTION
  if (fullPath) {
    const pathParts = fullPath.split('/').filter(p => p && p !== filename);
    pathParts.forEach(part => {
      // Check if folder name is a pure number
      if (/^\d{3,8}$/.test(part)) {
        if (!skus.some(s => s.value === part)) {
          skus.push({
            value: part,
            confidence: 70,
            source: 'path'
          });
        }
      }
      
      // Extract numbers from folder names
      const pathNumbers = part.match(/\b\d{3,8}\b/g) || [];
      pathNumbers.forEach(num => {
        if (!skus.some(s => s.value === num)) {
          skus.push({
            value: num,
            confidence: 65,
            source: 'path'
          });
        }
      });
    });
  }
  
  // 5. PATTERN EXTRACTION (SKU-123456, ITEM_123456, etc.)
  const patterns = [
    /(?:SKU|sku|ITEM|item|PRODUCT|product|PROD|prod)[_\-\s]?(\d{3,8})/g,
    /[A-Z]{2,}[_\-]?(\d{3,8})/g, // XX-123456 patterns
    /(\d{3,8})[_\-][A-Za-z]+/g,   // 123456-variant patterns
    /\[(\d{3,8})\]/g,             // [123456] patterns
    /\((\d{3,8})\)/g,             // (123456) patterns
    /^(\d{3,8})[_\-]/g,           // Starting with number
    /[_\-](\d{3,8})$/g,           // Ending with number
  ];
  
  patterns.forEach(pattern => {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(cleanName)) !== null) {
      if (match[1] && !skus.some(s => s.value === match[1])) {
        skus.push({
          value: match[1],
          confidence: 60,
          source: 'pattern'
        });
      }
    }
  });
  
  // 6. Generate variations for all found SKUs
  const uniqueSkus = new Set(skus.map(s => s.value));
  uniqueSkus.forEach(sku => {
    const variations = generateVariations(sku);
    variations.forEach(variant => {
      if (!skus.some(s => s.value === variant)) {
        skus.push({ value: variant, confidence: 50, source: 'fuzzy' });
      }
    });
  });
  
  // Remove duplicates and sort by confidence
  const uniqueResults = new Map<string, ExtractedSKU>();
  skus.forEach(sku => {
    const existing = uniqueResults.get(sku.value);
    if (!existing || existing.confidence < sku.confidence) {
      uniqueResults.set(sku.value, sku);
    }
  });
  
  const result = Array.from(uniqueResults.values())
    .sort((a, b) => b.confidence - a.confidence);
  
  if (result.length > 0) {
    console.log(`Extracted ${result.length} SKUs from ${filename}: ${result.slice(0, 3).map(s => `${s.value}(${s.confidence}%)`).join(', ')}`);
  }
  
  return result;
}

function generateVariations(sku: string): string[] {
  const variations = new Set<string>();
  const normalized = sku.toLowerCase().trim();
  
  if (/^\d+$/.test(normalized)) {
    // Add leading zeros
    if (normalized.length === 3) {
      variations.add('0' + normalized);
      variations.add('00' + normalized);
      variations.add('000' + normalized);
    }
    if (normalized.length === 4 && !normalized.startsWith('0')) {
      variations.add('0' + normalized);
      variations.add('00' + normalized);
    }
    if (normalized.length === 5 && !normalized.startsWith('0')) {
      variations.add('0' + normalized);
    }
    
    // Remove leading zeros
    if (normalized.startsWith('0')) {
      let trimmed = normalized;
      while (trimmed.startsWith('0') && trimmed.length > 1) {
        trimmed = trimmed.substring(1);
        if (trimmed.length >= 3 && trimmed.length <= 8) {
          variations.add(trimmed);
        }
      }
    }
  }
  
  return Array.from(variations);
}

function calculateMatchScore(productSku: string, extractedSKUs: ExtractedSKU[]): number {
  if (!productSku || extractedSKUs.length === 0) return 0;
  
  const normalizedProductSku = productSku.toLowerCase().trim();
  let bestScore = 0;
  
  for (const extracted of extractedSKUs) {
    const normalizedExtracted = extracted.value.toLowerCase().trim();
    
    // Exact match
    if (normalizedProductSku === normalizedExtracted) {
      bestScore = Math.max(bestScore, extracted.confidence);
    }
    // Zero-padding variations
    else if (
      normalizedProductSku === '0' + normalizedExtracted ||
      '0' + normalizedProductSku === normalizedExtracted ||
      normalizedProductSku.replace(/^0+/, '') === normalizedExtracted.replace(/^0+/, '')
    ) {
      bestScore = Math.max(bestScore, extracted.confidence * 0.9);
    }
    // Partial match
    else if (
      normalizedProductSku.includes(normalizedExtracted) ||
      normalizedExtracted.includes(normalizedProductSku)
    ) {
      const lengthRatio = Math.min(normalizedProductSku.length, normalizedExtracted.length) / 
                        Math.max(normalizedProductSku.length, normalizedExtracted.length);
      bestScore = Math.max(bestScore, extracted.confidence * 0.7 * lengthRatio);
    }
  }
  
  return Math.round(bestScore);
}

// Batch processor with error recovery
async function processBatch<T>(
  items: T[],
  batchSize: number,
  processor: (item: T) => Promise<void>
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, Math.min(i + batchSize, items.length));
    
    const results = await Promise.allSettled(
      batch.map(item => processor(item))
    );
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        success++;
      } else {
        failed++;
        const error = `Batch item ${i + index}: ${result.reason}`;
        errors.push(error);
        console.error(error);
      }
    });
    
    // Small delay between batches
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return { success, failed, errors };
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const sessionId = crypto.randomUUID();
  console.log(`[${sessionId}] Starting image linking process`);
  
  try {
    // Parse request body for configuration
    let config = {
      bucketName: 'product-images', // Correct bucket name
      confidenceThreshold: 60,
      batchSize: 10,
      skipExisting: true,
      scanPath: '', // Root by default
      limit: 5000, // Maximum images to process
      autoSetPrimary: true
    };
    
    try {
      const body = await req.json();
      config = { ...config, ...body };
    } catch {
      console.log('No request body provided, using defaults');
    }
    
    console.log(`Configuration:`, config);
    
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    // Step 1: Get all active products with SKUs
    console.log('Step 1: Fetching products...');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, sku, name')
      .not('sku', 'is', null)
      .eq('is_active', true)
      .order('sku', { ascending: true })
      .limit(50000); // Get all products
    
    if (productsError) {
      throw new Error(`Failed to fetch products: ${productsError.message}`);
    }
    
    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          sessionId,
          stats: {
            productsFound: 0,
            imagesScanned: 0,
            matchesFound: 0,
            successfulLinks: 0,
            skipped: 0,
            errors: 0
          },
          message: 'No active products with SKUs found'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }
    
    console.log(`Found ${products.length} products with SKUs`);
    
    // Step 2: Build SKU index for fast lookup
    console.log('Step 2: Building SKU index...');
    const skuToProduct = new Map<string, any>();
    const productIndex = new Map<string, any>();
    
    products.forEach(product => {
      if (!product.sku) return;
      
      productIndex.set(product.id, product);
      
      // Store original SKU (normalized)
      const normalizedSku = product.sku.toLowerCase().trim();
      skuToProduct.set(normalizedSku, product);
      
      // Store variations
      const variations = generateVariations(product.sku);
      variations.forEach(variant => {
        const normalizedVariant = variant.toLowerCase().trim();
        if (!skuToProduct.has(normalizedVariant)) {
          skuToProduct.set(normalizedVariant, product);
        }
      });
    });
    
    console.log(`Built SKU index with ${skuToProduct.size} entries`);
    
    // Step 3: Get products that already have images (if skipExisting)
    let productsWithImages = new Set<string>();
    if (config.skipExisting) {
      console.log('Fetching products that already have images...');
      const { data: existingImages, error: existingError } = await supabase
        .from('product_images')
        .select('product_id')
        .eq('is_primary', true);
      
      if (!existingError && existingImages) {
        productsWithImages = new Set(existingImages.map(img => img.product_id));
        console.log(`Found ${productsWithImages.size} products with existing images`);
      }
    }
    
    // Step 4: Scan storage bucket
    console.log(`Step 3: Scanning storage bucket: ${config.bucketName}/${config.scanPath}`);
    
    const allImages: Array<{
      filename: string;
      path: string;
      extractedSkus: ExtractedSKU[];
      matchedProduct?: any;
      matchScore?: number;
    }> = [];
    
    // Recursive function to scan folders
    async function scanFolder(path: string = '', depth: number = 0): Promise<void> {
      if (depth > 10) {
        console.warn(`Max depth reached at path: ${path}`);
        return;
      }
      
      let offset = 0;
      let hasMore = true;
      const scanLimit = 100;
      
      while (hasMore && allImages.length < config.limit) {
        try {
          const { data: files, error: listError } = await supabase.storage
            .from(config.bucketName)
            .list(path, {
              limit: scanLimit,
              offset,
              sortBy: { column: 'name', order: 'asc' }
            });
          
          if (listError) {
            console.error(`Error listing files in ${path}:`, listError);
            break;
          }
          
          if (!files || files.length === 0) {
            hasMore = false;
            break;
          }
          
          console.log(`Scanning ${path || 'root'}: found ${files.length} items (offset: ${offset})`);
          
          for (const file of files) {
            if (!file.name) continue;
            
            const fullPath = path ? `${path}/${file.name}` : file.name;
            
            // Check if it's a directory (no metadata and no extension)
            const isDirectory = !file.id && !file.metadata && !file.name.includes('.');
            
            if (isDirectory) {
              console.log(`Found subdirectory: ${fullPath}`);
              await scanFolder(fullPath, depth + 1);
              continue;
            }
            
            // Check if it's an image
            if (file.name.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)) {
              const extractedSkus = extractSKUs(file.name, fullPath);
              
              // Always add image to list, even if no SKUs extracted initially
              // This ensures we don't miss images due to extraction failures
              allImages.push({
                filename: file.name,
                path: fullPath,
                extractedSkus: extractedSkus.length > 0 ? extractedSkus : [
                  // Fallback: try simple numeric extraction like storage scanner
                  ...((file.name.match(/\b\d{4,6}\b/g) || []).map(num => ({
                    value: num,
                    confidence: 50,
                    source: 'fallback' as const
                  })))
                ]
              });
              
              if (allImages.length >= config.limit) {
                console.log(`Reached image limit of ${config.limit}`);
                break;
              }
            }
          }
          
          offset += scanLimit;
          if (files.length < scanLimit) {
            hasMore = false;
          }
          
          // Small delay to prevent API overload
          if (hasMore) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        } catch (error) {
          console.error(`Error scanning folder ${path}:`, error);
          hasMore = false;
        }
      }
    }
    
    await scanFolder(config.scanPath);
    
    console.log(`Found ${allImages.length} images with potential SKUs`);
    
    // Step 5: Match images to products
    console.log('Step 4: Matching images to products...');
    const matches: Array<{
      product: any;
      image: any;
      score: number;
    }> = [];
    
    for (const image of allImages) {
      let bestMatch = null;
      let bestScore = 0;
      
      // Try to find matching product using extracted SKUs
      for (const extracted of image.extractedSkus) {
        const normalizedSku = extracted.value.toLowerCase().trim();
        const product = skuToProduct.get(normalizedSku);
        
        if (product) {
          const score = extracted.confidence;
          
          if (score > bestScore) {
            bestScore = score;
            bestMatch = product;
          }
        }
      }
      
      // Alternative: Check all products for fuzzy match (if no direct match found)
      if (!bestMatch && config.confidenceThreshold < 100) {
        for (const product of products) {
          const score = calculateMatchScore(product.sku, image.extractedSkus);
          
          if (score > bestScore && score >= config.confidenceThreshold) {
            bestScore = score;
            bestMatch = product;
          }
        }
      }
      
      if (bestMatch && bestScore >= config.confidenceThreshold) {
        // Skip if product already has images
        if (config.skipExisting && productsWithImages.has(bestMatch.id)) {
          console.log(`Skipping ${bestMatch.sku} - already has images`);
          continue;
        }
        
        matches.push({
          product: bestMatch,
          image,
          score: bestScore
        });
        
        console.log(`Matched ${bestMatch.sku} to ${image.filename} (score: ${bestScore})`);
      }
    }
    
    console.log(`Found ${matches.length} matches above ${config.confidenceThreshold}% threshold`);
    
    // Step 6: Create product_images records
    console.log('Step 5: Creating product image records...');
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    // Process in batches for better performance
    const batchResults = await processBatch(
      matches,
      config.batchSize,
      async (match) => {
        // Check if this specific image is already linked
        const { data: existing } = await supabase
          .from('product_images')
          .select('id')
          .eq('product_id', match.product.id)
          .eq('image_url', `${supabaseUrl}/storage/v1/object/public/${config.bucketName}/${match.image.path}`)
          .maybeSingle();
        
        if (existing) {
          skipCount++;
          console.log(`Image already linked for ${match.product.sku}`);
          return;
        }
        
        // Check if product needs a primary image
        const { data: hasPrimary } = await supabase
          .from('product_images')
          .select('id')
          .eq('product_id', match.product.id)
          .eq('is_primary', true)
          .maybeSingle();
        
        // Generate public URL
        const imageUrl = `${supabaseUrl}/storage/v1/object/public/${config.bucketName}/${match.image.path}`;
        
        // Insert product_image record
        const { error: insertError } = await supabase
          .from('product_images')
          .insert({
            product_id: match.product.id,
            image_url: imageUrl,
            alt_text: `${match.product.name} - ${match.product.sku}`,
            is_primary: config.autoSetPrimary && !hasPrimary,
            sort_order: 0
          });
        
        if (insertError) {
          throw new Error(`Failed to insert image for ${match.product.sku}: ${insertError.message}`);
        }
        
        console.log(`Successfully linked ${match.product.sku} to ${match.image.filename}`);
      }
    );
    
    successCount = batchResults.success;
    errorCount = batchResults.failed;
    errors.push(...batchResults.errors.slice(0, 100)); // Limit errors to 100
    
    // Final result
    const result = {
      success: true,
      sessionId,
      stats: {
        productsFound: products.length,
        productsWithExistingImages: productsWithImages.size,
        imagesScanned: allImages.length,
        matchesFound: matches.length,
        successfulLinks: successCount,
        skipped: skipCount,
        errors: errorCount
      },
      errors: errors.slice(0, 10), // Return first 10 errors
      message: `Successfully linked ${successCount} products to images (${skipCount} skipped, ${errorCount} errors)`
    };
    
    console.log(`[${sessionId}] Process completed:`, result.stats);
    
    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
    
  } catch (error: any) {
    console.error(`[${sessionId}] Fatal error:`, error);
    
    return new Response(
      JSON.stringify({
        success: false,
        sessionId,
        error: error.message,
        details: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
