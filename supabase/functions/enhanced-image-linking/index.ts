import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractedSKU {
  sku: string;
  confidence: number;
  source: string;
}

interface ScanResult {
  sessionId: string;
  status: 'complete' | 'error';
  scannedFiles: number;
  candidatesCreated: number;
  directMatches: number;
  errors?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const sessionId = crypto.randomUUID();
    const result: ScanResult = {
      sessionId,
      status: 'complete',
      scannedFiles: 0,
      candidatesCreated: 0,
      directMatches: 0,
      errors: []
    };

    console.log(`Starting enhanced image linking session: ${sessionId}`);

    // Get request body for configuration
    const body = req.method === 'POST' ? await req.json() : {};
    const { scanPath = '', scanAllFolders = false, confidenceThreshold = 60 } = body;

    // Recursively scan storage bucket
    const scanFolder = async (path: string = ''): Promise<string[]> => {
      const { data: files, error } = await supabase.storage
        .from('product-images')
        .list(path, { limit: 1000 });

      if (error) {
        console.error(`Error scanning folder ${path}:`, error);
        return [];
      }

      let allFiles: string[] = [];

      for (const file of files || []) {
        const fullPath = path ? `${path}/${file.name}` : file.name;
        
        if (file.metadata && !file.name.includes('.') && scanAllFolders) {
          // This is a folder, scan recursively
          const subFiles = await scanFolder(fullPath);
          allFiles = allFiles.concat(subFiles);
        } else if (file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          // This is an image file
          allFiles.push(fullPath);
        }
      }

      return allFiles;
    };

    const imageFiles = await scanFolder(scanPath);
    result.scannedFiles = imageFiles.length;

    console.log(`Found ${imageFiles.length} image files to process`);

    // Fetch all products for matching
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, sku, name')
      .eq('is_active', true);

    if (productsError) {
      throw new Error(`Failed to fetch products: ${productsError.message}`);
    }

    console.log(`Loaded ${products?.length || 0} products for matching`);

    // Enhanced SKU extraction function
    const extractSKUsFromFilename = (filename: string, fullPath?: string): ExtractedSKU[] => {
      const skus: ExtractedSKU[] = [];
      const cleanFilename = filename.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
      
      // Strategy 1: Exact filename match (highest confidence)
      const exactMatch = products?.find(p => 
        p.sku && cleanFilename.toLowerCase() === p.sku.toLowerCase()
      );
      if (exactMatch) {
        skus.push({
          sku: exactMatch.sku,
          confidence: 95,
          source: 'exact_filename'
        });
      }

      // Strategy 2: Multiple SKUs in filename (e.g., "20729.20730.453443.png")
      const multiSkuPattern = /^(\d+(?:\.\d+)+)$/;
      const multiSkuMatch = cleanFilename.match(multiSkuPattern);
      if (multiSkuMatch) {
        const potentialSkus = cleanFilename.split('.');
        potentialSkus.forEach(sku => {
          const matchedProduct = products?.find(p => 
            p.sku && p.sku.toLowerCase() === sku.toLowerCase()
          );
          if (matchedProduct && !skus.find(s => s.sku === matchedProduct.sku)) {
            skus.push({
              sku: matchedProduct.sku,
              confidence: 85,
              source: 'multi_sku'
            });
          }
        });
      }

      // Strategy 3: SKU with prefix/suffix (e.g., "IMG_12345_001")
      const patterns = [
        /(?:IMG_|PHOTO_|PIC_)?(\w+)(?:_\d+|_[A-Z]+)?/i,
        /(\d{4,})/g,
        /([A-Z]+\d+)/gi,
        /(\d+[A-Z]+)/gi
      ];

      patterns.forEach(pattern => {
        const matches = cleanFilename.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const cleanMatch = match.replace(/^(IMG_|PHOTO_|PIC_)/i, '').replace(/_.*$/, '');
            const matchedProduct = products?.find(p => 
              p.sku && (
                p.sku.toLowerCase() === cleanMatch.toLowerCase() ||
                p.sku.toLowerCase().includes(cleanMatch.toLowerCase()) ||
                cleanMatch.toLowerCase().includes(p.sku.toLowerCase())
              )
            );
            if (matchedProduct && !skus.find(s => s.sku === matchedProduct.sku)) {
              const confidence = p.sku.toLowerCase() === cleanMatch.toLowerCase() ? 80 : 65;
              skus.push({
                sku: matchedProduct.sku,
                confidence,
                source: 'pattern_match'
              });
            }
          });
        }
      });

      // Strategy 4: Fuzzy matching with Levenshtein distance
      if (skus.length === 0 || skus.every(s => s.confidence < 70)) {
        products?.forEach(product => {
          if (product.sku) {
            const distance = levenshteinDistance(
              cleanFilename.toLowerCase(), 
              product.sku.toLowerCase()
            );
            const maxLength = Math.max(cleanFilename.length, product.sku.length);
            const similarity = ((maxLength - distance) / maxLength) * 100;
            
            if (similarity >= 60 && !skus.find(s => s.sku === product.sku)) {
              skus.push({
                sku: product.sku,
                confidence: Math.round(similarity),
                source: 'fuzzy_match'
              });
            }
          }
        });
      }

      // Strategy 5: Path-based extraction (e.g., "/products/ABC123/image.jpg")
      if (fullPath) {
        const pathParts = fullPath.split('/');
        pathParts.forEach(part => {
          const matchedProduct = products?.find(p => 
            p.sku && p.sku.toLowerCase() === part.toLowerCase()
          );
          if (matchedProduct && !skus.find(s => s.sku === matchedProduct.sku)) {
            skus.push({
              sku: matchedProduct.sku,
              confidence: 75,
              source: 'path_based'
            });
          }
        });
      }

      return skus.sort((a, b) => b.confidence - a.confidence);
    };

    // Levenshtein distance function
    const levenshteinDistance = (str1: string, str2: string): number => {
      const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
      
      for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
      for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
      
      for (let j = 1; j <= str2.length; j++) {
        for (let i = 1; i <= str1.length; i++) {
          const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
          matrix[j][i] = Math.min(
            matrix[j][i - 1] + 1,
            matrix[j - 1][i] + 1,
            matrix[j - 1][i - 1] + indicator
          );
        }
      }
      
      return matrix[str2.length][str1.length];
    };

    // Process each image file
    for (const imagePath of imageFiles) {
      try {
        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(imagePath);

        const filename = imagePath.split('/').pop() || '';
        const extractedSKUs = extractSKUsFromFilename(filename, imagePath);

        console.log(`Processing ${filename}: found ${extractedSKUs.length} potential SKU matches`);

        for (const extractedSKU of extractedSKUs) {
          const product = products?.find(p => p.sku === extractedSKU.sku);
          if (!product) continue;

          // Check if this image already exists for this product
          const { data: existingImage } = await supabase
            .from('product_images')
            .select('id')
            .eq('product_id', product.id)
            .eq('image_url', publicUrl)
            .single();

          if (existingImage) {
            console.log(`Image already exists for product ${product.sku}, skipping`);
            continue;
          }

          // High confidence matches go directly to product_images
          if (extractedSKU.confidence >= 85) {
            const { error: insertError } = await supabase
              .from('product_images')
              .insert({
                product_id: product.id,
                image_url: publicUrl,
                alt_text: `${product.name} - ${filename}`,
                sort_order: 999,
                image_status: 'active',
                match_confidence: extractedSKU.confidence,
                match_metadata: {
                  source: extractedSKU.source,
                  filename,
                  extracted_sku: extractedSKU.sku,
                  session_id: sessionId
                },
                auto_matched: true
              });

            if (insertError) {
              console.error(`Error creating direct match for ${filename}:`, insertError);
              result.errors?.push(`Direct match error for ${filename}: ${insertError.message}`);
            } else {
              result.directMatches++;
              console.log(`Created direct match: ${filename} -> ${product.sku} (${extractedSKU.confidence}%)`);
            }
          } 
          // Lower confidence matches go to candidates table
          else if (extractedSKU.confidence >= confidenceThreshold) {
            const { error: candidateError } = await supabase
              .from('product_image_candidates')
              .insert({
                product_id: product.id,
                image_url: publicUrl,
                alt_text: `${product.name} - ${filename}`,
                match_confidence: extractedSKU.confidence,
                match_metadata: {
                  source: extractedSKU.source,
                  filename,
                  session_id: sessionId
                },
                extracted_sku: extractedSKU.sku,
                source_filename: filename,
                status: 'pending'
              });

            if (candidateError) {
              console.error(`Error creating candidate for ${filename}:`, candidateError);
              result.errors?.push(`Candidate error for ${filename}: ${candidateError.message}`);
            } else {
              result.candidatesCreated++;
              console.log(`Created candidate: ${filename} -> ${product.sku} (${extractedSKU.confidence}%)`);
            }
          }
        }
      } catch (error) {
        console.error(`Error processing ${imagePath}:`, error);
        result.errors?.push(`Processing error for ${imagePath}: ${error.message}`);
      }
    }

    console.log(`Enhanced image linking completed:`, result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Enhanced image linking error:', error);
    return new Response(
      JSON.stringify({ 
        sessionId: 'error',
        status: 'error', 
        error: error.message,
        scannedFiles: 0,
        candidatesCreated: 0,
        directMatches: 0
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});