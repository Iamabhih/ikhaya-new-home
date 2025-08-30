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

// Simple SKU extraction focused on reliability
function extractSKU(filename: string): string | null {
  const clean = filename.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
  
  // Direct numeric match (most reliable)
  const directMatch = clean.match(/^(\d{4,7})$/);
  if (directMatch) return directMatch[1];
  
  // Handle common patterns like "123456.png" or "123456-photoroom.png"
  const numericStart = clean.match(/^(\d{4,7})[^0-9]/);
  if (numericStart) return numericStart[1];
  
  // Multi-SKU files - take the first SKU (usually the main product)
  const multiSKU = clean.match(/^(\d{4,7})\./);
  if (multiSKU) return multiSKU[1];
  
  return null;
}

// Find matching product with zero-padding tolerance
function findProduct(sku: string, products: any[]): any {
  const normalizedSKU = sku.replace(/^0+/, '');
  
  return products.find(p => {
    const productSKU = p.sku?.replace(/^0+/, '');
    return productSKU === normalizedSKU || 
           p.sku === sku || 
           p.sku === sku.padStart(6, '0');
  });
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

    console.log('🚀 Starting optimized image repair...');

    // Step 1: Get products without images
    const { data: allProducts } = await supabase
      .from('products')
      .select('id, sku, name')
      .eq('is_active', true)
      .not('sku', 'is', null)
      .limit(500);

    const { data: productImages } = await supabase
      .from('product_images')
      .select('product_id')
      .eq('image_status', 'active');

    const linkedProductIds = new Set(productImages?.map(pi => pi.product_id) || []);
    const productsWithoutImages = allProducts?.filter(p => !linkedProductIds.has(p.id)) || [];
    
    result.productsScanned = productsWithoutImages.length;
    console.log(`📊 Found ${result.productsScanned} products without images`);

    if (productsWithoutImages.length === 0) {
      console.log('✅ All products already have images');
      result.processingTime = Date.now() - startTime;
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Get storage images in smaller, rate-limited batches
    const images = [];
    let offset = 0;
    const batchSize = 100; // Reasonable batch size

    while (true) {
      try {
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
          file.name && file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)
        );
        
        images.push(...imageFiles);
        offset += batchSize;

        if (batch.length < batchSize) break;

        // Rate limiting - small delay between batches
        await new Promise(resolve => setTimeout(resolve, 50));

      } catch (error) {
        console.error(`Storage scan error:`, error);
        result.errors.push(`Storage scan failed: ${error.message}`);
        break;
      }
    }

    result.imagesScanned = images.length;
    console.log(`📁 Scanned ${result.imagesScanned} images`);

    // Step 3: Process matches with rate limiting
    for (let i = 0; i < images.length && i < 200; i++) { // Limit processing to prevent timeouts
      const image = images[i];
      
      try {
        const sku = extractSKU(image.name);
        if (!sku) continue;

        const matchedProduct = findProduct(sku, productsWithoutImages);
        if (!matchedProduct) continue;

        // Check if this product already got linked in this session
        const { data: existingLink } = await supabase
          .from('product_images')
          .select('id')
          .eq('product_id', matchedProduct.id)
          .eq('image_status', 'active')
          .limit(1);

        if (existingLink && existingLink.length > 0) continue;

        const imageUrl = supabase.storage
          .from('product-images')
          .getPublicUrl(image.name).data.publicUrl;

        // High confidence for exact numeric matches
        const confidence = image.name.match(/^\d+\.(jpg|jpeg|png|gif|webp)$/i) ? 95 : 80;

        if (confidence >= 85) {
          // Create direct link
          const { error: linkError } = await supabase
            .from('product_images')
            .insert({
              product_id: matchedProduct.id,
              image_url: imageUrl,
              alt_text: `${matchedProduct.name} - ${image.name}`,
              image_status: 'active',
              is_primary: true,
              sort_order: 1,
              match_confidence: confidence,
              auto_matched: true
            });

          if (!linkError) {
            result.linksCreated++;
            console.log(`✅ Linked: ${image.name} → ${matchedProduct.sku}`);
            // Remove from products list to avoid duplicate processing
            const index = productsWithoutImages.findIndex(p => p.id === matchedProduct.id);
            if (index !== -1) productsWithoutImages.splice(index, 1);
          } else if (linkError.code !== '23505') { // Ignore duplicates
            result.errors.push(`Link error: ${linkError.message}`);
          }
        } else {
          // Create candidate
          const { error: candidateError } = await supabase
            .from('product_image_candidates')
            .insert({
              product_id: matchedProduct.id,
              image_url: imageUrl,
              alt_text: `${matchedProduct.name} - ${image.name}`,
              match_confidence: confidence,
              status: 'pending'
            });

          if (!candidateError) {
            result.candidatesCreated++;
            console.log(`📋 Candidate: ${image.name} → ${matchedProduct.sku}`);
          } else if (candidateError.code !== '23505') { // Ignore duplicates
            result.errors.push(`Candidate error: ${candidateError.message}`);
          }
        }

        // Rate limiting - small delay every 5 operations
        if (i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
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