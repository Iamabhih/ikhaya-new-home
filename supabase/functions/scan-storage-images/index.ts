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

interface ExtractedSKU {
  sku: string;
  confidence: number;
  source: string;
}

// Enhanced SKU extraction function
function extractSKUsFromFilename(filename: string, fullPath?: string): ExtractedSKU[] {
  const skus: ExtractedSKU[] = [];
  const cleanName = filename.replace(/\.(jpg|jpeg|png|webp|gif)$/i, '');
  
  console.log(`Extracting SKUs from filename: ${filename}, clean: ${cleanName}`);
  
  // Strategy 1: Exact filename as SKU (highest confidence)
  // Handle pure numeric SKUs (3+ digits)
  const exactNumericMatch = cleanName.match(/^\d{3,}$/);
  if (exactNumericMatch) {
    skus.push({
      sku: exactNumericMatch[0],
      confidence: 95,
      source: 'exact_numeric_filename'
    });
    console.log(`Found exact numeric SKU: ${exactNumericMatch[0]}`);
  }
  
  // Strategy 2: Alphanumeric SKUs (digits + letters)
  const alphanumericMatch = cleanName.match(/^(\d{3,}[a-zA-Z]+)$/);
  if (alphanumericMatch) {
    skus.push({
      sku: alphanumericMatch[1],
      confidence: 90,
      source: 'exact_alphanumeric_filename'
    });
    console.log(`Found exact alphanumeric SKU: ${alphanumericMatch[1]}`);
    
    // Also extract base numeric portion
    const baseNumeric = alphanumericMatch[1].match(/^(\d+)/);
    if (baseNumeric && !skus.some(s => s.sku === baseNumeric[1])) {
      skus.push({
        sku: baseNumeric[1],
        confidence: 85,
        source: 'base_numeric_from_alphanumeric'
      });
      console.log(`Found base numeric from alphanumeric: ${baseNumeric[1]}`);
    }
  }
  
  // Strategy 3: Multiple SKUs separated by dots (e.g., 444492.444493.png)
  const multiSKUMatch = cleanName.match(/^(\d{3,})\.(\d{3,})$/);
  if (multiSKUMatch) {
    skus.push({
      sku: multiSKUMatch[1],
      confidence: 88,
      source: 'multi_sku_first'
    });
    skus.push({
      sku: multiSKUMatch[2],
      confidence: 83,
      source: 'multi_sku_second'
    });
    console.log(`Found multi-SKU: ${multiSKUMatch[1]}, ${multiSKUMatch[2]}`);
  }
  
  // Strategy 4: SKUs with suffixes (e.g., 444492b.png)
  const skuWithSuffixMatch = cleanName.match(/^(\d{3,})[a-zA-Z]+$/);
  if (skuWithSuffixMatch && !skus.some(s => s.sku === skuWithSuffixMatch[1])) {
    skus.push({
      sku: skuWithSuffixMatch[1],
      confidence: 80,
      source: 'numeric_with_suffix'
    });
    console.log(`Found SKU with suffix: ${skuWithSuffixMatch[1]}`);
  }
  
  // Strategy 5: Any sequence of 3+ digits anywhere in filename
  const allNumericPatterns = cleanName.match(/\d{3,}/g);
  if (allNumericPatterns) {
    allNumericPatterns.forEach(pattern => {
      if (!skus.some(s => s.sku === pattern)) {
        skus.push({
          sku: pattern,
          confidence: 60,
          source: 'numeric_pattern'
        });
        console.log(`Found numeric pattern: ${pattern}`);
      }
    });
  }
  
  // Strategy 6: Path-based extraction (folder names)
  if (fullPath) {
    const pathParts = fullPath.split('/');
    for (const part of pathParts) {
      // Check for numeric folder names
      const pathNumericSKU = part.match(/^\d{3,}$/);
      if (pathNumericSKU && !skus.some(s => s.sku === pathNumericSKU[0])) {
        skus.push({
          sku: pathNumericSKU[0],
          confidence: 70,
          source: 'path_folder_numeric'
        });
        console.log(`Found path numeric SKU: ${pathNumericSKU[0]}`);
      }
      
      // Check for alphanumeric folder names
      const pathAlphanumericSKU = part.match(/^(\d{3,}[a-zA-Z]+)$/);
      if (pathAlphanumericSKU && !skus.some(s => s.sku === pathAlphanumericSKU[1])) {
        skus.push({
          sku: pathAlphanumericSKU[1],
          confidence: 65,
          source: 'path_folder_alphanumeric'
        });
        console.log(`Found path alphanumeric SKU: ${pathAlphanumericSKU[1]}`);
      }
    }
  }
  
  // Strategy 7: Pattern-based matching with separators
  const separatorPatterns = [
    /^(\d{3,})[_-]/,           // SKU at start with separator
    /[_-](\d{3,})[_-]/,        // SKU in middle with separators
    /[_-](\d{3,})$/,           // SKU at end with separator
    /^([a-zA-Z]*\d{3,}[a-zA-Z]*)[_-]/, // Alphanumeric SKU with separator
  ];
  
  for (const pattern of separatorPatterns) {
    const match = cleanName.match(pattern);
    if (match && !skus.some(s => s.sku === match[1])) {
      skus.push({
        sku: match[1],
        confidence: 45,
        source: 'separator_pattern'
      });
      console.log(`Found separator pattern SKU: ${match[1]}`);
    }
  }
  
  const finalSkus = skus.sort((a, b) => b.confidence - a.confidence);
  console.log(`Total SKUs extracted: ${finalSkus.length}`, finalSkus.map(s => `${s.sku} (${s.confidence}%)`));
  
  return finalSkus;
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
                console.log(`\n=== Processing ${image.name} ===`);
                
                // Enhanced SKU extraction
                const filename = image.name.toLowerCase();
                const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
                
                // Extract potential SKUs using multiple strategies
                const potentialSKUs = extractSKUsFromFilename(nameWithoutExt, image.fullPath);
                
                console.log(`Found ${potentialSKUs.length} potential SKUs:`, potentialSKUs.map(s => `${s.sku} (${s.confidence}% - ${s.source})`));
                
                // Try to find matching product by any extracted SKU
                let matchingProduct = null;
                let matchedSku = '';
                let matchSource = '';
                
                // Try exact matches first (highest confidence)
                for (const skuCandidate of potentialSKUs) {
                  const foundProduct = products?.find(product => {
                    const productSku = (product.sku || '').toLowerCase();
                    return productSku === skuCandidate.sku.toLowerCase();
                  });
                  
                  if (foundProduct) {
                    matchingProduct = foundProduct;
                    matchedSku = skuCandidate.sku;
                    matchSource = skuCandidate.source;
                    console.log(`✅ Exact match found: ${skuCandidate.sku} → ${foundProduct.name}`);
                    break;
                  }
                }
                
                // If no exact match, try base numeric matches (for alphanumeric SKUs)
                if (!matchingProduct) {
                  for (const skuCandidate of potentialSKUs) {
                    // Extract base numeric part
                    const baseNumeric = skuCandidate.sku.match(/^(\d+)/);
                    if (baseNumeric) {
                      const foundProduct = products?.find(product => {
                        const productSku = (product.sku || '').toLowerCase();
                        return productSku === baseNumeric[1] || productSku.startsWith(baseNumeric[1]);
                      });
                      
                      if (foundProduct) {
                        matchingProduct = foundProduct;
                        matchedSku = skuCandidate.sku;
                        matchSource = `${skuCandidate.source} (base_numeric)`;
                        console.log(`✅ Base numeric match found: ${baseNumeric[1]} → ${foundProduct.name}`);
                        break;
                      }
                    }
                  }
                }
                
                // If still no match, try partial matching
                if (!matchingProduct) {
                  for (const skuCandidate of potentialSKUs) {
                    const foundProduct = products?.find(product => {
                      const productSku = (product.sku || '').toLowerCase();
                      const productName = (product.name || '').toLowerCase();
                      const productSlug = (product.slug || '').toLowerCase();
                      
                      return (productSku && (
                        productSku.includes(skuCandidate.sku.toLowerCase()) ||
                        skuCandidate.sku.toLowerCase().includes(productSku)
                      )) ||
                      (productName && nameWithoutExt.includes(productName.slice(0, 10))) ||
                      (productSlug && nameWithoutExt.includes(productSlug));
                    });
                    
                    if (foundProduct) {
                      matchingProduct = foundProduct;
                      matchedSku = skuCandidate.sku;
                      matchSource = `${skuCandidate.source} (partial)`;
                      console.log(`✅ Partial match found: ${skuCandidate.sku} → ${foundProduct.name}`);
                      break;
                    }
                  }
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
                        alt_text: `${matchingProduct.name} - ${matchingProduct.sku}`,
                        is_primary: true,
                        sort_order: 0
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
                  console.log(`❌ No product match found for image: ${image.name} (potential SKUs: ${potentialSKUs.map(s => s.sku).join(', ')})`);
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