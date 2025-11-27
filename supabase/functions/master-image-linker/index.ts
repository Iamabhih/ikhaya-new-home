import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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

interface ProcessingOptions {
  mode: 'standard' | 'refresh' | 'audit' | 'resume';
  batchSize: number;
  confidenceThreshold: number;
  enableFuzzyMatching: boolean;
  strictSkuMatching: boolean;
  processMultiSku: boolean;
  resumeFromBatch?: number;
}

interface MasterResult {
  sessionId: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  progress: number;
  currentStep: string;
  currentBatch: number;
  totalBatches: number;

  productsScanned: number;
  imagesScanned: number;
  directLinksCreated: number;
  candidatesCreated: number;
  imagesCleared?: number;

  startTime: string;
  endTime?: string;
  totalTime?: number;
  avgProcessingTime?: number;

  matchingStats: {
    exactMatch: number;
    multiSku: number;
    paddedSku: number;
    patternMatch: number;
    fuzzyMatch: number;
  };

  errors: string[];
  warnings: string[];
  debugInfo?: any;

  processingRate?: number;
  timeRemaining?: number;
}

// Streaming batch insert helper - prevents memory buildup
async function streamingBatchInsert(
  supabase: any,
  table: string,
  records: any[],
  batchSize = 500
): Promise<{ success: number; errors: string[] }> {
  let success = 0;
  const errors: string[] = [];

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    try {
      const { error } = await supabase.from(table).insert(batch);

      if (error) {
        if (error.code === '23505') {
          // Duplicate key - try one by one
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
      errors.push(`Exception during batch insert: ${(err as Error).message}`);
    }
  }

  return { success, errors };
}

// Database session management
async function createSession(supabase: any, sessionId: string, options: ProcessingOptions): Promise<void> {
  const { error } = await supabase
    .from('processing_sessions')
    .insert({
      id: sessionId,
      session_type: 'master_image_linker',
      status: 'running',
      progress: 0,
      options: options,
      matching_stats: {
        exactMatch: 0,
        multiSku: 0,
        paddedSku: 0,
        patternMatch: 0,
        fuzzyMatch: 0
      },
      processing_stats: {
        start_time: Date.now(),
        processing_rate: 0,
        estimated_completion: null
      }
    });

  if (error) {
    console.error('Failed to create session:', error);
    throw new Error(`Failed to create processing session: ${error.message}`);
  }
}

async function getSession(supabase: any, sessionId: string): Promise<MasterResult | null> {
  const { data, error } = await supabase
    .from('processing_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error) {
    if (DEBUG) console.warn(`Session not found: ${sessionId}`);
    return null;
  }

  return {
    sessionId: data.id,
    status: data.status,
    progress: data.progress || 0,
    currentStep: 'Processing...',
    currentBatch: data.current_batch || 0,
    totalBatches: data.total_batches || 0,
    productsScanned: data.products_scanned || 0,
    imagesScanned: data.images_scanned || 0,
    directLinksCreated: data.links_created || 0,
    candidatesCreated: data.candidates_created || 0,
    startTime: data.started_at,
    errors: data.errors || [],
    warnings: data.warnings || [],
    matchingStats: data.matching_stats || {
      exactMatch: 0,
      multiSku: 0,
      paddedSku: 0,
      patternMatch: 0,
      fuzzyMatch: 0
    },
    processingRate: data.processing_stats?.processing_rate || 0,
    timeRemaining: data.processing_stats?.estimated_completion
      ? Math.max(0, new Date(data.processing_stats.estimated_completion).getTime() - Date.now()) / 1000
      : undefined
  };
}

async function updateSession(supabase: any, sessionId: string, updates: Partial<MasterResult>): Promise<void> {
  const dbUpdates: any = {
    updated_at: new Date().toISOString()
  };

  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.progress !== undefined) dbUpdates.progress = updates.progress;
  if (updates.currentBatch !== undefined) dbUpdates.current_batch = updates.currentBatch;
  if (updates.totalBatches !== undefined) dbUpdates.total_batches = updates.totalBatches;
  if (updates.productsScanned !== undefined) dbUpdates.products_scanned = updates.productsScanned;
  if (updates.imagesScanned !== undefined) dbUpdates.images_scanned = updates.imagesScanned;
  if (updates.directLinksCreated !== undefined) dbUpdates.links_created = updates.directLinksCreated;
  if (updates.candidatesCreated !== undefined) dbUpdates.candidates_created = updates.candidatesCreated;
  if (updates.errors !== undefined) dbUpdates.errors = updates.errors;
  if (updates.warnings !== undefined) dbUpdates.warnings = updates.warnings;
  if (updates.matchingStats !== undefined) dbUpdates.matching_stats = updates.matchingStats;

  if (updates.processingRate !== undefined || updates.timeRemaining !== undefined) {
    dbUpdates.processing_stats = {};
    if (updates.processingRate !== undefined) {
      dbUpdates.processing_stats.processing_rate = updates.processingRate;
    }
    if (updates.timeRemaining !== undefined) {
      dbUpdates.processing_stats.estimated_completion = new Date(Date.now() + updates.timeRemaining * 1000).toISOString();
    }
  }

  if (updates.status === 'completed' || updates.status === 'failed') {
    dbUpdates.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('processing_sessions')
    .update(dbUpdates)
    .eq('id', sessionId);

  if (error && DEBUG) {
    console.error('Failed to update session:', error);
  }
}

// Master processing function with optimizations
async function runMasterProcessing(
  supabase: any,
  sessionId: string,
  options: ProcessingOptions,
  supabaseUrl: string
): Promise<void> {
  const startProcessingTime = Date.now();

  try {
    if (DEBUG) console.log('MASTER IMAGE LINKER V2 - Starting with optimizations');

    // Initialize session
    await createSession(supabase, sessionId, options);

    // Step 1: Clear existing data if refresh mode
    if (options.mode === 'refresh') {
      await updateSession(supabase, sessionId, { currentStep: 'Clearing existing image links...' });

      const { error: clearError } = await supabase
        .from('product_images')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (clearError) throw clearError;
      if (DEBUG) console.log('Cleared existing product images');
    }

    // Step 2: Load ALL products and build index
    await updateSession(supabase, sessionId, { currentStep: 'Loading products...', progress: 5 });

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, sku, name')
      .eq('is_active', true);

    if (productsError) throw productsError;

    if (DEBUG) console.log(`Loaded ${products.length} products`);
    await updateSession(supabase, sessionId, { productsScanned: products.length });

    // Build pre-indexed lookup for O(1) matching
    const productIndex = buildProductSkuIndex(products);

    // Step 3: Pre-load existing product images to avoid N+1
    const { data: existingImages } = await supabase
      .from('product_images')
      .select('product_id, image_url')
      .eq('image_status', 'active');

    const productsWithImages = new Set<string>(
      existingImages?.map((img: any) => img.product_id) ?? []
    );
    const existingImageUrls = new Set<string>(
      existingImages?.map((img: any) => img.image_url) ?? []
    );

    // Step 4: Scan ALL storage files
    await updateSession(supabase, sessionId, { currentStep: 'Scanning storage files...', progress: 10 });

    const allFiles: any[] = [];
    let offset = 0;
    const scanBatchSize = 1000;
    let hasMoreFiles = true;

    while (hasMoreFiles) {
      const { data: filesBatch } = await supabase.storage
        .from('product-images')
        .list('', {
          limit: scanBatchSize,
          offset: offset,
        });

      if (filesBatch && filesBatch.length > 0) {
        allFiles.push(...filesBatch);
        offset += filesBatch.length;

        if (DEBUG && offset % 5000 === 0) {
          console.log(`Loaded ${allFiles.length} files...`);
        }

        if (filesBatch.length < scanBatchSize) {
          hasMoreFiles = false;
        }
      } else {
        hasMoreFiles = false;
      }

      // Update progress periodically
      const scanProgress = Math.min(10 + (allFiles.length / 50000) * 10, 20);
      await updateSession(supabase, sessionId, { progress: scanProgress });
    }

    // Filter to image files only
    const imageFiles = allFiles.filter(file => {
      const ext = file.name?.toLowerCase().split('.').pop();
      return ext && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
    });

    if (DEBUG) console.log(`Found ${imageFiles.length} image files`);
    await updateSession(supabase, sessionId, {
      imagesScanned: imageFiles.length,
      totalBatches: Math.ceil(imageFiles.length / options.batchSize)
    });

    // Step 5: Process images with streaming batch inserts
    await updateSession(supabase, sessionId, {
      currentStep: 'Processing image-product matching...',
      progress: 25
    });

    const matchingStats = {
      exactMatch: 0,
      multiSku: 0,
      paddedSku: 0,
      patternMatch: 0,
      fuzzyMatch: 0
    };

    // Process in chunks to manage memory
    const MEMORY_BATCH_SIZE = 1000;
    let totalLinksCreated = 0;
    let totalCandidatesCreated = 0;
    let pendingLinks: any[] = [];
    let pendingCandidates: any[] = [];

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const batchNumber = Math.floor(i / options.batchSize) + 1;

      // Check for pause request periodically
      if (i % 100 === 0) {
        const currentSession = await getSession(supabase, sessionId);
        if (currentSession?.status === 'paused') {
          if (DEBUG) console.log('Processing paused by user');
          return;
        }
      }

      try {
        // Extract SKUs using shared module
        const extractedSKUs = extractSKUsFromFilename(file.name, file.name, {
          debug: false,
          minConfidence: options.confidenceThreshold - 20
        });

        if (extractedSKUs.length === 0) continue;

        // Find matching product
        for (const extractedSKU of extractedSKUs) {
          const match = findMatchingProduct(productIndex, extractedSKU.sku);

          if (match) {
            const { product: matchingProduct, matchType } = match;

            // Skip if product already has image (O(1) lookup)
            if (productsWithImages.has(matchingProduct.id)) continue;

            const imageUrl = `${supabaseUrl}/storage/v1/object/public/product-images/${file.name}`;

            // Skip if URL already exists
            if (existingImageUrls.has(imageUrl)) continue;

            const confidence = calculateMatchConfidence(extractedSKU, matchingProduct.sku, matchType);

            const shouldCreateDirectLink =
              confidence >= options.confidenceThreshold &&
              (extractedSKU.source === 'exact_numeric' ||
               extractedSKU.source === 'multi_sku' ||
               extractedSKU.source === 'zero_padded');

            if (shouldCreateDirectLink) {
              pendingLinks.push({
                product_id: matchingProduct.id,
                image_url: imageUrl,
                alt_text: `${matchingProduct.name} - ${file.name}`,
                image_status: 'active',
                match_confidence: confidence,
                match_metadata: {
                  source: extractedSKU.source,
                  filename: file.name,
                  extraction_method: 'master_linker_v2',
                  processed_at: new Date().toISOString()
                },
                auto_matched: true,
                is_primary: true
              });

              // Update stats
              if (extractedSKU.source === 'exact_numeric') matchingStats.exactMatch++;
              else if (extractedSKU.source === 'multi_sku') matchingStats.multiSku++;
              else if (extractedSKU.source === 'zero_padded') matchingStats.paddedSku++;
              else if (extractedSKU.source === 'contextual') matchingStats.patternMatch++;

              // Mark as processed to avoid duplicates
              productsWithImages.add(matchingProduct.id);
              existingImageUrls.add(imageUrl);

            } else if (confidence >= options.confidenceThreshold - 20) {
              pendingCandidates.push({
                product_id: matchingProduct.id,
                image_url: imageUrl,
                alt_text: `${matchingProduct.name} - ${file.name}`,
                match_confidence: confidence,
                match_metadata: {
                  source: extractedSKU.source,
                  filename: file.name,
                  extraction_method: 'master_linker_v2'
                },
                status: 'pending'
              });
            }

            break; // Only match first suitable product
          }
        }
      } catch (error) {
        if (DEBUG) console.error(`Error processing ${file.name}:`, error);
      }

      // Streaming insert: flush when batch is full (memory management)
      if (pendingLinks.length >= MEMORY_BATCH_SIZE) {
        const { success } = await streamingBatchInsert(supabase, 'product_images', pendingLinks);
        totalLinksCreated += success;
        pendingLinks = []; // Clear memory
      }

      if (pendingCandidates.length >= MEMORY_BATCH_SIZE) {
        const { success } = await streamingBatchInsert(supabase, 'product_image_candidates', pendingCandidates);
        totalCandidatesCreated += success;
        pendingCandidates = []; // Clear memory
      }

      // Update progress periodically
      if (i % 500 === 0) {
        const elapsed = Date.now() - startProcessingTime;
        const processingRate = i / (elapsed / 1000);
        const timeRemaining = (imageFiles.length - i) / processingRate;
        const progress = 25 + ((i / imageFiles.length) * 50);

        await updateSession(supabase, sessionId, {
          currentBatch: batchNumber,
          progress,
          processingRate,
          timeRemaining,
          directLinksCreated: totalLinksCreated + pendingLinks.length,
          candidatesCreated: totalCandidatesCreated + pendingCandidates.length,
          matchingStats
        });
      }
    }

    // Step 6: Flush remaining pending records
    await updateSession(supabase, sessionId, {
      currentStep: 'Finalizing database entries...',
      progress: 80
    });

    if (pendingLinks.length > 0) {
      const { success } = await streamingBatchInsert(supabase, 'product_images', pendingLinks);
      totalLinksCreated += success;
    }

    if (pendingCandidates.length > 0) {
      const { success } = await streamingBatchInsert(supabase, 'product_image_candidates', pendingCandidates);
      totalCandidatesCreated += success;
    }

    // Final update
    const totalTime = Date.now() - startProcessingTime;
    await updateSession(supabase, sessionId, {
      status: 'completed',
      progress: 100,
      endTime: new Date().toISOString(),
      totalTime,
      directLinksCreated: totalLinksCreated,
      candidatesCreated: totalCandidatesCreated,
      matchingStats
    });

    console.log(`MASTER PROCESSING COMPLETE: ${totalLinksCreated} links, ${totalCandidatesCreated} candidates in ${totalTime}ms`);

  } catch (error) {
    console.error('Master processing error:', error);
    await updateSession(supabase, sessionId, {
      status: 'failed',
      errors: [`Processing failed: ${(error as Error).message}`]
    });
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, sessionId, ...body } = await req.json();

    if (DEBUG) console.log(`Action: ${action}, Session: ${sessionId}`);

    if (action === 'start') {
      const options: ProcessingOptions = {
        mode: body.mode || 'standard',
        batchSize: body.batchSize || 10000,
        confidenceThreshold: body.confidenceThreshold || 80,
        enableFuzzyMatching: body.enableFuzzyMatching || false,
        strictSkuMatching: body.strictSkuMatching !== false,
        processMultiSku: body.processMultiSku !== false
      };

      // Start processing in background
      runMasterProcessing(supabase, sessionId, options, supabaseUrl).catch(async (error) => {
        console.error('Background processing error:', error);
        await updateSession(supabase, sessionId, {
          status: 'failed',
          errors: [`Background processing failed: ${error.message}`]
        });
      });

      return new Response(JSON.stringify({
        success: true,
        sessionId,
        message: 'Master processing started'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'check_progress') {
      const result = await getSession(supabase, sessionId);
      if (!result) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Session not found',
          sessionId
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        result
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'pause') {
      await updateSession(supabase, sessionId, { status: 'paused' });
      return new Response(JSON.stringify({
        success: true,
        message: 'Processing paused'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: `Unknown action: ${action}`
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Master Image Linker Error:', error);

    return new Response(JSON.stringify({
      success: false,
      error: (error as Error).message,
      details: (error as Error).stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
