import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

interface ExtractedSKU {
  sku: string;
  confidence: number;
  source: string;
}

// Database session management functions
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
    console.error('❌ Failed to create session:', error);
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
    console.warn(`⚠️ Session not found: ${sessionId}`);
    return null;
  }
  
  // Convert database format to MasterResult format
  return {
    sessionId: data.id,
    status: data.status,
    progress: data.progress,
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
    matchingStats: data.matching_stats || { exactMatch: 0, multiSku: 0, paddedSku: 0, patternMatch: 0, fuzzyMatch: 0 },
    processingRate: data.processing_stats?.processing_rate || 0,
    timeRemaining: data.processing_stats?.estimated_completion ? 
      Math.max(0, new Date(data.processing_stats.estimated_completion).getTime() - Date.now()) / 1000 : undefined
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
    const currentSession = await getSession(supabase, sessionId);
    const processingStats = { ...currentSession?.processingRate ? { processing_rate: currentSession.processingRate } : {} };
    if (updates.processingRate !== undefined) processingStats.processing_rate = updates.processingRate;
    if (updates.timeRemaining !== undefined) {
      (processingStats as any).estimated_completion = new Date(Date.now() + updates.timeRemaining * 1000).toISOString();
    }
    dbUpdates.processing_stats = processingStats;
  }
  
  if (updates.status === 'completed' || updates.status === 'failed') {
    dbUpdates.completed_at = new Date().toISOString();
  }
  
  const { error } = await supabase
    .from('processing_sessions')
    .update(dbUpdates)
    .eq('id', sessionId);
  
  if (error) {
    console.error('❌ Failed to update session:', error);
  }
}

async function pauseSession(supabase: any, sessionId: string): Promise<void> {
  await updateSession(supabase, sessionId, { status: 'paused' });
}

function createSafeSessionResult(sessionId: string): MasterResult {
  return {
    sessionId,
    status: 'running',
    progress: 0,
    currentStep: 'Initializing...',
    currentBatch: 0,
    totalBatches: 0,
    productsScanned: 0,
    imagesScanned: 0,
    directLinksCreated: 0,
    candidatesCreated: 0,
    startTime: new Date().toISOString(),
    matchingStats: {
      exactMatch: 0,
      multiSku: 0,
      paddedSku: 0,
      patternMatch: 0,
      fuzzyMatch: 0,
    },
    errors: [],
    warnings: [],
  };
}

// SKU extraction with strict full SKU matching only
function extractSKUsFromFilename(filename: string): ExtractedSKU[] {
  const results: ExtractedSKU[] = [];
  const cleanFilename = filename.replace(/\.[^/.]+$/, ''); // Remove extension
  
  console.log(`📝 EXTRACTING from: "${filename}" → "${cleanFilename}"`);
  
  // Strategy 1: EXACT NUMERIC - Full SKU as filename (highest priority)
  const exactNumeric = /^(\d{4,8})$/;
  const exactMatch = cleanFilename.match(exactNumeric);
  if (exactMatch) {
    const sku = exactMatch[1];
    results.push({ sku, confidence: 98, source: 'exact_numeric' });
    console.log(`✅ EXACT numeric: ${sku}`);
  }
  
  // Strategy 2: MULTI-SKU PATTERNS - Multiple SKUs in one filename
  const multiSkuPatterns = [
    /^(\d{4,8})\.(\d{4,8})(?:\.(\d{4,8}))?(?:\.(\d{4,8}))?$/, // 12345.67890.11111.22222
    /^(\d{4,8})-(\d{4,8})(?:-(\d{4,8}))?(?:-(\d{4,8}))?$/,   // 12345-67890-11111-22222
    /^(\d{4,8})_(\d{4,8})(?:_(\d{4,8}))?(?:_(\d{4,8}))?$/,   // 12345_67890_11111_22222
  ];
  
  for (const pattern of multiSkuPatterns) {
    const match = cleanFilename.match(pattern);
    if (match && !results.some(r => r.source === 'exact_numeric')) { // Don't override exact matches
      for (let i = 1; i < match.length; i++) {
        if (match[i]) {
          const confidence = 92 - (i - 1) * 2; // First SKU highest confidence
          results.push({ sku: match[i], confidence, source: `multi_sku_${i}` });
          console.log(`✅ Multi-SKU ${i}: ${match[i]} (${confidence}%)`);
        }
      }
      break; // Only use first matching pattern
    }
  }
  
  // Strategy 3: CONTEXTUAL PATTERNS - SKU with context
  if (results.length === 0) {
    const contextualPatterns = [
      /(?:^|[^\d])(\d{4,8})(?:[^\d]|$)/, // SKU surrounded by non-digits
      /IMG_(\d{4,8})_/, // IMG_12345_001.jpg
      /PROD_(\d{4,8})/, // PROD_12345.jpg
      /SKU_(\d{4,8})/, // SKU_12345.jpg
    ];
    
    for (const pattern of contextualPatterns) {
      const match = cleanFilename.match(pattern);
      if (match) {
        const sku = match[1];
        if (!results.some(r => r.sku === sku)) {
          results.push({ sku, confidence: 88, source: 'contextual' });
          console.log(`✅ CONTEXTUAL: ${sku}`);
          break;
        }
      }
    }
  }
  
  // Strategy 4: ZERO-PADDED VARIATIONS - Only if we have exact matches to pad
  if (results.length > 0 && results[0].source === 'exact_numeric') {
    const baseSku = results[0].sku;
    const paddedVariations = [
      baseSku.padStart(6, '0'),
      baseSku.padStart(7, '0'),
      baseSku.padStart(8, '0'),
    ];
    
    paddedVariations.forEach((paddedSku, index) => {
      if (paddedSku !== baseSku && !results.some(r => r.sku === paddedSku)) {
        results.push({ 
          sku: paddedSku, 
          confidence: 94 - index, 
          source: `zero_padded_${paddedSku.length}` 
        });
        console.log(`✅ PADDED: ${paddedSku}`);
      }
    });
  }
  
  // Remove duplicates and sort by confidence
  const uniqueResults = results.filter((result, index, self) => 
    index === self.findIndex(r => r.sku === result.sku)
  ).sort((a, b) => b.confidence - a.confidence);
  
  console.log(`📊 FINAL: ${uniqueResults.length} unique SKUs from "${filename}": [${
    uniqueResults.map(r => `"${r.sku}(${r.confidence}%)"`).join(', ')
  }]`);
  
  return uniqueResults;
}

// Enhanced product matching with full SKU priority
function findMatchingProduct(products: any[], targetSku: string): any | null {
  console.log(`🔍 MATCHING "${targetSku}" against ${products.length} products`);
  
  // Priority 1: Exact SKU match
  const exactMatch = products.find(p => p.sku === targetSku);
  if (exactMatch) {
    console.log(`✅ EXACT match: ${targetSku} → ${exactMatch.sku}`);
    return exactMatch;
  }
  
  // Priority 2: Zero-padded variations
  const paddedVariations = [
    targetSku.padStart(6, '0'),
    targetSku.padStart(7, '0'),
    targetSku.padStart(8, '0'),
    targetSku.replace(/^0+/, ''), // Remove leading zeros
  ];
  
  for (const variation of paddedVariations) {
    if (variation !== targetSku) {
      const match = products.find(p => p.sku === variation);
      if (match) {
        console.log(`✅ PADDED match: ${targetSku} → ${match.sku}`);
        return match;
      }
    }
  }
  
  console.log(`❌ NO match found for: ${targetSku}`);
  return null;
}

// Master processing function with database session management
async function runMasterProcessing(
  supabase: any, 
  sessionId: string, 
  options: ProcessingOptions
): Promise<void> {
  try {
    console.log(`🚀 MASTER IMAGE LINKER V1 - Starting processing with NO SCALE LIMITS`);
    console.log(`📊 Configuration: ${JSON.stringify(options, null, 2)}`);
    
    // Initialize session in database
    await createSession(supabase, sessionId, options);
    
    // Step 1: Clear existing data if refresh mode
    if (options.mode === 'refresh') {
      await updateSession(supabase, sessionId, { currentStep: 'Clearing existing image links...' });
      
      const { error: clearError } = await supabase
        .from('product_images')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
        
      if (clearError) throw clearError;
      console.log(`🧹 CLEARED existing product images`);
    }
    
    // Step 2: Load ALL products (no limits)
    await updateSession(supabase, sessionId, { currentStep: 'Loading products...', progress: 5 });
    
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, sku, name')
      .eq('is_active', true);
      
    if (productsError) throw productsError;
    console.log(`📊 Loaded ${products.length} products`);
    await updateSession(supabase, sessionId, { productsScanned: products.length });
    
    // Step 3: Scan ALL storage files (no limits)
    await updateSession(supabase, sessionId, { currentStep: 'Scanning storage files...', progress: 10 });
    
    const allFiles: any[] = [];
    let offset = 0;
    const batchSize = 10000; // Large batches for efficiency
    let hasMoreFiles = true;
    
    while (hasMoreFiles) {
      const { data: filesBatch } = await supabase.storage
        .from('product-images')
        .list('', {
          limit: batchSize,
          offset: offset,
        });
        
      if (filesBatch && filesBatch.length > 0) {
        allFiles.push(...filesBatch);
        offset += filesBatch.length;
        console.log(`📁 Loaded ${filesBatch.length} files (total: ${allFiles.length})`);
        
        if (filesBatch.length < batchSize) {
          hasMoreFiles = false;
        }
      } else {
        hasMoreFiles = false;
      }
      
      // Update progress
      const scanProgress = Math.min(10 + (allFiles.length / 50000) * 10, 20);
      await updateSession(supabase, sessionId, { progress: scanProgress });
    }
    
    // Filter to image files only
    const imageFiles = allFiles.filter(file => {
      const ext = file.name.toLowerCase().split('.').pop();
      return ext && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
    });
    
    console.log(`📊 Found ${imageFiles.length} image files out of ${allFiles.length} total files`);
    await updateSession(supabase, sessionId, { imagesScanned: imageFiles.length });
    
    // Step 4: Process images in large batches
    await updateSession(supabase, sessionId, { 
      currentStep: 'Processing image-product matching...', 
      progress: 25, 
      totalBatches: Math.ceil(imageFiles.length / options.batchSize) 
    });
    
    const startProcessingTime = Date.now();
    const linksToCreate: any[] = [];
    const candidatesToCreate: any[] = [];
    let currentSession = await getSession(supabase, sessionId);
    const matchingStats = { ...currentSession?.matchingStats };
    
    for (let i = 0; i < imageFiles.length; i += options.batchSize) {
      const batch = imageFiles.slice(i, i + options.batchSize);
      const batchNumber = Math.floor(i / options.batchSize) + 1;
      
      await updateSession(supabase, sessionId, {
        currentBatch: batchNumber,
        currentStep: `Processing batch ${batchNumber}/${Math.ceil(imageFiles.length / options.batchSize)}...`
      });
      
      console.log(`\n📦 Processing batch ${batchNumber}/${Math.ceil(imageFiles.length / options.batchSize)} (${batch.length} files)`);
      
      for (const file of batch) {
        try {
          // Check if session is paused
          currentSession = await getSession(supabase, sessionId);
          if (currentSession?.status === 'paused') {
            console.log('⏸️ Processing paused by user');
            return;
          }
          
          // Extract SKUs with strict full SKU matching
          const extractedSKUs = extractSKUsFromFilename(file.name);
          
          if (extractedSKUs.length === 0) {
            continue;
          }
          
          // Find best matching product for each SKU
          for (const extractedSKU of extractedSKUs) {
            if (!options.strictSkuMatching || extractedSKU.confidence >= options.confidenceThreshold) {
              const matchingProduct = findMatchingProduct(products, extractedSKU.sku);
              
              if (matchingProduct) {
                const imageUrl = `https://kauostzhxqoxggwqgtym.supabase.co/storage/v1/object/public/product-images/${file.name}`;
                
                // Determine if this should be a direct link or candidate
                const shouldCreateDirectLink = 
                  extractedSKU.confidence >= options.confidenceThreshold &&
                  (extractedSKU.source === 'exact_numeric' || 
                   extractedSKU.source.startsWith('multi_sku') ||
                   extractedSKU.source.startsWith('zero_padded'));
                
                if (shouldCreateDirectLink) {
                  // Check if link already exists
                  const { data: existingLink } = await supabase
                    .from('product_images')
                    .select('id')
                    .eq('product_id', matchingProduct.id)
                    .eq('image_url', imageUrl)
                    .single();
                    
                  if (!existingLink) {
                    linksToCreate.push({
                      product_id: matchingProduct.id,
                      image_url: imageUrl,
                      alt_text: `${matchingProduct.name} - ${file.name}`,
                      image_status: 'active',
                      match_confidence: extractedSKU.confidence,
                      match_metadata: {
                        source: extractedSKU.source,
                        filename: file.name,
                        extraction_method: 'master_linker_v1',
                        processed_at: new Date().toISOString()
                      },
                      auto_matched: true,
                      is_primary: linksToCreate.filter(l => l.product_id === matchingProduct.id).length === 0
                    });
                    
                    // Update matching stats
                    if (extractedSKU.source === 'exact_numeric') (matchingStats as any).exactMatch++;
                    else if (extractedSKU.source.startsWith('multi_sku')) (matchingStats as any).multiSku++;
                    else if (extractedSKU.source.startsWith('zero_padded')) (matchingStats as any).paddedSku++;
                    else if (extractedSKU.source === 'contextual') (matchingStats as any).patternMatch++;
                    
                    console.log(`🎯 LINK: ${file.name} → ${matchingProduct.sku} (${extractedSKU.confidence}%)`);
                  }
                } else {
                  // Create candidate for manual review
                  candidatesToCreate.push({
                    product_id: matchingProduct.id,
                    image_url: imageUrl,
                    alt_text: `${matchingProduct.name} - ${file.name}`,
                    match_confidence: extractedSKU.confidence,
                    match_metadata: {
                      source: extractedSKU.source,
                      filename: file.name,
                      extraction_method: 'master_linker_v1',
                      processed_at: new Date().toISOString()
                    },
                    status: 'pending'
                  });
                  
                  console.log(`📋 CANDIDATE: ${file.name} → ${matchingProduct.sku} (${extractedSKU.confidence}%)`);
                }
                
                break; // Only match to first suitable product per file
              }
            }
          }
        } catch (error) {
          currentSession = await getSession(supabase, sessionId);
          const errors = [...(currentSession?.errors || []), `Error processing ${file.name}: ${(error as Error).message}`];
          await updateSession(supabase, sessionId, { errors });
          console.error(`❌ Error processing ${file.name}:`, error);
        }
      }
      
      // Update progress and performance metrics
      const currentTime = Date.now();
      const elapsed = currentTime - startProcessingTime;
      const processedItems = i + batch.length;
      const processingRate = processedItems / (elapsed / 1000);
      const timeRemaining = (imageFiles.length - processedItems) / processingRate;
      const progress = 25 + ((processedItems / imageFiles.length) * 50);
      
      await updateSession(supabase, sessionId, {
        progress,
        processingRate,
        timeRemaining,
        directLinksCreated: linksToCreate.length,
        candidatesCreated: candidatesToCreate.length,
        matchingStats: matchingStats as any
      });
      
      // Small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Step 5: Bulk insert links and candidates
    await updateSession(supabase, sessionId, { 
      currentStep: 'Creating database entries...', 
      progress: 80 
    });
    
    if (linksToCreate.length > 0) {
      console.log(`💾 Inserting ${linksToCreate.length} direct links...`);
      const linkChunkSize = 1000;
      for (let i = 0; i < linksToCreate.length; i += linkChunkSize) {
        const chunk = linksToCreate.slice(i, i + linkChunkSize);
        const { error: linkError } = await supabase
          .from('product_images')
          .insert(chunk);
          
        if (linkError) {
          console.error('Link insertion error:', linkError);
          currentSession = await getSession(supabase, sessionId);
          const errors = [...(currentSession?.errors || []), `Failed to insert links: ${linkError.message}`];
          await updateSession(supabase, sessionId, { errors });
        }
      }
    }
    
    if (candidatesToCreate.length > 0) {
      console.log(`💾 Inserting ${candidatesToCreate.length} candidates...`);
      const candidateChunkSize = 1000;
      for (let i = 0; i < candidatesToCreate.length; i += candidateChunkSize) {
        const chunk = candidatesToCreate.slice(i, i + candidateChunkSize);
        const { error: candidateError } = await supabase
          .from('product_image_candidates')
          .insert(chunk);
          
        if (candidateError) {
          console.error('Candidate insertion error:', candidateError);
          currentSession = await getSession(supabase, sessionId);
          const errors = [...(currentSession?.errors || []), `Failed to insert candidates: ${candidateError.message}`];
          await updateSession(supabase, sessionId, { errors });
        }
      }
    }
    
    // Final update
    const totalTime = Date.now() - startProcessingTime;
    await updateSession(supabase, sessionId, {
      status: 'completed',
      progress: 100,
      endTime: new Date().toISOString(),
      totalTime,
      directLinksCreated: linksToCreate.length,
      candidatesCreated: candidatesToCreate.length
    });

    console.log(`✅ MASTER PROCESSING COMPLETE:`);
    console.log(`📊 Products: ${products.length}, Images: ${imageFiles.length}`);
    console.log(`🔗 Direct Links: ${linksToCreate.length}, Candidates: ${candidatesToCreate.length}`);
    console.log(`⏱️ Total Time: ${totalTime}ms (${(totalTime / imageFiles.length).toFixed(2)}ms per image)`);
    
  } catch (error) {
    console.error('❌ Master processing error:', error);
    await updateSession(supabase, sessionId, {
      status: 'failed',
      errors: [`Processing failed: ${(error as Error).message}`]
    });
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { action, sessionId, ...body } = await req.json();
    
    console.log(`📨 Action: ${action}, Session: ${sessionId}`);

    if (action === 'start') {
      const options: ProcessingOptions = {
        mode: body.mode || 'standard',
        batchSize: body.batchSize || 10000,
        confidenceThreshold: body.confidenceThreshold || 80,
        enableFuzzyMatching: body.enableFuzzyMatching || false,
        strictSkuMatching: body.strictSkuMatching !== false,
        processMultiSku: body.processMultiSku !== false
      };

      // Start processing in background (don't await)
      runMasterProcessing(supabase, sessionId, options).catch(async (error) => {
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
      await pauseSession(supabase, sessionId);
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
    console.error('❌ Master Image Linker Error:', error);
    
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