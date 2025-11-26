import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScanReport {
  status: 'success' | 'error';
  summary: {
    totalImages: number;
    totalProducts: number;
    linkedImages: number;
    unlinkedImages: number;
    candidatesCreated: number;
    directLinksCreated: number;
    productsWithoutImages: number;
    processingTime: number;
  };
  unlinkedImages: Array<{
    filename: string;
    extractedSKUs: string[];
    matchAttempts: number;
  }>;
  errors: string[];
}

// Advanced SKU extraction with multiple variants support
function extractAllSKUs(filename: string): Array<{sku: string, confidence: number, source: string}> {
  const skus: Array<{sku: string, confidence: number, source: string}> = [];
  const clean = filename.replace(/\.(jpg|jpeg|png|gif|webp|bmp|svg|tiff?)$/i, '');
  
  console.log(`🔍 Analyzing: ${filename} → ${clean}`);
  
  // Strategy 1: Direct numeric match (highest confidence)
  if (/^\d{3,8}$/.test(clean)) {
    skus.push({ sku: clean, confidence: 100, source: 'exact_numeric' });
    console.log(`✅ Exact numeric SKU: ${clean}`);
    
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
    /^(\d{3,8}(?:[._-]\d{3,8})+)[._-]?.*$/,
    /(\d{3,8})\.(\d{3,8})\.?.*$/,
    /(\d{3,8})-(\d{3,8})-?.*$/,
    /(\d{3,8})_(\d{3,8})_?.*$/
  ];
  
  for (const pattern of multiSkuPatterns) {
    const match = clean.match(pattern);
    if (match) {
      const allNumbers = clean.match(/\d{3,8}/g) || [];
      allNumbers.forEach((sku, index) => {
        if (!skus.find(s => s.sku === sku)) {
          const confidence = Math.max(90 - (index * 3), 75);
          skus.push({ sku, confidence, source: `multi_sku_${index + 1}` });
          console.log(`✅ Multi-SKU ${index + 1}: ${sku} (${confidence}%)`);
        }
      });
      break;
    }
  }
  
  // Strategy 3: Enhanced pattern matching
  const patterns = [
    /^(\d{3,8})[a-zA-Z\-_]+.*$/,     // SKU with suffix
    /^.*[a-zA-Z\-_]+(\d{3,8})$/,     // SKU with prefix  
    /(\d{3,8})/g                      // Any numeric sequence
  ];
  
  patterns.forEach((pattern, index) => {
    // Add global flag to patterns that don't have it
    const globalPattern = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
    const matches = [...clean.matchAll(globalPattern)];
    matches.forEach(match => {
      const sku = match[1] || match[0].replace(/[^0-9]/g, '');
      if (/^\d{3,8}$/.test(sku) && !skus.find(s => s.sku === sku)) {
        const confidence = Math.max(80 - (index * 10), 50);
        skus.push({ sku, confidence, source: 'enhanced_pattern' });
        console.log(`✅ Enhanced pattern: ${sku} (${confidence}%)`);
      }
    });
  });
  
  const finalSkus = skus.sort((a, b) => b.confidence - a.confidence);
  console.log(`📊 Total SKUs: ${finalSkus.length}`, finalSkus.map(s => `${s.sku}(${s.confidence}%)`));
  
  return finalSkus;
}

// Enhanced product matching
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
  const report: ScanReport = {
    status: 'success',
    summary: {
      totalImages: 0,
      totalProducts: 0,
      linkedImages: 0,
      unlinkedImages: 0,
      candidatesCreated: 0,
      directLinksCreated: 0,
      productsWithoutImages: 0,
      processingTime: 0
    },
    unlinkedImages: [],
    errors: []
  };

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🚀 Starting comprehensive image-to-product scan...');

    // Get all products
    const { data: allProducts, error: productsError } = await supabase
      .from('products')
      .select('id, sku, name, is_active')
      .eq('is_active', true)
      .not('sku', 'is', null);

    if (productsError) throw productsError;
    
    report.summary.totalProducts = allProducts.length;
    console.log(`📦 Found ${allProducts.length} active products with SKUs`);

    // Get all storage images
    const images: any[] = [];
    let offset = 0;
    const batchSize = 200;

    while (true) {
      const { data: batch, error } = await supabase.storage
        .from('product-images')
        .list('', { 
          limit: batchSize,
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
      offset += batchSize;
      
      if (batch.length < batchSize) break;
    }

    report.summary.totalImages = images.length;
    console.log(`📁 Found ${images.length} images in storage`);

    // Get current linked images
    const { data: linkedImages } = await supabase
      .from('product_images')
      .select('product_id, image_url')
      .eq('image_status', 'active');

    report.summary.linkedImages = linkedImages?.length || 0;

    // Build set of already linked image URLs for faster lookup
    const linkedImageUrls = new Set(linkedImages?.map(img => {
      const urlParts = img.image_url.split('/');
      return urlParts[urlParts.length - 1]; // Get filename from URL
    }) || []);

    console.log(`🔗 Currently ${report.summary.linkedImages} images are linked to products`);

    // Process each unlinked image
    let directLinksCreated = 0;
    let candidatesCreated = 0;

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      
      // Skip if already linked
      if (linkedImageUrls.has(image.name)) {
        continue;
      }

      try {
        const extractedSKUs = extractAllSKUs(image.name);
        if (extractedSKUs.length === 0) {
          report.unlinkedImages.push({
            filename: image.name,
            extractedSKUs: [],
            matchAttempts: 0
          });
          continue;
        }

        let matchFound = false;
        let attempts = 0;

        // Try to match each extracted SKU
        for (const skuData of extractedSKUs) {
          const matches = findMatchingProducts(skuData.sku, allProducts);
          attempts++;
          
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

            if (finalConfidence >= 80) {
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
                    scan_session: crypto.randomUUID()
                  },
                  auto_matched: true
                });

              if (!linkError) {
                directLinksCreated++;
                console.log(`✅ Direct link: ${image.name} → ${product.sku} (${finalConfidence}%)`);
                matchFound = true;
                break;
              }
            } else if (finalConfidence >= 60) {
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
                    scan_session: crypto.randomUUID()
                  },
                  extracted_sku: skuData.sku,
                  source_filename: image.name,
                  status: 'pending'
                });

              if (!candidateError) {
                candidatesCreated++;
                console.log(`📋 Candidate: ${image.name} → ${product.sku} (${finalConfidence}%)`);
                matchFound = true;
                break;
              }
            }
          }
          
          if (matchFound) break;
        }

        if (!matchFound) {
          report.unlinkedImages.push({
            filename: image.name,
            extractedSKUs: extractedSKUs.map(s => s.sku),
            matchAttempts: attempts
          });
        }

        // Progress logging every 100 images
        if (i % 100 === 0 && i > 0) {
          console.log(`🔄 Progress: ${i}/${images.length} images processed`);
        }

      } catch (error) {
        console.error(`Error processing ${image.name}:`, error);
        report.errors.push(`Error processing ${image.name}: ${(error as Error).message}`);
      }
    }

    // Calculate final statistics
    report.summary.directLinksCreated = directLinksCreated;
    report.summary.candidatesCreated = candidatesCreated;
    report.summary.unlinkedImages = report.unlinkedImages.length;
    
    // Count products without images
    const { data: productsWithoutImages } = await supabase
      .from('products')
      .select('id')
      .eq('is_active', true)
      .not('id', 'in', `(${linkedImages?.map(img => `'${img.product_id}'`).join(',') || "''"})`)
      .limit(1000);

    report.summary.productsWithoutImages = productsWithoutImages?.length || 0;
    report.summary.processingTime = Date.now() - startTime;

    console.log('✅ Comprehensive scan completed!');
    console.log('📊 Final Results:', report.summary);

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('❌ Scan failed:', error);
    report.status = 'error';
    report.errors.push(`Fatal error: ${(error as Error).message}`);
    report.summary.processingTime = Date.now() - startTime;

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});