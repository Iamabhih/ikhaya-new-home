import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RepairResult {
  status: 'success' | 'error';
  productsScanned: number;
  imagesScanned: number;
  linksCreated: number;
  candidatesCreated: number;
  errors: string[];
  processingTime: number;
}

// Comprehensive SKU extraction with multiple variants support
function extractAllSKUs(filename: string, fullPath?: string): Array<{sku: string, confidence: number, source: string}> {
  const skus: Array<{sku: string, confidence: number, source: string}> = [];
  const clean = filename.replace(/\.(jpg|jpeg|png|gif|webp|bmp|svg|tiff?)$/i, '');
  
  console.log(`🔍 Extracting SKUs from: ${filename} → ${clean}`);
  
  // Strategy 1: Direct numeric match (highest confidence)
  if (/^\d{3,8}$/.test(clean)) {
    skus.push({ sku: clean, confidence: 100, source: 'exact_numeric' });
    
    // Add zero-padding variations
    if (clean.length === 5 && !clean.startsWith('0')) {
      skus.push({ sku: '0' + clean, confidence: 95, source: 'zero_padded' });
    }
    if (clean.startsWith('0') && clean.length > 3) {
      const trimmed = clean.replace(/^0+/, '');
      if (trimmed.length >= 3) {
        skus.push({ sku: trimmed, confidence: 95, source: 'trimmed_zeros' });
      }
    }
  }
  
  // Strategy 2: Multi-SKU patterns (dot separated, dash separated, underscore separated)
  const multiSkuPatterns = [
    /^(\d{3,8}(?:[\.\-_]\d{3,8})+)[\.\-_]?.*$/,  // Multiple SKUs with separators
    /(\d{3,8})\.(\d{3,8})\.?.*$/,                  // Dot separated SKUs
    /(\d{3,8})\-(\d{3,8})\-?.*$/,                  // Dash separated SKUs
    /(\d{3,8})_(\d{3,8})_?.*$/                     // Underscore separated SKUs
  ];
  
  for (const pattern of multiSkuPatterns) {
    const match = clean.match(pattern);
    if (match) {
      const allNumbers = clean.match(/\d{3,8}/g) || [];
      allNumbers.forEach((sku, index) => {
        if (!skus.find(s => s.sku === sku)) {
          const confidence = Math.max(90 - (index * 5), 70);
          skus.push({ sku, confidence, source: 'multi_sku' });
        }
      });
      break;
    }
  }
  
  // Strategy 3: Mixed content patterns
  const patterns = [
    /^(\d{3,8})[a-zA-Z\-_]+.*$/,     // SKU with suffix
    /^.*[a-zA-Z\-_]+(\d{3,8})$/,     // SKU with prefix  
    /(\d{3,8})/g                      // Any numeric sequence
  ];
  
  patterns.forEach((pattern, index) => {
    const matches = [...clean.matchAll(pattern)];
    matches.forEach(match => {
      const sku = match[1] || match[0].replace(/[^0-9]/g, '');
      if (/^\d{3,8}$/.test(sku) && !skus.find(s => s.sku === sku)) {
        const confidence = Math.max(80 - (index * 10), 50);
        skus.push({ sku, confidence, source: 'pattern_match' });
      }
    });
  });
  
  // Strategy 4: Path-based extraction
  if (fullPath && skus.length === 0) {
    const pathParts = fullPath.split('/');
    pathParts.forEach(part => {
      if (/^\d{3,8}$/.test(part) && !skus.find(s => s.sku === part)) {
        skus.push({ sku: part, confidence: 60, source: 'path_numeric' });
      }
    });
  }
  
  const finalSkus = skus.sort((a, b) => b.confidence - a.confidence);
  console.log(`📊 Extracted ${finalSkus.length} SKUs:`, finalSkus.map(s => `${s.sku}(${s.confidence}%)`));
  
  return finalSkus;
}

// Enhanced product matching with multiple variants
function findMatchingProducts(sku: string, allProducts: any[]): any[] {
  const matches = [];
  const normalizedSKU = sku.replace(/^0+/, '') || sku;
  
  for (const product of allProducts) {
    const productSKU = product.sku?.replace(/^0+/, '') || product.sku;
    
    // Exact matches
    if (product.sku === sku || productSKU === normalizedSKU) {
      matches.push({ product, matchType: 'exact', confidence: 100 });
      continue;
    }
    
    // Zero padding variations
    if (product.sku === '0' + sku || sku === '0' + product.sku) {
      matches.push({ product, matchType: 'zero_padded', confidence: 95 });
      continue;
    }
    
    // Contains matches (for longer SKUs)
    if (product.sku?.includes(sku) || sku.includes(product.sku || '')) {
      if (product.sku && product.sku.length >= 4 && sku.length >= 4) {
        matches.push({ product, matchType: 'contains', confidence: 80 });
      }
    }
  }
  
  return matches.sort((a, b) => b.confidence - a.confidence);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const result: RepairResult = {
    status: 'success',
    productsScanned: 0,
    imagesScanned: 0,
    linksCreated: 0,
    candidatesCreated: 0,
    errors: [],
    processingTime: 0
  };

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🚀 Starting optimized image repair with reset...');
    
    // Reset previous auto-matched entries for fresh scan
    console.log('🔄 Resetting previous auto-matched entries...');
    const { error: resetError } = await supabase
      .from('product_images')
      .delete()
      .eq('auto_matched', true);
    
    if (resetError) {
      console.warn('⚠️ Reset warning:', resetError.message);
    } else {
      console.log('✅ Reset completed');
    }

    // Step 1: Get ALL active products (no limits)
    console.log('📦 Fetching ALL products...');
    let allProducts = [];
    let offset = 0;
    const batchSize = 1000;
    
    while (true) {
      const { data: productBatch, error: productsError } = await supabase
        .from('products')
        .select('id, sku, name')
        .eq('is_active', true)
        .not('sku', 'is', null)
        .range(offset, offset + batchSize - 1);
      
      if (productsError) {
        throw new Error(`Failed to fetch products: ${productsError.message}`);
      }
      
      if (!productBatch || productBatch.length === 0) break;
      
      allProducts.push(...productBatch);
      offset += batchSize;
      
      console.log(`📦 Loaded ${allProducts.length} products so far...`);
      
      if (productBatch.length < batchSize) break;
    }

    // Get current image links to identify products without images
    const { data: productImages } = await supabase
      .from('product_images')
      .select('product_id')
      .eq('image_status', 'active');

    const linkedProductIds = new Set(productImages?.map(pi => pi.product_id) || []);
    const productsWithoutImages = allProducts.filter(p => !linkedProductIds.has(p.id));
    
    result.productsScanned = allProducts.length;
    console.log(`📊 Total products: ${allProducts.length}, without images: ${productsWithoutImages.length}`);

    // Step 2: Get ALL storage images (no limits)
    console.log('📁 Scanning ALL storage images...');
    const images = [];
    offset = 0;
    const storageBatchSize = 200;

    while (true) {
      try {
        const { data: batch, error } = await supabase.storage
          .from('product-images')
          .list('', { 
            limit: storageBatchSize,
            offset,
            sortBy: { column: 'name', order: 'asc' }
          });

        if (error) {
          console.error(`Storage error at offset ${offset}:`, error);
          break;
        }

        if (!batch || batch.length === 0) break;

        // Filter for image files only
        const imageFiles = batch.filter(file => 
          file.name && file.name.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg|tiff?)$/i)
        );
        
        images.push(...imageFiles);
        offset += storageBatchSize;
        
        console.log(`📁 Loaded ${images.length} images so far...`);

        if (batch.length < storageBatchSize) break;

        // Small delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));

      } catch (error) {
        console.error(`Storage scan error:`, error);
        result.errors.push(`Storage scan failed: ${error.message}`);
        break;
      }
    }

    result.imagesScanned = images.length;
    console.log(`📁 Total images scanned: ${result.imagesScanned}`);

    // Step 3: Process ALL images for multiple SKU associations
    console.log('🔄 Processing images for multiple SKU associations...');
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      
      try {
        const extractedSKUs = extractAllSKUs(image.name, image.name);
        if (extractedSKUs.length === 0) continue;
        
        // Check each extracted SKU for potential matches
        for (const skuData of extractedSKUs) {
          const matches = findMatchingProducts(skuData.sku, allProducts);
          
          for (const match of matches) {
            const { product, confidence: matchConfidence } = match;
            const finalConfidence = Math.min(skuData.confidence, matchConfidence);
            
            // Check if this product already has an image
            const { data: existingLink } = await supabase
              .from('product_images')
              .select('id')
              .eq('product_id', product.id)
              .eq('image_status', 'active')
              .limit(1);

            if (existingLink && existingLink.length > 0) continue;

            const imageUrl = supabase.storage
              .from('product-images')
              .getPublicUrl(image.name).data.publicUrl;

            if (finalConfidence >= 85) {
              // Create direct link for high confidence
              const { error: linkError } = await supabase
                .from('product_images')
                .insert({
                  product_id: product.id,
                  image_url: imageUrl,
                  alt_text: `${product.name} - ${image.name}`,
                  image_status: 'active',
                  is_primary: true,
                  sort_order: 1,
                  match_confidence: finalConfidence,
                  match_metadata: {
                    filename: image.name,
                    extraction_method: skuData.source,
                    match_type: match.matchType,
                    sku_extracted: skuData.sku,
                    session_id: crypto.randomUUID()
                  },
                  auto_matched: true
                });

              if (!linkError) {
                result.linksCreated++;
                console.log(`✅ Linked: ${image.name} → ${product.sku} (${finalConfidence}%)`);
                break; // Move to next image after successful link
              } else if (linkError.code !== '23505') {
                result.errors.push(`Link error: ${linkError.message}`);
              }
            } else if (finalConfidence >= 70) {
              // Create candidate for manual review
              const { error: candidateError } = await supabase
                .from('product_image_candidates')
                .insert({
                  product_id: product.id,
                  image_url: imageUrl,
                  alt_text: `${product.name} - ${image.name}`,
                  match_confidence: finalConfidence,
                  match_metadata: {
                    filename: image.name,
                    extraction_method: skuData.source,
                    match_type: match.matchType,
                    sku_extracted: skuData.sku,
                    session_id: crypto.randomUUID()
                  },
                  status: 'pending'
                });

              if (!candidateError) {
                result.candidatesCreated++;
                console.log(`📋 Candidate: ${image.name} → ${product.sku} (${finalConfidence}%)`);
              } else if (candidateError.code !== '23505') {
                result.errors.push(`Candidate error: ${candidateError.message}`);
              }
            }
          }
        }

        // Progress logging every 100 images
        if (i % 100 === 0 && i > 0) {
          console.log(`🔄 Progress: ${i}/${images.length} images processed`);
        }

        // Rate limiting - small delay every 10 operations
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 25));
        }

      } catch (error) {
        console.error(`Error processing ${image.name}:`, error);
        result.errors.push(`Processing error for ${image.name}: ${error.message}`);
      }
    }

    result.processingTime = Date.now() - startTime;
    console.log(`✅ Repair completed in ${result.processingTime}ms`);
    console.log(`📊 Results: ${result.linksCreated} links, ${result.candidatesCreated} candidates, ${result.errors.length} errors`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('❌ Fatal error:', error);
    result.status = 'error';
    result.errors.push(`Fatal error: ${error.message}`);
    result.processingTime = Date.now() - startTime;

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});