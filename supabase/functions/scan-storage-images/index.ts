import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

const corsHeaders = getCorsHeaders();
import {
  extractSKUsFromFilename,
  buildProductSkuIndex,
  findMatchingProduct,
  calculateMatchConfidence,
  type ExtractedSKU,
  type ProductSkuIndex,
} from '../_shared/skuExtraction.ts'

const DEBUG = Deno.env.get('DEBUG_MODE') === 'true';

interface ScanResult {
  sessionId: string;
  status: 'scanning' | 'completed' | 'error';
  foundImages: number;
  matchedProducts: number;
  errors: string[];
  stats: {
    directLinks: number;
    candidates: number;
    skipped: number;
    processingTimeMs: number;
  };
}

interface ImageFile {
  name: string;
  fullPath: string;
  folderName: string;
  id?: string;
  metadata?: any;
}

// Batch insert helper for better performance
async function batchInsert(
  supabase: any,
  table: string,
  records: any[],
  batchSize = 100
): Promise<{ success: number; errors: string[] }> {
  let success = 0;
  const errors: string[] = [];

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase.from(table).insert(batch);

    if (error) {
      // Handle duplicate key errors gracefully
      if (error.code === '23505') {
        // Try inserting one by one to get partial success
        for (const record of batch) {
          const { error: singleError } = await supabase.from(table).insert(record);
          if (!singleError) success++;
          else if (singleError.code !== '23505') {
            errors.push(`Insert error: ${singleError.message}`);
          }
        }
      } else {
        errors.push(`Batch insert error: ${error.message}`);
      }
    } else {
      success += batch.length;
    }
  }

  return { success, errors };
}

// Process images in parallel with concurrency limit
async function processWithConcurrency<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number = 10
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const promise = processor(item).then(result => {
      results.push(result);
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      // Remove settled promises
      const settled = executing.filter(p => {
        let isSettled = false;
        p.then(() => { isSettled = true; }).catch(() => { isSettled = true; });
        return isSettled;
      });
      settled.forEach(p => {
        const idx = executing.indexOf(p);
        if (idx > -1) executing.splice(idx, 1);
      });
    }
  }

  await Promise.all(executing);
  return results;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    if (DEBUG) console.log('Storage image scanner called');

    // Generate session ID
    const sessionId = crypto.randomUUID();

    const result: ScanResult = {
      sessionId,
      status: 'scanning',
      foundImages: 0,
      matchedProducts: 0,
      errors: [],
      stats: {
        directLinks: 0,
        candidates: 0,
        skipped: 0,
        processingTimeMs: 0,
      }
    };

    if (req.method === 'POST') {
      if (DEBUG) console.log('Starting comprehensive storage image scan...');

      // Parse request body for scan configuration
      const requestBody = await req.json().catch(() => ({}));
      const scanPath = requestBody.scanPath || '';
      const scanAllFolders = requestBody.scanAllFolders !== false;
      const resetAutoMatched = requestBody.resetAutoMatched !== false;
      const confidenceThreshold = requestBody.confidenceThreshold || 75;
      const candidateThreshold = requestBody.candidateThreshold || 50;

      if (DEBUG) {
        console.log(`Config: scanPath="${scanPath}", scanAllFolders=${scanAllFolders}, resetAutoMatched=${resetAutoMatched}`);
      }

      // Step 1: Optionally reset previous auto-matched entries
      if (resetAutoMatched) {
        if (DEBUG) console.log('Resetting previous auto-matched entries...');
        const { error: resetError } = await supabase
          .from('product_images')
          .delete()
          .eq('auto_matched', true);

        if (resetError) {
          console.warn('Reset warning:', resetError.message);
        }
      }

      // Step 2: Load ALL products and build index (O(1) lookups)
      if (DEBUG) console.log('Loading products and building index...');
      const allProducts: any[] = [];
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

        if (productsBatch.length < productsBatchSize) break;
      }

      if (DEBUG) console.log(`Loaded ${allProducts.length} products`);

      // Build pre-indexed lookup for O(1) matching
      const productIndex = buildProductSkuIndex(allProducts);

      // Step 3: Pre-load existing product images to avoid N+1 queries
      if (DEBUG) console.log('Pre-loading existing product images...');
      const { data: existingImages, error: existingError } = await supabase
        .from('product_images')
        .select('product_id, image_url')
        .eq('image_status', 'active');

      if (existingError) {
        console.warn('Failed to load existing images:', existingError.message);
      }

      // Build a Set for O(1) lookup of products with images
      const productsWithImages = new Set<string>(
        existingImages?.map((img: any) => img.product_id) ?? []
      );
      // Build a Set of existing image URLs to avoid duplicates
      const existingImageUrls = new Set<string>(
        existingImages?.map((img: any) => img.image_url) ?? []
      );

      if (DEBUG) console.log(`Found ${productsWithImages.size} products with existing images`);

      // Step 4: Scan storage for images
      const allImages: ImageFile[] = [];

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

          // Check if it's a directory
          const isDirectory = !item.id && !item.metadata && !item.name.includes('.');

          if (isDirectory) {
            if (DEBUG) console.log(`Found directory: ${fullPath}`);
            if (scanAllFolders) {
              await scanDirectory(fullPath, depth + 1);
            }
          } else if (item.name.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)) {
            allImages.push({
              name: item.name,
              fullPath: fullPath,
              folderName: path || 'root',
              id: item.id,
              metadata: item.metadata,
            });
          }
        }
      };

      // Start scanning
      if (scanAllFolders) {
        await scanDirectory(scanPath);
      } else if (scanPath) {
        const { data: images, error: imagesError } = await supabase.storage
          .from('product-images')
          .list(scanPath, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });

        if (imagesError) {
          throw new Error(`Failed to list images in ${scanPath}: ${imagesError.message}`);
        }

        images?.forEach(img => {
          if (img.name && !img.name.includes('.emptyFolderPlaceholder') &&
              img.name.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)) {
            allImages.push({
              name: img.name,
              fullPath: `${scanPath}/${img.name}`,
              folderName: scanPath,
            });
          }
        });
      } else {
        const { data: images, error: imagesError } = await supabase.storage
          .from('product-images')
          .list('', { limit: 1000, sortBy: { column: 'name', order: 'asc' } });

        if (imagesError) {
          throw new Error(`Failed to list root images: ${imagesError.message}`);
        }

        images?.forEach(img => {
          if (img.name && !img.name.includes('.emptyFolderPlaceholder') &&
              img.name.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)) {
            allImages.push({
              name: img.name,
              fullPath: img.name,
              folderName: 'root',
            });
          }
        });
      }

      result.foundImages = allImages.length;
      if (DEBUG) console.log(`Found ${result.foundImages} images in storage`);

      // Step 5: Process images and collect inserts
      const linksToInsert: any[] = [];
      const candidatesToInsert: any[] = [];
      let skippedCount = 0;

      for (const image of allImages) {
        try {
          // Extract SKUs using shared module
          const extractedSKUs = extractSKUsFromFilename(image.name, image.fullPath, { debug: DEBUG });

          if (extractedSKUs.length === 0) continue;

          // Try to find matching products
          for (const skuCandidate of extractedSKUs) {
            if (skuCandidate.confidence < candidateThreshold) continue;

            const match = findMatchingProduct(productIndex, skuCandidate.sku);

            if (match) {
              const { product: matchingProduct, matchType } = match;

              // Check if product already has an image (O(1) lookup)
              if (productsWithImages.has(matchingProduct.id)) {
                skippedCount++;
                if (DEBUG) console.log(`Skipping ${matchingProduct.name} - already has an image`);
                continue;
              }

              const imageUrl = `${supabaseUrl}/storage/v1/object/public/product-images/${image.fullPath}`;

              // Check if this exact URL is already linked
              if (existingImageUrls.has(imageUrl)) {
                skippedCount++;
                continue;
              }

              const finalConfidence = calculateMatchConfidence(skuCandidate, matchingProduct.sku, matchType);

              if (DEBUG) {
                console.log(`Match: ${image.name} (${skuCandidate.sku}) -> ${matchingProduct.name} (${finalConfidence}%)`);
              }

              if (finalConfidence >= confidenceThreshold) {
                // High confidence - create direct link
                linksToInsert.push({
                  product_id: matchingProduct.id,
                  image_url: imageUrl,
                  alt_text: `${matchingProduct.name} - ${image.name}`,
                  is_primary: true,
                  sort_order: 1,
                  image_status: 'active',
                  match_confidence: finalConfidence,
                  match_metadata: {
                    source: skuCandidate.source,
                    filename: image.name,
                    session_id: sessionId,
                    sku_extracted: skuCandidate.sku,
                    match_type: matchType,
                  },
                  auto_matched: true
                });

                // Mark product as having an image to avoid duplicates
                productsWithImages.add(matchingProduct.id);
                existingImageUrls.add(imageUrl);

              } else if (finalConfidence >= candidateThreshold) {
                // Medium confidence - create candidate for review
                candidatesToInsert.push({
                  product_id: matchingProduct.id,
                  image_url: imageUrl,
                  alt_text: `${matchingProduct.name} - ${image.name}`,
                  match_confidence: finalConfidence,
                  match_metadata: {
                    source: skuCandidate.source,
                    filename: image.name,
                    session_id: sessionId,
                    sku_extracted: skuCandidate.sku,
                    match_type: matchType,
                  },
                  extracted_sku: skuCandidate.sku,
                  source_filename: image.name,
                  status: 'pending'
                });
              }

              // Only match to first suitable product per image
              break;
            }
          }
        } catch (error) {
          console.error(`Error processing ${image.name}:`, error);
          result.errors.push(`Error processing ${image.name}: ${(error as Error).message}`);
        }
      }

      // Step 6: Batch insert all collected records
      if (DEBUG) console.log(`Inserting ${linksToInsert.length} direct links and ${candidatesToInsert.length} candidates...`);

      if (linksToInsert.length > 0) {
        const { success, errors } = await batchInsert(supabase, 'product_images', linksToInsert);
        result.stats.directLinks = success;
        result.errors.push(...errors);
      }

      if (candidatesToInsert.length > 0) {
        const { success, errors } = await batchInsert(supabase, 'product_image_candidates', candidatesToInsert);
        result.stats.candidates = success;
        result.errors.push(...errors);
      }

      result.matchedProducts = result.stats.directLinks + result.stats.candidates;
      result.stats.skipped = skippedCount;
      result.stats.processingTimeMs = Date.now() - startTime;
      result.status = 'completed';

      console.log(`Scan completed: ${result.stats.directLinks} direct links, ${result.stats.candidates} candidates, ${skippedCount} skipped in ${result.stats.processingTimeMs}ms`);
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
        details: (error as Error).message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
