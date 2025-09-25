import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔧 Starting manual image repair scan...');
    
    // Step 1: Auto-promote high-confidence candidates
    console.log('📋 Step 1: Auto-promoting high-confidence candidates...');
    const { data: highConfidenceCandidates } = await supabase
      .from('product_image_candidates')
      .select('*')
      .eq('status', 'pending')
      .gte('match_confidence', 85);

    let promotedCount = 0;
    for (const candidate of highConfidenceCandidates || []) {
      try {
        // Check if link already exists
        const { data: existing } = await supabase
          .from('product_images')
          .select('id')
          .eq('product_id', candidate.product_id)
          .eq('image_url', candidate.image_url)
          .single();

        if (!existing) {
          // Create the link
          await supabase
            .from('product_images')
            .insert({
              product_id: candidate.product_id,
              image_url: candidate.image_url,
              alt_text: candidate.alt_text,
              image_status: 'active',
              is_primary: false,
              match_confidence: candidate.match_confidence,
              auto_matched: true
            });

          // Update candidate status
          await supabase
            .from('product_image_candidates')
            .update({ status: 'approved' })
            .eq('id', candidate.id);

          promotedCount++;
          console.log(`✅ Promoted candidate: ${candidate.image_url} → ${candidate.product_id}`);
        }
      } catch (error) {
        console.error(`❌ Error promoting candidate ${candidate.id}:`, error);
      }
    }

    // Step 2: Find products without images
    console.log('📋 Step 2: Finding products without images...');
    const { data: productsWithoutImages } = await supabase
      .from('products')
      .select('id, name, sku')
      .not('id', 'in', '(SELECT DISTINCT product_id FROM product_images WHERE image_status = \'active\')')
      .eq('is_active', true)
      .limit(100); // Process in batches

    console.log(`🔍 Found ${productsWithoutImages?.length || 0} products without images`);

    // Step 3: Scan storage for potential matches
    console.log('📋 Step 3: Scanning storage for image matches...');
    const { data: storageFiles } = await supabase.storage
      .from('product-images')
      .list('', { limit: 1000 });

    let linksCreated = 0;
    let candidatesCreated = 0;

    for (const product of productsWithoutImages || []) {
      const productSKU = product.sku?.toLowerCase() || '';
      
      for (const file of storageFiles || []) {
        if (!file.name || file.name.includes('folder')) continue;
        
        const filename = file.name.toLowerCase();
        const nameWithoutExt = filename.replace(/\.(jpg|jpeg|png|webp|gif)$/i, '');
        
        // Enhanced matching logic
        let isMatch = false;
        let confidence = 0;
        
        // Exact SKU match
        if (nameWithoutExt === productSKU) {
          isMatch = true;
          confidence = 95;
        }
        // SKU at start of filename
        else if (nameWithoutExt.startsWith(productSKU + '.') || nameWithoutExt.startsWith(productSKU + '_')) {
          isMatch = true;
          confidence = 85;
        }
        // Contains SKU
        else if (nameWithoutExt.includes(productSKU) && productSKU.length >= 4) {
          isMatch = true;
          confidence = 70;
        }
        // Zero padding variations
        else if (productSKU.length === 5 && nameWithoutExt === '0' + productSKU) {
          isMatch = true;
          confidence = 90;
        }
        
        if (isMatch && confidence >= 70) {
          const imageUrl = `https://kauostzhxqoxggwqgtym.supabase.co/storage/v1/object/public/product-images/${file.name}`;
          
          try {
            if (confidence >= 85) {
              // Create direct link for high confidence
              await supabase
                .from('product_images')
                .insert({
                  product_id: product.id,
                  image_url: imageUrl,
                  alt_text: `${product.name} - ${file.name}`,
                  image_status: 'active',
                  is_primary: true,
                  match_confidence: confidence,
                  auto_matched: true
                });
              
              linksCreated++;
              console.log(`✅ Created direct link: ${file.name} → ${product.sku} (${confidence}%)`);
            } else {
              // Create candidate for manual review
              await supabase
                .from('product_image_candidates')
                .insert({
                  product_id: product.id,
                  image_url: imageUrl,
                  alt_text: `${product.name} - ${file.name}`,
                  match_confidence: confidence,
                  status: 'pending',
                  match_metadata: {
                    sku: product.sku,
                    filename: file.name,
                    match_type: 'contains'
                  }
                });
              
              candidatesCreated++;
              console.log(`🔍 Created candidate: ${file.name} → ${product.sku} (${confidence}%)`);
            }
          } catch (error) {
            console.error(`❌ Error creating link/candidate for ${file.name}:`, error);
          }
        }
      }
    }

    const result = {
      status: 'complete',
      promotedCandidates: promotedCount,
      productsScanned: productsWithoutImages?.length || 0,
      imagesScanned: storageFiles?.length || 0,
      linksCreated,
      candidatesCreated,
      totalProcessed: linksCreated + candidatesCreated
    };

    console.log('✅ Manual repair completed:', result);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Error in manual image repair:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: (error as Error).message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});