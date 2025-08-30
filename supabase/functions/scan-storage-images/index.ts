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

// Comprehensive SKU extraction function - Enhanced for all variants
function extractSKUsFromFilename(filename: string, fullPath?: string): ExtractedSKU[] {
  const skus: ExtractedSKU[] = [];
  let cleanName = filename.replace(/\.(jpg|jpeg|png|webp|gif|bmp|svg|tiff?)$/i, '');
  
  // Handle double dots and clean up
  cleanName = cleanName.replace(/\.+$/, '');
  
  console.log(`🔍 Extracting SKUs from: ${filename} → ${cleanName}`);
  
  // Strategy 1: Exact filename as SKU (highest confidence)
  if (/^\d{3,8}$/.test(cleanName)) {
    skus.push({
      sku: cleanName,
      confidence: 100,
      source: 'exact_numeric_filename'
    });
    console.log(`✅ Exact numeric SKU: ${cleanName}`);
    
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
  
  // Strategy 2: Enhanced Multi-SKU handling with all separators
  const multiSkuPatterns = [
    // Pure numeric with dots (highest priority)
    /^(\d{3,8}(?:\.\d{3,8})+)\.?$/,
    // Numeric with dashes
    /^(\d{3,8}(?:\-\d{3,8})+)\-?$/,
    // Numeric with underscores
    /^(\d{3,8}(?:\_\d{3,8})+)\_?$/,
    // Mixed separators
    /^(\d{3,8}(?:[\.\-_]\d{3,8})+)[\.\-_]?.*$/,
    // Any sequence with separators
    /(\d{3,8}(?:[\.\-_]\d{3,8})+)/
  ];
  
  for (const pattern of multiSkuPatterns) {
    const match = cleanName.match(pattern);
    if (match) {
      const allNumbers = match[1].match(/\d{3,8}/g) || [];
      const uniqueNumbers = [...new Set(allNumbers)];
      
      uniqueNumbers.forEach((sku, index) => {
        if (!skus.find(s => s.sku === sku)) {
          const confidence = Math.max(90 - (index * 3), 70);
          skus.push({
            sku: sku,
            confidence: confidence,
            source: 'multi_sku'
          });
          console.log(`✅ Multi-SKU ${index + 1}: ${sku} (${confidence}%)`);
        }
      });
      break;
    }
  }

  // Strategy 3: Enhanced pattern matching for complex filenames
  if (!skus.length || cleanName.includes('.') || cleanName.includes('-') || cleanName.includes('_')) {
    const enhancedPatterns = [
      // Numeric with any suffix/prefix
      /^(\d{3,8})[a-zA-Z\-_\.]+.*$/g,
      /^.*[a-zA-Z\-_\.]+(\d{3,8})$/g,
      // Multiple numbers in filename
      /(\d{3,8})/g
    ];

    enhancedPatterns.forEach((pattern, patternIndex) => {
      try {
        const matches = [...cleanName.matchAll(pattern)];
        matches.forEach((match, matchIndex) => {
          const numericPart = match[1] || match[0].replace(/[^0-9]/g, '');
          if (/^\d{3,8}$/.test(numericPart) && !skus.find(s => s.sku === numericPart)) {
            let confidence = 60 - (patternIndex * 10) - (matchIndex * 5);
            
            // Boost confidence based on context
            if (cleanName === numericPart) confidence = 90;
            else if (cleanName.startsWith(numericPart)) confidence = 80;
            else if (cleanName.endsWith(numericPart)) confidence = 70;
            else if (patternIndex === 0) confidence = 75;
            
            skus.push({
              sku: numericPart,
              confidence: Math.max(30, confidence),
              source: 'enhanced_pattern'
            });
            console.log(`✅ Enhanced pattern: ${numericPart} (${confidence}%)`);
          }
        });
      } catch (error) {
        console.error(`❌ Pattern error ${patternIndex}: ${error.message}`);
      }
    });
  }
  
  // Strategy 4: Path-based extraction for organized folders
  if (fullPath && fullPath.includes('/')) {
    const pathParts = fullPath.split('/');
    for (const part of pathParts) {
      if (/^\d{3,8}$/.test(part) && !skus.some(s => s.sku === part)) {
        skus.push({
          sku: part,
          confidence: 60,
          source: 'path_folder_numeric'
        });
        console.log(`✅ Path SKU: ${part}`);
      }
    }
  }
  
  // Strategy 5: Complex filename analysis
  if (skus.length === 0) {
    // Look for any numeric sequences that could be SKUs
    const potentialSKUs = cleanName.match(/\d{3,8}/g) || [];
    potentialSKUs.forEach((sku, index) => {
      if (!skus.find(s => s.sku === sku)) {
        const confidence = Math.max(40 - (index * 5), 20);
        skus.push({
          sku: sku,
          confidence: confidence,
          source: 'fallback_numeric'
        });
        console.log(`✅ Fallback SKU: ${sku} (${confidence}%)`);
      }
    });
  }
  
  const finalSkus = skus.sort((a, b) => b.confidence - a.confidence);
  console.log(`📊 Total SKUs: ${finalSkus.length}`, finalSkus.map(s => `${s.sku}(${s.confidence}%)`));
  
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
      console.log('🚀 Starting comprehensive storage image scan with reset...');
      
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
      
      try {
        // Parse request body for scan configuration
        const requestBody = await req.json().catch(() => ({}));
        const scanPath = requestBody.scanPath || '';
        const scanAllFolders = requestBody.scanAllFolders !== false;
        
        console.log(`🔧 Scanning with config: scanPath="${scanPath}", scanAllFolders=${scanAllFolders}`);
        
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
          // Get ALL products to match against (no limits)
          console.log('📦 Fetching ALL products...');
          let allProducts = [];
          let productsOffset = 0;
          const productsBatchSize = 1000;
          
          while (true) {
            const { data: productsBatch, error: productsError } = await supabase
              .from('products')
              .select('id, sku, name, slug')
              .range(productsOffset, productsOffset + productsBatchSize - 1);

            if (productsError) {
              throw new Error(`Failed to fetch products: ${productsError.message}`);
            }
            
            if (!productsBatch || productsBatch.length === 0) break;
            
            allProducts.push(...productsBatch);
            productsOffset += productsBatchSize;
            
            console.log(`📦 Loaded ${allProducts.length} products so far...`);
            
            if (productsBatch.length < productsBatchSize) break;
          }

          console.log(`📦 Total products loaded: ${allProducts.length}`);

          let matchedCount = 0;
          const errors: string[] = [];

          // Process ALL images with multiple SKU associations
          console.log(`🔄 Processing ALL ${images.length} images for multiple SKU associations...`);
          for (let imageIndex = 0; imageIndex < images.length; imageIndex++) {
            const image = images[imageIndex];
            
            try {
              if (image.name && !image.name.includes('.emptyFolderPlaceholder')) {
                console.log(`\n=== Processing ${image.name} (${imageIndex + 1}/${images.length}) ===`);
                
                // Extract ALL potential SKUs using comprehensive method
                const extractedSKUs = extractSKUsFromFilename(image.name, image.fullPath);
                
                console.log(`🔍 Found ${extractedSKUs.length} potential SKUs:`, extractedSKUs.map(s => `${s.sku} (${s.confidence}% - ${s.source})`));
                
                // Process each extracted SKU for potential matches
                for (const skuCandidate of extractedSKUs) {
                  if (skuCandidate.confidence < 30) continue; // Skip very low confidence SKUs
                  
                  const candidateSku = skuCandidate.sku.toLowerCase().trim();
                  
                  // Enhanced product matching with multiple match types
                  const matchingProducts = allProducts.filter(product => {
                    if (!product.sku) return false;
                    
                    const productSku = product.sku.toLowerCase().trim();
                    const removeLeadingZeros = (sku: string) => sku.replace(/^0+/, '') || '0';
                    
                    // Exact match
                    if (productSku === candidateSku) return true;
                    
                    // Zero-padding variations
                    if (removeLeadingZeros(productSku) === removeLeadingZeros(candidateSku)) return true;
                    
                    // Contains matches for longer SKUs
                    if (productSku.length >= 4 && candidateSku.length >= 4) {
                      if (productSku.includes(candidateSku) || candidateSku.includes(productSku)) return true;
                    }
                    
                    return false;
                  });
                  
                  // Process each matching product
                  for (const matchingProduct of matchingProducts) {
                    console.log(`🎯 Match found: ${skuCandidate.sku} (${skuCandidate.confidence}%) → ${matchingProduct.name} (${matchingProduct.sku})`);
                    
                    // Check if product already has an image
                    const { data: existingImage } = await supabase
                      .from('product_images')
                      .select('id')
                      .eq('product_id', matchingProduct.id)
                      .eq('image_status', 'active')
                      .limit(1);

                    if (existingImage && existingImage.length > 0) {
                      console.log(`⏭️ Product ${matchingProduct.name} already has an image, skipping`);
                      continue;
                    }

                    const imageUrl = `${supabaseUrl}/storage/v1/object/public/product-images/${image.fullPath}`;
                    
                    console.log(`🔗 Linking ${image.name} (SKU: ${skuCandidate.sku}) to product ${matchingProduct.name} (${matchingProduct.sku})`);
                    
                    if (skuCandidate.confidence >= 80) {
                      // High confidence - create direct link
                      const { error: insertError } = await supabase
                        .from('product_images')
                        .insert({
                          product_id: matchingProduct.id,
                          image_url: imageUrl,
                          alt_text: `${matchingProduct.name} - ${image.name}`,
                          is_primary: true,
                          sort_order: 1,
                          image_status: 'active',
                          match_confidence: skuCandidate.confidence,
                          match_metadata: {
                            source: skuCandidate.source,
                            filename: image.name,
                            session_id: sessionId,
                            sku_extracted: skuCandidate.sku
                          },
                          auto_matched: true
                        });

                      if (insertError && insertError.code !== '23505') {
                        console.error(`❌ Failed to link ${image.name}:`, insertError);
                        errors.push(`Failed to link ${image.name} to ${matchingProduct.name}: ${insertError.message}`);
                      } else if (!insertError) {
                        console.log(`✅ Successfully linked ${image.name} to ${matchingProduct.name}`);
                        matchedCount++;
                      }
                    } else if (skuCandidate.confidence >= 60) {
                      // Medium confidence - create candidate for manual review
                      const { error: candidateError } = await supabase
                        .from('product_image_candidates')
                        .insert({
                          product_id: matchingProduct.id,
                          image_url: imageUrl,
                          alt_text: `${matchingProduct.name} - ${image.name}`,
                          match_confidence: skuCandidate.confidence,
                          match_metadata: {
                            source: skuCandidate.source,
                            filename: image.name,
                            session_id: sessionId,
                            sku_extracted: skuCandidate.sku
                          },
                          status: 'pending'
                        });

                      if (candidateError && candidateError.code !== '23505') {
                        console.error(`❌ Failed to create candidate for ${image.name}:`, candidateError);
                        errors.push(`Failed to create candidate for ${image.name}: ${candidateError.message}`);
                      } else if (!candidateError) {
                        console.log(`📋 Created candidate for ${image.name} → ${matchingProduct.name} (${skuCandidate.confidence}%)`);
                        matchedCount++;
                      }
                    } else {
                      console.log(`⚠️ Low confidence match for ${image.name} → ${matchingProduct.name} (${skuCandidate.confidence}%), skipping`);
                    }
                    
                    // Rate limiting between operations
                    await new Promise(resolve => setTimeout(resolve, 25));
                  }
                }
              }
              
              // Progress logging every 50 images
              if (imageIndex % 50 === 0 && imageIndex > 0) {
                console.log(`🔄 Progress: ${imageIndex}/${images.length} images processed, ${matchedCount} matches found`);
              }
              
              // Rate limiting every 10 images
              if (imageIndex % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 50));
              }
              
            } catch (error) {
              console.error(`❌ Error processing ${image.name}:`, error);
              errors.push(`Error processing ${image.name}: ${error.message}`);
            }
          }
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