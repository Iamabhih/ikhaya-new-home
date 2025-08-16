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
        // Parse request body for scan configuration
        const requestBody = await req.json().catch(() => ({}));
        const scanPath = requestBody.scanPath || '';
        const scanAllFolders = requestBody.scanAllFolders !== false; // Default to true
        
        console.log(`Scanning with config: scanPath="${scanPath}", scanAllFolders=${scanAllFolders}`);
        
        let allImages: any[] = [];
        
        // Recursive function to scan directories
        const scanDirectory = async (path: string = '', depth: number = 0): Promise<void> => {
          if (depth > 10) {
            console.warn(`Max depth reached at path: ${path}`);
            return;
          }
          
          const { data: items, error } = await supabase.storage
            .from('product-images')
            .list(path, {
              limit: 1000,
              sortBy: { column: 'name', order: 'asc' }
            });

          if (error) {
            console.error(`Error listing items in "${path}":`, error.message);
            return;
          }

          if (!items) return;

          for (const item of items) {
            if (!item.name || item.name.includes('.emptyFolderPlaceholder')) continue;
            
            const fullPath = path ? `${path}/${item.name}` : item.name;
            
            // Check if it's a directory (no file ID and no extension)
            const isDirectory = !item.id && !item.metadata && !item.name.includes('.');
            
            if (isDirectory) {
              console.log(`📁 Found directory: ${fullPath}`);
              if (scanAllFolders) {
                await scanDirectory(fullPath, depth + 1);
              }
            } else if (item.name.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)) {
              // It's an image file
              allImages.push({
                ...item,
                fullPath: fullPath,
                folderName: path || 'root'
              });
              console.log(`📸 Found image: ${fullPath}`);
            }
          }
        };
        
        // Start scanning from specified path or root
        if (scanAllFolders) {
          await scanDirectory(scanPath);
        } else if (scanPath) {
          // Scan only the specified folder
          const { data: images, error: imagesError } = await supabase.storage
            .from('product-images')
            .list(scanPath, {
              limit: 1000,
              sortBy: { column: 'name', order: 'asc' }
            });
            
          if (imagesError) {
            throw new Error(`Failed to list images in ${scanPath}: ${imagesError.message}`);
          }
          
          if (images) {
            images.forEach(img => {
              if (img.name && !img.name.includes('.emptyFolderPlaceholder') && 
                  img.name.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)) {
                allImages.push({
                  ...img,
                  fullPath: `${scanPath}/${img.name}`,
                  folderName: scanPath
                });
              }
            });
          }
        } else {
          // Scan root directory only
          const { data: images, error: imagesError } = await supabase.storage
            .from('product-images')
            .list('', {
              limit: 1000,
              sortBy: { column: 'name', order: 'asc' }
            });
            
          if (imagesError) {
            throw new Error(`Failed to list root images: ${imagesError.message}`);
          }
          
          if (images) {
            images.forEach(img => {
              if (img.name && !img.name.includes('.emptyFolderPlaceholder') && 
                  img.name.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)) {
                allImages.push({
                  ...img,
                  fullPath: img.name,
                  folderName: 'root'
                });
              }
            });
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