import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScanResult {
  sessionId: string;
  status: 'scanning' | 'completed' | 'error';
  foundImages: number;
  matchedProducts: number;
  errors: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    console.log('Storage image scanner called');

    // Generate session ID
    const sessionId = crypto.randomUUID();
    
    const result: ScanResult = {
      sessionId,
      status: 'scanning',
      foundImages: 0,
      matchedProducts: 0,
      errors: []
    };

    if (req.method === 'POST') {
      console.log('Starting storage image scan...');
      
      try {
        // Scan product-images bucket recursively including MULTI_MATCH_ORGANIZED folder
        const { data: folders, error: foldersError } = await supabase.storage
          .from('product-images')
          .list('MULTI_MATCH_ORGANIZED', {
            limit: 1000,
            sortBy: { column: 'name', order: 'asc' }
          });

        if (foldersError) {
          throw new Error(`Failed to list folders: ${foldersError.message}`);
        }

        let allImages: any[] = [];
        
        // Get images from all subfolders
        if (folders) {
          for (const folder of folders) {
            if (folder.name && !folder.name.includes('.emptyFolderPlaceholder')) {
              const { data: subImages, error: subError } = await supabase.storage
                .from('product-images')
                .list(`MULTI_MATCH_ORGANIZED/${folder.name}`, {
                  limit: 1000,
                  sortBy: { column: 'name', order: 'asc' }
                });

              if (subError) {
                console.error(`Error listing images in ${folder.name}:`, subError.message);
                continue;
              }

              if (subImages) {
                // Add folder path to each image
                subImages.forEach(img => {
                  if (img.name && !img.name.includes('.emptyFolderPlaceholder')) {
                    allImages.push({
                      ...img,
                      fullPath: `MULTI_MATCH_ORGANIZED/${folder.name}/${img.name}`,
                      folderName: folder.name
                    });
                  }
                });
              }
            }
          }
        }
        
        const images = allImages;


        result.foundImages = images?.length || 0;
        console.log(`Found ${result.foundImages} images in storage`);

        if (images && images.length > 0) {
          // Get all products to match against
          const { data: products, error: productsError } = await supabase
            .from('products')
            .select('id, sku, name, slug');

          if (productsError) {
            throw new Error(`Failed to fetch products: ${productsError.message}`);
          }

          console.log(`Found ${products?.length || 0} products to match against`);

          let matchedCount = 0;
          const errors: string[] = [];

          // Process each image
          for (const image of images) {
            try {
              if (image.name && !image.name.includes('.emptyFolderPlaceholder')) {
                // Extract SKUs from filename - handle multiple SKUs separated by dots or spaces
                const filename = image.name.toLowerCase();
                const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
                
                // Extract potential SKUs - look for 4-6 digit numbers
                const skuMatches = nameWithoutExt.match(/\b\d{4,6}\b/g) || [];
                
                console.log(`Processing ${image.name}, found potential SKUs: ${skuMatches.join(', ')}`);
                
                // Try to find matching product by any extracted SKU
                let matchingProduct = null;
                let matchedSku = '';
                
                for (const potentialSku of skuMatches) {
                  const foundProduct = products?.find(product => {
                    const productSku = product.sku?.toLowerCase() || '';
                    return productSku === potentialSku;
                  });
                  
                  if (foundProduct) {
                    matchingProduct = foundProduct;
                    matchedSku = potentialSku;
                    break; // Use first exact match found
                  }
                }
                
                // If no exact SKU match, try broader filename matching
                if (!matchingProduct) {
                  matchingProduct = products?.find(product => {
                    const productSku = product.sku?.toLowerCase() || '';
                    const productName = product.name?.toLowerCase() || '';
                    const productSlug = product.slug?.toLowerCase() || '';
                    
                    return (productSku && nameWithoutExt.includes(productSku)) ||
                           (productName && nameWithoutExt.includes(productName.slice(0, 10))) ||
                           (productSlug && nameWithoutExt.includes(productSlug));
                  });
                }

                if (matchingProduct) {
                  // Check if product already has an image
                  const { data: existingImage } = await supabase
                    .from('product_images')
                    .select('id')
                    .eq('product_id', matchingProduct.id)
                    .limit(1);

                  if (!existingImage || existingImage.length === 0) {
                    // Create product image record using the full path
                    const imageUrl = `${supabaseUrl}/storage/v1/object/public/product-images/${image.fullPath}`;
                    
                    console.log(`Linking ${image.name} (SKU: ${matchedSku || 'name-based'}) to product ${matchingProduct.name} (${matchingProduct.sku})`);
                    
                    const { error: insertError } = await supabase
                      .from('product_images')
                      .insert({
                        product_id: matchingProduct.id,
                        image_url: imageUrl,
                        alt_text: matchingProduct.name,
                        is_primary: true,
                        display_order: 0
                      });

                    if (insertError) {
                      errors.push(`Failed to link ${image.name} to ${matchingProduct.name}: ${insertError.message}`);
                    } else {
                      matchedCount++;
                      console.log(`Successfully linked ${image.name} to product ${matchingProduct.name} via SKU: ${matchedSku || 'name-based'}`);
                    }
                  } else {
                    console.log(`Product ${matchingProduct.name} already has an image, skipping ${image.name}`);
                  }
                } else {
                  console.log(`No product match found for image: ${image.name} (potential SKUs: ${skuMatches.join(', ')})`);
                }
              }
            } catch (error) {
              const errorMsg = `Error processing ${image.name}: ${error.message}`;
              errors.push(errorMsg);
              console.error(errorMsg);
            }
          }

          result.matchedProducts = matchedCount;
          result.errors = errors;
          result.status = 'completed';
          
          console.log(`Scan completed: ${matchedCount} products matched, ${errors.length} errors`);
        }

      } catch (error) {
        result.status = 'error';
        result.errors.push(error.message);
        console.error('Scan error:', error);
      }
    }

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Storage image scanner error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal Server Error',
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})