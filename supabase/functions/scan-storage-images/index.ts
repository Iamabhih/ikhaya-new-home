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

// Enhanced SKU extraction function - optimized for better matching
function extractSKUsFromFilename(filename: string, fullPath?: string): ExtractedSKU[] {
  const skus: ExtractedSKU[] = [];
  const cleanName = filename.replace(/\.(jpg|jpeg|png|webp|gif)$/i, '');
  
  console.log(`Extracting SKUs from filename: ${filename}, clean: ${cleanName}`);
  
  // Strategy 1: Exact filename as SKU (highest confidence)
  if (/^\d{3,}$/.test(cleanName)) {
    skus.push({
      sku: cleanName,
      confidence: 100,
      source: 'exact_numeric_filename'
    });
    console.log(`Found exact numeric SKU: ${cleanName}`);
    
    // Add zero-padding variations
    if (cleanName.length === 5 && !cleanName.startsWith('0')) {
      skus.push({
        sku: '0' + cleanName,
        confidence: 95,
        source: 'zero_padded_variation'
      });
    }
    
    // Remove leading zeros variation
    if (cleanName.startsWith('0') && cleanName.length > 3) {
      const trimmed = cleanName.replace(/^0+/, '');
      if (trimmed.length >= 3) {
        skus.push({
          sku: trimmed,
          confidence: 95,
          source: 'trimmed_zeros'
        });
      }
    }
  }
  
  // Strategy 2: Multiple SKUs in filename
  const multiSkuPattern = /^(\d+(?:\.\d+)+)$/;
  const multiSkuMatch = cleanName.match(multiSkuPattern);
  if (multiSkuMatch) {
    const potentialSkus = cleanName.split('.');
    potentialSkus.forEach((sku, index) => {
      if (/^\d{3,}$/.test(sku) && !skus.find(s => s.sku === sku)) {
        skus.push({
          sku: sku,
          confidence: 85 - (index * 5),
          source: 'multi_sku'
        });
        console.log(`Found multi-SKU ${index + 1}: ${sku}`);
      }
    });
  }

  // Strategy 3: SKU with suffix/prefix patterns
  if (!skus.length) {
    const patterns = [
      /^(\d{3,})[a-zA-Z]+$/g,           // numeric with suffix - FIXED: Added /g flag
      /^[a-zA-Z]+(\d{3,})$/g,          // prefix with numeric - FIXED: Added /g flag
      /(\d{3,})/g                      // any 3+ digit sequence - Already has /g flag
    ];

    patterns.forEach((pattern, patternIndex) => {
      try {
        const matches = [...cleanName.matchAll(pattern)]; // FIXED: Use matchAll with spread
        matches.forEach(match => {
          const numericPart = match[1] || match[0].replace(/[^0-9]/g, '');
          if (/^\d{3,}$/.test(numericPart) && !skus.find(s => s.sku === numericPart)) {
            let confidence = 50 - (patternIndex * 10); // LOWERED: Start at 50 instead of 70
            
            // Boost confidence based on context
            if (cleanName === numericPart) confidence = 90;
            else if (cleanName.startsWith(numericPart)) confidence = 75;
            else if (cleanName.endsWith(numericPart)) confidence = 65;
            
            skus.push({
              sku: numericPart,
              confidence: Math.max(20, confidence), // LOWERED: Minimum 20% instead of default
              source: 'numeric_pattern'
            });
            console.log(`Found numeric pattern: ${numericPart} (confidence: ${confidence}%)`);
          }
        });
      } catch (error) {
        console.error(`Error in pattern ${patternIndex}: ${error.message}`);
      }
    });
  }
  
  // Strategy 4: Path-based extraction
  if (fullPath && skus.length === 0) {
    const pathParts = fullPath.split('/');
    for (const part of pathParts) {
      if (/^\d{3,}$/.test(part) && !skus.some(s => s.sku === part)) {
        skus.push({
          sku: part,
          confidence: 60,
          source: 'path_folder_numeric'
        });
        console.log(`Found path numeric SKU: ${part}`);
      }
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
                
                // Try to find matching product with improved matching logic
                let matchingProduct = null;
                let matchedSku = '';
                let matchSource = '';
                
                // Helper function to normalize SKUs for comparison
                const normalizeSKU = (sku: string) => (sku || '').toLowerCase().trim();
                const removeLeadingZeros = (sku: string) => sku.replace(/^0+/, '') || '0';
                
                // Try exact matches first (highest confidence)
                  for (const skuCandidate of potentialSKUs) {
                    if (skuCandidate.confidence < 50) break; // FIXED: Reasonable minimum confidence
                  
                  const candidateSku = normalizeSKU(skuCandidate.sku);
                  
                  const foundProduct = products?.find(product => {
                    const productSku = normalizeSKU(product.sku);
                    
                    // Exact match
                    if (productSku === candidateSku) return true;
                    
                    // Zero-padding variations
                    if (removeLeadingZeros(productSku) === removeLeadingZeros(candidateSku)) return true;
                    
                    // Check if one is zero-padded version of the other
                    if (productSku === '0' + candidateSku || candidateSku === '0' + productSku) return true;
                    if (productSku === '00' + candidateSku || candidateSku === '00' + productSku) return true;
                    
                    return false;
                  });
                  
                  if (foundProduct) {
                    matchingProduct = foundProduct;
                    matchedSku = skuCandidate.sku;
                    matchSource = skuCandidate.source;
                    console.log(`✅ Exact match found: ${skuCandidate.sku} (${skuCandidate.confidence}%) → ${foundProduct.name} (${foundProduct.sku})`);
                    break;
                  }
                }
                
                // If no exact match, try base numeric matches (for alphanumeric SKUs)
                if (!matchingProduct) {
                  for (const skuCandidate of potentialSKUs) {
                    if (skuCandidate.confidence < 40) break; // FIXED: Reasonable confidence for numeric matching
                    
                    
                    // Extract base numeric part
                    const baseNumeric = skuCandidate.sku.match(/^(\d+)/);
                    if (baseNumeric) {
                      const foundProduct = products?.find(product => {
                        const productSku = normalizeSKU(product.sku);
                        const baseNum = baseNumeric[1];
                        
                        return productSku === baseNum || 
                               productSku.startsWith(baseNum) ||
                               removeLeadingZeros(productSku) === removeLeadingZeros(baseNum);
                      });
                      
                      if (foundProduct) {
                        matchingProduct = foundProduct;
                        matchedSku = skuCandidate.sku;
                        matchSource = `${skuCandidate.source} (base_numeric)`;
                        console.log(`✅ Base numeric match found: ${baseNumeric[1]} → ${foundProduct.name} (${foundProduct.sku})`);
                        break;
                      }
                    }
                  }
                }
                
                // If still no match, try more permissive matching for high-confidence candidates only
                if (!matchingProduct) {
                  for (const skuCandidate of potentialSKUs) {
                    if (skuCandidate.confidence < 60) break; // FIXED: Higher threshold for permissive matching
                    
                    
                    const candidateSku = normalizeSKU(skuCandidate.sku);
                    
                    const foundProduct = products?.find(product => {
                      const productSku = normalizeSKU(product.sku);
                      
                      // One contains the other (for longer SKUs)
                      if (productSku.length >= 4 && candidateSku.length >= 4) {
                        if (productSku.includes(candidateSku) || candidateSku.includes(productSku)) {
                          return true;
                        }
                      }
                      
                      return false;
                    });
                    
                    if (foundProduct) {
                      matchingProduct = foundProduct;
                      matchedSku = skuCandidate.sku;
                      matchSource = `${skuCandidate.source} (contains)`;
                      console.log(`✅ Contains match found: ${skuCandidate.sku} → ${foundProduct.name} (${foundProduct.sku})`);
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
                    
                    // High confidence matches go directly to product_images
                    const bestSku = potentialSKUs[0];
                    if (bestSku && bestSku.confidence >= 70) { // FIXED: Balanced confidence threshold
                      const { error: insertError } = await supabase
                        .from('product_images')
                        .insert({
                          product_id: matchingProduct.id,
                          image_url: imageUrl,
                          alt_text: `${matchingProduct.name} - ${image.name}`,
                          is_primary: true,
                          sort_order: 999,
                          image_status: 'active',
                          match_confidence: bestSku.confidence,
                          match_metadata: {
                            source: bestSku.source,
                            filename: image.name,
                            session_id: sessionId
                          },
                          auto_matched: true
                        });

                      if (insertError) {
                        errors.push(`Failed to link ${image.name} to ${matchingProduct.name}: ${insertError.message}`);
                      } else {
                        matchedCount++;
                        console.log(`Successfully linked ${image.name} to product ${matchingProduct.name} via SKU: ${matchedSku}`);
                      }
                    } else {
                      // Lower confidence matches go to candidates table
                      const { error: candidateError } = await supabase
                        .from('product_image_candidates')
                        .insert({
                          product_id: matchingProduct.id,
                          image_url: imageUrl,
                          alt_text: `${matchingProduct.name} - ${image.name}`,
                          match_confidence: bestSku?.confidence || 50,
                          match_metadata: {
                            source: bestSku?.source || matchSource,
                            filename: image.name,
                            session_id: sessionId
                          },
                          extracted_sku: matchedSku,
                          source_filename: image.name,
                          status: 'pending'
                        });

                      if (candidateError) {
                        errors.push(`Failed to create candidate for ${image.name}: ${candidateError.message}`);
                      } else {
                        matchedCount++;
                        console.log(`Created candidate: ${image.name} -> ${matchingProduct.name} (${bestSku?.confidence || 50}%)`);
                      }
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