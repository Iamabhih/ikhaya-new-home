// supabase/functions/link-product-images/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import {
  extractSKUsFromFilename,
  buildProductSkuIndex,
  findMatchingProduct,
  calculateMatchConfidence,
  type ExtractedSKU,
  type ProductSkuIndex,
} from '../_shared/skuExtraction.ts'

const DEBUG = Deno.env.get('DEBUG_MODE') === 'true';

interface LinkingConfig {
  bucketName: string;
  confidenceThreshold: number;
  candidateThreshold: number;
  batchSize: number;
  skipExisting: boolean;
  scanPath: string;
  limit: number;
  autoSetPrimary: boolean;
  allowMultipleImages: boolean;
  maxImagesPerProduct: number;
}

interface LinkingResult {
  success: boolean;
  sessionId: string;
  stats: {
    productsFound: number;
    productsWithExistingImages: number;
    imagesScanned: number;
    matchesFound: number;
    directLinks: number;
    candidates: number;
    skipped: number;
    errors: number;
    processingTimeMs: number;
  };
  errors: string[];
  message: string;
}

// Batch insert with duplicate handling
async function batchInsert(
  supabase: any,
  table: string,
  records: any[],
  batchSize = 50
): Promise<{ success: number; errors: string[] }> {
  let success = 0;
  const errors: string[] = [];

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    try {
      const { error } = await supabase.from(table).insert(batch);

      if (error) {
        if (error.code === '23505') {
          // Duplicate key - try one by one for partial success
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
    } catch (err) {
      errors.push(`Exception: ${(err as Error).message}`);
    }

    // Small delay between batches
    if (i + batchSize < records.length) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  return { success, errors };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const sessionId = crypto.randomUUID();

  if (DEBUG) console.log(`[${sessionId}] Starting image linking process`);

  try {
    // Parse configuration
    const config: LinkingConfig = {
      bucketName: 'product-images',
      confidenceThreshold: 85,
      candidateThreshold: 50,
      batchSize: 50,
      skipExisting: false,
      scanPath: '',
      limit: 10000,
      autoSetPrimary: true,
      allowMultipleImages: true,
      maxImagesPerProduct: 10,
    };

    try {
      const body = await req.json();
      Object.assign(config, body);
    } catch {
      if (DEBUG) console.log('No request body, using defaults');
    }

    if (DEBUG) console.log('Configuration:', config);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Step 1: Load all products and build index
    if (DEBUG) console.log('Step 1: Loading products...');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, sku, name')
      .not('sku', 'is', null)
      .eq('is_active', true)
      .order('sku', { ascending: true });

    if (productsError) {
      throw new Error(`Failed to fetch products: ${productsError.message}`);
    }

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          sessionId,
          stats: {
            productsFound: 0,
            productsWithExistingImages: 0,
            imagesScanned: 0,
            matchesFound: 0,
            directLinks: 0,
            candidates: 0,
            skipped: 0,
            errors: 0,
            processingTimeMs: Date.now() - startTime,
          },
          errors: [],
          message: 'No active products with SKUs found'
        } as LinkingResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (DEBUG) console.log(`Found ${products.length} products`);

    // Build pre-indexed lookup for O(1) matching
    const productIndex = buildProductSkuIndex(products);

    // Step 2: Pre-load existing product images
    if (DEBUG) console.log('Step 2: Loading existing images...');
    const { data: existingImages } = await supabase
      .from('product_images')
      .select('product_id, image_url, is_primary');

    // Build lookup maps
    const productImageCounts = new Map<string, number>();
    const productsWithPrimaryImages = new Set<string>();
    const existingImageUrls = new Set<string>();

    existingImages?.forEach((img: any) => {
      const count = productImageCounts.get(img.product_id) || 0;
      productImageCounts.set(img.product_id, count + 1);
      existingImageUrls.add(img.image_url);
      if (img.is_primary) {
        productsWithPrimaryImages.add(img.product_id);
      }
    });

    if (DEBUG) console.log(`Found ${productImageCounts.size} products with existing images`);

    // Step 3: Scan storage bucket
    if (DEBUG) console.log(`Step 3: Scanning storage bucket: ${config.bucketName}/${config.scanPath}`);

    interface ImageFile {
      filename: string;
      path: string;
      extractedSkus: ExtractedSKU[];
    }

    const allImages: ImageFile[] = [];

    // Recursive folder scanner
    async function scanFolder(path: string = '', depth: number = 0): Promise<void> {
      if (depth > 10 || allImages.length >= config.limit) return;

      let offset = 0;
      let hasMore = true;

      while (hasMore && allImages.length < config.limit) {
        const { data: files, error: listError } = await supabase.storage
          .from(config.bucketName)
          .list(path, {
            limit: 1000,
            offset,
            sortBy: { column: 'name', order: 'asc' }
          });

        if (listError || !files || files.length === 0) {
          hasMore = false;
          break;
        }

        for (const file of files) {
          if (!file.name || allImages.length >= config.limit) continue;

          const fullPath = path ? `${path}/${file.name}` : file.name;

          // Check if directory
          const isDirectory = !file.metadata && !file.id && !file.name.includes('.');

          if (isDirectory) {
            await scanFolder(fullPath, depth + 1);
          } else if (file.name.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)) {
            // Extract SKUs using shared module
            const extractedSkus = extractSKUsFromFilename(file.name, fullPath, {
              debug: false,
              minConfidence: config.candidateThreshold - 10,
            });

            allImages.push({
              filename: file.name,
              path: fullPath,
              extractedSkus,
            });
          }
        }

        offset += 1000;
        if (files.length < 1000) hasMore = false;
      }
    }

    await scanFolder(config.scanPath);

    if (DEBUG) console.log(`Found ${allImages.length} images`);

    // Step 4: Match images to products
    if (DEBUG) console.log('Step 4: Matching images to products...');

    const directLinksToInsert: any[] = [];
    const candidatesToInsert: any[] = [];
    let skippedCount = 0;

    for (const image of allImages) {
      if (image.extractedSkus.length === 0) continue;

      // Find best matching product
      for (const extractedSku of image.extractedSkus) {
        const match = findMatchingProduct(productIndex, extractedSku.sku);

        if (match) {
          const { product, matchType } = match;

          // Skip logic
          const currentImageCount = productImageCounts.get(product.id) || 0;

          if (config.skipExisting && productsWithPrimaryImages.has(product.id)) {
            skippedCount++;
            continue;
          }

          if (currentImageCount >= config.maxImagesPerProduct) {
            skippedCount++;
            continue;
          }

          const imageUrl = `${supabaseUrl}/storage/v1/object/public/${config.bucketName}/${image.path}`;

          // Skip if URL already exists
          if (existingImageUrls.has(imageUrl)) {
            skippedCount++;
            continue;
          }

          const confidence = calculateMatchConfidence(extractedSku, product.sku, matchType);

          if (confidence >= config.confidenceThreshold) {
            // High confidence - direct link
            directLinksToInsert.push({
              product_id: product.id,
              image_url: imageUrl,
              alt_text: `${product.name} - ${image.filename}`,
              is_primary: config.autoSetPrimary && !productsWithPrimaryImages.has(product.id),
              sort_order: currentImageCount,
              image_status: 'active',
              match_confidence: confidence,
              match_metadata: {
                source: extractedSku.source,
                filename: image.filename,
                session_id: sessionId,
                match_type: matchType,
              },
              auto_matched: true
            });

            // Update tracking
            productImageCounts.set(product.id, currentImageCount + 1);
            existingImageUrls.add(imageUrl);
            if (!productsWithPrimaryImages.has(product.id)) {
              productsWithPrimaryImages.add(product.id);
            }

          } else if (confidence >= config.candidateThreshold) {
            // Lower confidence - candidate for review
            candidatesToInsert.push({
              product_id: product.id,
              image_url: imageUrl,
              alt_text: `${product.name} - ${image.filename}`,
              match_confidence: confidence,
              match_metadata: {
                source: extractedSku.source,
                filename: image.filename,
                session_id: sessionId,
                match_type: matchType,
              },
              extracted_sku: extractedSku.sku,
              source_filename: image.filename,
              status: 'pending'
            });
          }

          // Only match to first suitable product
          break;
        }
      }
    }

    if (DEBUG) {
      console.log(`Found ${directLinksToInsert.length} direct links and ${candidatesToInsert.length} candidates`);
    }

    // Step 5: Batch insert results
    if (DEBUG) console.log('Step 5: Inserting records...');

    let directLinksSuccess = 0;
    let candidatesSuccess = 0;
    const allErrors: string[] = [];

    if (directLinksToInsert.length > 0) {
      const { success, errors } = await batchInsert(supabase, 'product_images', directLinksToInsert, config.batchSize);
      directLinksSuccess = success;
      allErrors.push(...errors);
    }

    if (candidatesToInsert.length > 0) {
      const { success, errors } = await batchInsert(supabase, 'product_image_candidates', candidatesToInsert, config.batchSize);
      candidatesSuccess = success;
      allErrors.push(...errors);
    }

    const processingTimeMs = Date.now() - startTime;

    const result: LinkingResult = {
      success: true,
      sessionId,
      stats: {
        productsFound: products.length,
        productsWithExistingImages: productImageCounts.size,
        imagesScanned: allImages.length,
        matchesFound: directLinksToInsert.length + candidatesToInsert.length,
        directLinks: directLinksSuccess,
        candidates: candidatesSuccess,
        skipped: skippedCount,
        errors: allErrors.length,
        processingTimeMs,
      },
      errors: allErrors.slice(0, 20),
      message: `Linked ${directLinksSuccess} images, created ${candidatesSuccess} candidates (${skippedCount} skipped) in ${processingTimeMs}ms`
    };

    console.log(`[${sessionId}] Process completed:`, result.stats);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error(`[${sessionId}] Fatal error:`, error);

    return new Response(
      JSON.stringify({
        success: false,
        sessionId,
        stats: {
          productsFound: 0,
          productsWithExistingImages: 0,
          imagesScanned: 0,
          matchesFound: 0,
          directLinks: 0,
          candidates: 0,
          skipped: 0,
          errors: 1,
          processingTimeMs: Date.now() - startTime,
        },
        errors: [error.message],
        message: `Failed: ${error.message}`
      } as LinkingResult),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
