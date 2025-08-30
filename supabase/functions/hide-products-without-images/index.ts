import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface HideResult {
  totalProducts: number;
  productsWithoutImages: number;
  hiddenProducts: number;
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

    console.log('🔍 Starting to hide products without images...');

    // Get all products
    const { data: allProducts, error: productsError } = await supabase
      .from('products')
      .select('id, name, is_active');

    if (productsError) {
      console.error('❌ Error fetching products:', productsError);
      throw productsError;
    }

    console.log(`📊 Found ${allProducts.length} total products`);

    // Get all product images
    const { data: productImages, error: imagesError } = await supabase
      .from('product_images')
      .select('product_id')
      .eq('image_status', 'active');

    if (imagesError) {
      console.error('❌ Error fetching product images:', imagesError);
      throw imagesError;
    }

    // Create a set of product IDs that have images
    const productIdsWithImages = new Set(productImages.map(img => img.product_id));
    console.log(`🖼️ Found ${productIdsWithImages.size} products with images`);

    // Find products without images that are currently active
    const productsWithoutImages = allProducts.filter(product => 
      !productIdsWithImages.has(product.id) && product.is_active
    );

    console.log(`⚠️ Found ${productsWithoutImages.length} active products without images`);

    let hiddenProducts = 0;

    if (productsWithoutImages.length > 0) {
      // Get the product IDs to hide
      const productIdsToHide = productsWithoutImages.map(p => p.id);

      console.log(`🔄 Hiding ${productIdsToHide.length} products...`);

      // Hide products by setting is_active to false
      const { error: updateError } = await supabase
        .from('products')
        .update({ is_active: false })
        .in('id', productIdsToHide);

      if (updateError) {
        console.error('❌ Error updating products:', updateError);
        throw updateError;
      }

      hiddenProducts = productIdsToHide.length;
      console.log(`✅ Successfully hid ${hiddenProducts} products`);

      // Log the hidden products for reference
      productsWithoutImages.forEach(product => {
        console.log(`   - Hidden: ${product.name} (ID: ${product.id})`);
      });
    } else {
      console.log('✅ No products to hide - all active products have images');
    }

    const result: HideResult = {
      totalProducts: allProducts.length,
      productsWithoutImages: allProducts.filter(p => !productIdsWithImages.has(p.id)).length,
      hiddenProducts
    };

    console.log('📈 Final results:', result);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Error in hide-products-without-images function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});