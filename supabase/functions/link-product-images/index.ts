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

// Enhanced SKU extraction function - optimized version
function extractSKUs(filename: string, fullPath?: string): ExtractedSKU[] {
  const skus: ExtractedSKU[] = [];
  
  if (!filename || typeof filename !== 'string') return skus;
  
  const cleanFilename = filename.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '').trim();
  
  // Strategy 1: Exact filename match (highest confidence)
  if (/^\d{3,8}$/.test(cleanFilename)) {
    skus.push({
      value: cleanFilename,
      confidence: 100,
      source: 'exact'
    });
    
    // Add zero-padding variations
    if (cleanFilename.length >= 3 && cleanFilename.length <= 6 && !cleanFilename.startsWith('0')) {
      skus.push({
        value: '0' + cleanFilename,
        confidence: 95,
        source: 'exact'
      });
      if (cleanFilename.length <= 5) {
        skus.push({
          value: '00' + cleanFilename,
          confidence: 90,
          source: 'exact'
        });
      }
    }
    
    // Remove leading zeros variation
    if (cleanFilename.startsWith('0') && cleanFilename.length > 3) {
      const trimmed = cleanFilename.replace(/^0+/, '');
      if (trimmed.length >= 3) {
        skus.push({
          value: trimmed,
          confidence: 95,
          source: 'exact'
        });
      }
    }
  }

  // Strategy 2: Multiple SKUs in filename (e.g., "20729.20730.453443.png")
  const multiSkuPattern = /^(\d+(?:\.\d+)+)$/;
  const multiSkuMatch = cleanFilename.match(multiSkuPattern);
  if (multiSkuMatch) {
    const potentialSkus = cleanFilename.split('.');
    potentialSkus.forEach((sku, index) => {
      if (/^\d{3,}$/.test(sku) && !skus.find(s => s.value === sku)) {
        skus.push({
          value: sku,
          confidence: 85 - (index * 5),
          source: 'multi'
        });
      }
    });
  }

  // Strategy 3: Enhanced SKU extraction patterns
  const enhancedPatterns = [
    // Direct numeric patterns (prioritized)
    /\b(\d{3,8})\b/g,
    // Prefixed patterns
    /(?:IMG_|PHOTO_|PIC_|PROD_|SKU_)(\d{3,8})/gi,
    // Suffixed patterns  
    /(\d{3,8})(?:_\d+|_[A-Z]+|\.jpg|\.png|\.jpeg)?$/i,
    // Alphanumeric patterns
    /([A-Z]+\d{3,8})/gi,
    /(\d{3,8}[A-Z]+)/gi,
    // Dot separated (like 451752.jpg becomes 451752)
    /^(\d{3,8})(?:\.|_)/,
    // Complex patterns like "Product_451752_001.jpg"
    /[Pp]roduct[_\s]*(\d{3,8})/gi,
    // Fallback: any 4-8 digit sequence
    /\b(\d{4,8})\b/g
  ];

  enhancedPatterns.forEach((pattern, index) => {
    let matches = [...cleanFilename.matchAll(pattern)];
    matches.forEach(match => {
      const potentialSku = match[1];
      if (potentialSku && /^\d{3,8}$/.test(potentialSku) && !skus.find(s => s.value === potentialSku)) {
        // Higher confidence for earlier patterns
        const confidence = Math.max(40, 90 - (index * 10));
        skus.push({
          value: potentialSku,
          confidence,
          source: 'pattern'
        });
      }
    });
  });

  // Strategy 4: Path-based extraction (e.g., "/products/ABC123/image.jpg")
  if (fullPath) {
    const pathParts = fullPath.split('/');
    pathParts.forEach(part => {
      if (/^\d{3,}$/.test(part) && !skus.find(s => s.value === part)) {
        skus.push({
          value: part,
          confidence: 75,
          source: 'path'
        });
      }
    });
  }

  return skus.sort((a, b) => b.confidence - a.confidence);
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
      confidenceThreshold: 40, // Lower threshold to catch more matches
      batchSize: 10,
      skipExisting: false, // Allow multiple images per product
      scanPath: '', // Root by default
      limit: 10000, // Increased limit for comprehensive scan
      autoSetPrimary: true,
      allowMultipleImages: true, // New flag for comprehensive galleries
      maxImagesPerProduct: 10 // Limit images per product
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
    
    // Step 3: Get products with existing images and their counts
    const productImageCounts = new Map<string, number>();
    console.log('Fetching existing product images...');
    const { data: existingImages, error: existingError } = await supabase
      .from('product_images')
      .select('product_id');
    
    if (!existingError && existingImages) {
      existingImages.forEach(img => {
        const count = productImageCounts.get(img.product_id) || 0;
        productImageCounts.set(img.product_id, count + 1);
      });
      console.log(`Found ${productImageCounts.size} products with existing images`);
    }
    
    // For skipExisting: only skip products with primary images
    let productsWithPrimaryImages = new Set<string>();
    if (config.skipExisting) {
      const { data: primaryImages, error: primaryError } = await supabase
        .from('product_images')
        .select('product_id')
        .eq('is_primary', true);
      
      if (!primaryError && primaryImages) {
        productsWithPrimaryImages = new Set(primaryImages.map(img => img.product_id));
        console.log(`Found ${productsWithPrimaryImages.size} products with primary images`);
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
        // Skip logic based on configuration
        const currentImageCount = productImageCounts.get(bestMatch.id) || 0;
        
        if (config.skipExisting && productsWithPrimaryImages.has(bestMatch.id)) {
          console.log(`Skipping ${bestMatch.sku} - already has primary image`);
          continue;
        }
        
        if (currentImageCount >= config.maxImagesPerProduct) {
          console.log(`Skipping ${bestMatch.sku} - already has ${currentImageCount} images (max: ${config.maxImagesPerProduct})`);
          continue;
        }
        
        matches.push({
          product: bestMatch,
          image,
          score: bestScore
        });
        
        // Update the count for future iterations
        productImageCounts.set(bestMatch.id, currentImageCount + 1);
        
        console.log(`✅ Exact match found: ${bestMatch.sku} (${bestScore}%) → ${bestMatch.name} (${bestMatch.sku})`);
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
        
        // High confidence matches go directly to product_images
        if (match.score >= 85) {
          const { error: insertError } = await supabase
            .from('product_images')
            .insert({
              product_id: match.product.id,
              image_url: imageUrl,
              alt_text: `${match.product.name} - ${match.image.filename}`,
              is_primary: config.autoSetPrimary && !hasPrimary,
              sort_order: 999,
              image_status: 'active',
              match_confidence: match.score,
              match_metadata: {
                source: 'auto_link',
                filename: match.image.filename,
                session_id: sessionId
              },
              auto_matched: true
            });

          if (insertError) {
            throw new Error(`Failed to insert direct match for ${match.product.sku}: ${insertError.message}`);
          }
        } else {
          // Lower confidence matches go to candidates table
          const { error: candidateError } = await supabase
            .from('product_image_candidates')
            .insert({
              product_id: match.product.id,
              image_url: imageUrl,
              alt_text: `${match.product.name} - ${match.image.filename}`,
              match_confidence: match.score,
              match_metadata: {
                source: 'auto_link',
                filename: match.image.filename,
                session_id: sessionId
              },
              extracted_sku: match.image.extractedSkus[0]?.value || '',
              source_filename: match.image.filename,
              status: 'pending'
            });

          if (candidateError) {
            throw new Error(`Failed to create candidate for ${match.product.sku}: ${candidateError.message}`);
          }
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
        productsWithExistingImages: productImageCounts.size,
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
