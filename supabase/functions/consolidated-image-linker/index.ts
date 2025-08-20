import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessingResult {
  sessionId: string;
  status: 'running' | 'complete' | 'error';
  currentStep: number;
  totalSteps: number;
  stepName: string;
  progress: number;
  
  // Step-specific counters
  candidatesPromoted: number;
  productsScanned: number;
  imagesScanned: number;
  directLinksCreated: number;
  candidatesCreated: number;
  
  // Summary stats
  totalProductsWithoutImages: number;
  totalStorageImages: number;
  
  // Error tracking
  errors: string[];
  stepErrors: { [step: string]: string[] };
  
  // Timing
  startedAt: string;
  completedAt?: string;
  stepTimings: { [step: string]: number };
}

interface ExtractedSKU {
  sku: string;
  confidence: number;
  source: string;
}

// Enhanced SKU extraction with comprehensive pattern matching
function extractSKUsFromFilename(filename: string, fullPath?: string): ExtractedSKU[] {
  const skus: ExtractedSKU[] = [];
  let cleanName = filename.replace(/\.(jpg|jpeg|png|webp|gif|bmp|svg|tiff?)$/i, '');
  cleanName = cleanName.replace(/\.+$/, '');
  
  console.log(`🔍 Extracting SKUs from: ${filename} → ${cleanName}`);
  
  // Strategy 1: Exact numeric filename (highest confidence)
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
  
  // Strategy 2: Multi-SKU handling
  const multiSkuPatterns = [
    /^(\d{3,8}(?:\.\d{3,8})+)\.?$/,
    /^(\d{3,8}(?:[\.\-_]\d{3,8})+)[\.\-_]?[a-zA-Z]*\.?$/,
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

  // Strategy 3: Enhanced pattern matching
  if (!skus.length || cleanName.includes('.')) {
    const enhancedPatterns = [
      /(\d{3,8})(?:[\.\-_][a-zA-Z]+)+/g,
      /^(\d{3,8})[a-zA-Z_\-]+$/g,
      /^[a-zA-Z_\-]+(\d{3,8})$/g,
      /(\d{3,8})/g
    ];

    enhancedPatterns.forEach((pattern, patternIndex) => {
      try {
        const matches = [...cleanName.matchAll(pattern)];
        matches.forEach(match => {
          const numericPart = match[1] || match[0].replace(/[^0-9]/g, '');
          if (/^\d{3,8}$/.test(numericPart) && !skus.find(s => s.sku === numericPart)) {
            let confidence = 60 - (patternIndex * 10);
            
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
        console.log(`✅ Path SKU: ${part}`);
      }
    }
  }
  
  const finalSkus = skus.sort((a, b) => b.confidence - a.confidence);
  console.log(`📊 Total SKUs: ${finalSkus.length}`, finalSkus.map(s => `${s.sku}(${s.confidence}%)`));
  
  return finalSkus;
}

// Helper function to find matching product
const findMatchingProduct = (productSKUs: Array<{id: string, sku: string}>, sku: string) => {
  return productSKUs.find(p => 
    p.sku.toLowerCase() === sku.toLowerCase() ||
    p.sku.replace(/^0+/, '') === sku.replace(/^0+/, '') ||
    sku.replace(/^0+/, '') === p.sku.replace(/^0+/, '')
  );
};

// Comprehensive consolidated processing function
async function runConsolidatedProcessing(supabase: any, sessionId: string, confidenceThreshold: number = 70) {
  const steps = [
    'Initialize Session',
    'Auto-Promote Existing Candidates', 
    'Scan All Products',
    'Scan All Storage Images',
    'Advanced SKU Matching',
    'Create Links & Candidates',
    'Generate Summary Report'
  ];
  
  const result: ProcessingResult = {
    sessionId,
    status: 'running',
    currentStep: 0,
    totalSteps: steps.length,
    stepName: steps[0],
    progress: 0,
    candidatesPromoted: 0,
    productsScanned: 0,
    imagesScanned: 0,
    directLinksCreated: 0,
    candidatesCreated: 0,
    totalProductsWithoutImages: 0,
    totalStorageImages: 0,
    errors: [],
    stepErrors: {},
    startedAt: new Date().toISOString(),
    stepTimings: {}
  };

  const updateProgress = async (stepIndex: number, stepProgress: number = 100) => {
    const overallProgress = Math.round(((stepIndex + (stepProgress / 100)) / steps.length) * 100);
    
    await supabase.from('batch_progress').upsert({
      session_id: sessionId,
      status: result.status,
      progress: overallProgress,
      current_batch: stepIndex + 1,
      total_batches: steps.length,
      links_created: result.directLinksCreated,
      candidates_created: result.candidatesCreated,
      errors: result.errors,
      updated_at: new Date().toISOString(),
      started_at: result.startedAt
    });
    
    result.currentStep = stepIndex;
    result.stepName = steps[stepIndex];
    result.progress = overallProgress;
  };

  try {
    // STEP 1: Initialize Session
    console.log(`\n🚀 STEP 1: Initialize Session - ${sessionId}`);
    const stepStartTime = Date.now();
    
    await updateProgress(0, 0);
    
    // Initialize progress tracking
    await supabase.from('batch_progress').upsert({
      session_id: sessionId,
      status: 'running',
      progress: 0,
      current_batch: 1,
      total_batches: steps.length,
      links_created: 0,
      candidates_created: 0,
      errors: [],
      started_at: result.startedAt
    });
    
    result.stepTimings[steps[0]] = Date.now() - stepStartTime;
    await updateProgress(0, 100);

    // STEP 2: Auto-Promote Existing Candidates
    console.log(`\n🎯 STEP 2: Auto-Promote High-Confidence Candidates (>=${confidenceThreshold}%)`);
    const step2StartTime = Date.now();
    await updateProgress(1, 0);
    
    const { data: candidates, error: candidatesError } = await supabase
      .from('product_image_candidates')
      .select('id, product_id, match_confidence')
      .eq('status', 'pending')
      .gte('match_confidence', confidenceThreshold);

    if (!candidatesError && candidates && candidates.length > 0) {
      console.log(`📋 Found ${candidates.length} high-confidence candidates to promote`);
      
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        try {
          const { error: promoteError } = await supabase.rpc('promote_image_candidate', {
            candidate_id: candidate.id
          });

          if (!promoteError) {
            result.candidatesPromoted++;
            console.log(`✅ Promoted candidate ${candidate.id} (${candidate.match_confidence}%)`);
          }
        } catch (error) {
          const errorMsg = `Failed to promote candidate ${candidate.id}: ${error}`;
          console.error(errorMsg);
          if (!result.stepErrors[steps[1]]) result.stepErrors[steps[1]] = [];
          result.stepErrors[steps[1]].push(errorMsg);
        }
        
        // Update progress during promotion
        await updateProgress(1, ((i + 1) / candidates.length) * 100);
      }
    }
    
    result.stepTimings[steps[1]] = Date.now() - step2StartTime;
    await updateProgress(1, 100);

    // STEP 3: Scan All Products
    console.log(`\n🔍 STEP 3: Scanning All Active Products`);
    const step3StartTime = Date.now();
    await updateProgress(2, 0);
    
    const { data: allProducts, error: productsError } = await supabase
      .from('products')
      .select('id, sku, name')
      .eq('is_active', true)
      .not('sku', 'is', null);

    if (productsError) {
      throw new Error(`Failed to fetch products: ${productsError.message}`);
    }

    // Get products that already have images
    const productIds = allProducts?.map(p => p.id) || [];
    const { data: existingImages } = await supabase
      .from('product_images')
      .select('product_id')
      .in('product_id', productIds)
      .eq('image_status', 'active');

    const existingImageProductIds = new Set(existingImages?.map(img => img.product_id) || []);
    const productsNeedingImages = allProducts?.filter(p => !existingImageProductIds.has(p.id)) || [];

    result.productsScanned = allProducts?.length || 0;
    result.totalProductsWithoutImages = productsNeedingImages.length;
    
    console.log(`📊 Scanned ${result.productsScanned} total products`);
    console.log(`🎯 Found ${result.totalProductsWithoutImages} products needing images`);
    
    result.stepTimings[steps[2]] = Date.now() - step3StartTime;
    await updateProgress(2, 100);

    // STEP 4: Scan All Storage Images
    console.log(`\n📁 STEP 4: Comprehensive Storage Image Scan`);
    const step4StartTime = Date.now();
    await updateProgress(3, 0);
    
    let allStorageFiles: any[] = [];
    let offset = 0;
    const STORAGE_BATCH_SIZE = 500; // Increased batch size
    
    // Fetch ALL storage files without limits
    while (true) {
      const { data: batch, error } = await supabase.storage
        .from('product-images')
        .list('', { 
          limit: STORAGE_BATCH_SIZE, 
          offset,
          sortBy: { column: 'name', order: 'asc' }
        });
        
      if (error) throw error;
      if (!batch || batch.length === 0) break;
      
      const imageFiles = batch.filter(file => 
        file.name && file.name.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)
      );
      
      allStorageFiles.push(...imageFiles.map(file => ({
        name: file.name,
        fullPath: file.name,
        size: file.metadata?.size || 0
      })));
      
      offset += STORAGE_BATCH_SIZE;
      
      // Update progress during scanning
      const scanProgress = Math.min((offset / 2000) * 100, 90); // Estimate progress
      await updateProgress(3, scanProgress);
      
      if (batch.length < STORAGE_BATCH_SIZE) break;
    }

    result.imagesScanned = allStorageFiles.length;
    result.totalStorageImages = allStorageFiles.length;
    
    console.log(`📁 Total storage images found: ${result.totalStorageImages}`);
    
    result.stepTimings[steps[3]] = Date.now() - step4StartTime;
    await updateProgress(3, 100);

    // STEP 5: Advanced SKU Matching
    console.log(`\n🧠 STEP 5: Advanced SKU Matching & Analysis`);
    const step5StartTime = Date.now();
    await updateProgress(4, 0);
    
    const productSKUs = productsNeedingImages.map(p => ({ id: p.id, sku: p.sku }));
    const imageAnalysis: Array<{
      file: any;
      extractedSKUs: ExtractedSKU[];
      bestMatch?: { product: any; sku: ExtractedSKU };
    }> = [];
    
    // Analyze all images for SKU matches
    for (let i = 0; i < allStorageFiles.length; i++) {
      const file = allStorageFiles[i];
      const extractedSKUs = extractSKUsFromFilename(file.name, file.fullPath);
      
      let bestMatch: { product: any; sku: ExtractedSKU } | undefined;
      let bestScore = 0;
      
      for (const extractedSKU of extractedSKUs) {
        const matchedProduct = findMatchingProduct(productSKUs, extractedSKU.sku);
        
        if (matchedProduct && extractedSKU.confidence > bestScore) {
          bestScore = extractedSKU.confidence;
          bestMatch = { product: matchedProduct, sku: extractedSKU };
        }
      }
      
      if (bestMatch) {
        imageAnalysis.push({
          file,
          extractedSKUs,
          bestMatch
        });
      }
      
      // Update progress during analysis
      if (i % 100 === 0) {
        const analysisProgress = ((i + 1) / allStorageFiles.length) * 100;
        await updateProgress(4, analysisProgress);
      }
    }
    
    console.log(`🎯 Found ${imageAnalysis.length} images with potential matches`);
    
    result.stepTimings[steps[4]] = Date.now() - step5StartTime;
    await updateProgress(4, 100);

    // STEP 6: Create Links & Candidates
    console.log(`\n🔗 STEP 6: Creating Links & Candidates`);
    const step6StartTime = Date.now();
    await updateProgress(5, 0);
    
    for (let i = 0; i < imageAnalysis.length; i++) {
      const analysis = imageAnalysis[i];
      
      if (!analysis.bestMatch) continue;
      
      try {
        // Check if link already exists
        const { data: existing } = await supabase
          .from('product_images')
          .select('id')
          .eq('product_id', analysis.bestMatch.product.id)
          .eq('image_status', 'active')
          .limit(1);
          
        if (existing && existing.length > 0) continue;
        
        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(analysis.file.name);
          
        if (analysis.bestMatch.sku.confidence >= 85) {
          // Create direct link for high confidence (≥85%)
          const { error } = await supabase
            .from('product_images')
            .insert({
              product_id: analysis.bestMatch.product.id,
              image_url: publicUrl,
              alt_text: `Product ${analysis.bestMatch.product.sku}`,
              image_status: 'active',
              is_primary: true,
              sort_order: 1,
              match_confidence: analysis.bestMatch.sku.confidence,
              match_metadata: {
                filename: analysis.file.name,
                extraction_method: analysis.bestMatch.sku.source,
                session_id: sessionId,
                processing_mode: 'consolidated'
              },
              auto_matched: true
            });
            
          if (!error) {
            result.directLinksCreated++;
            console.log(`✅ Direct link: ${analysis.file.name} → ${analysis.bestMatch.product.sku} (${analysis.bestMatch.sku.confidence}%)`);
          }
        } else if (analysis.bestMatch.sku.confidence >= confidenceThreshold) {
          // Create candidate for manual review (70-84%)
          const { error } = await supabase
            .from('product_image_candidates')
            .insert({
              product_id: analysis.bestMatch.product.id,
              image_url: publicUrl,
              alt_text: `Product ${analysis.bestMatch.product.sku}`,
              match_confidence: analysis.bestMatch.sku.confidence,
              match_metadata: {
                filename: analysis.file.name,
                extraction_method: analysis.bestMatch.sku.source,
                session_id: sessionId,
                processing_mode: 'consolidated'
              },
              status: 'pending'
            });
            
          if (!error) {
            result.candidatesCreated++;
            console.log(`📋 Candidate: ${analysis.file.name} → ${analysis.bestMatch.product.sku} (${analysis.bestMatch.sku.confidence}%)`);
          }
        }
      } catch (error) {
        const errorMsg = `Error processing ${analysis.file.name}: ${error}`;
        console.error(`❌ ${errorMsg}`);
        result.errors.push(errorMsg);
        if (!result.stepErrors[steps[5]]) result.stepErrors[steps[5]] = [];
        result.stepErrors[steps[5]].push(errorMsg);
      }
      
      // Update progress during linking
      if (i % 50 === 0) {
        const linkProgress = ((i + 1) / imageAnalysis.length) * 100;
        await updateProgress(5, linkProgress);
      }
    }
    
    result.stepTimings[steps[5]] = Date.now() - step6StartTime;
    await updateProgress(5, 100);

    // STEP 7: Generate Summary Report
    console.log(`\n📊 STEP 7: Generating Summary Report`);
    const step7StartTime = Date.now();
    await updateProgress(6, 0);
    
    result.completedAt = new Date().toISOString();
    result.status = 'complete';
    
    // Final progress update
    await supabase.from('batch_progress').upsert({
      session_id: sessionId,
      status: 'complete',
      progress: 100,
      current_batch: steps.length,
      total_batches: steps.length,
      links_created: result.directLinksCreated,
      candidates_created: result.candidatesCreated,
      errors: result.errors,
      completed_at: result.completedAt
    });
    
    result.stepTimings[steps[6]] = Date.now() - step7StartTime;
    await updateProgress(6, 100);

    console.log(`\n🎉 CONSOLIDATED PROCESSING COMPLETE`);
    console.log(`📊 Summary:`);
    console.log(`   • Candidates promoted: ${result.candidatesPromoted}`);
    console.log(`   • Products scanned: ${result.productsScanned}`);
    console.log(`   • Images scanned: ${result.imagesScanned}`);
    console.log(`   • Direct links created: ${result.directLinksCreated}`);
    console.log(`   • Candidates created: ${result.candidatesCreated}`);
    console.log(`   • Total errors: ${result.errors.length}`);
    
    return result;

  } catch (error) {
    console.error(`❌ Processing failed at step ${result.currentStep + 1}: ${error}`);
    
    result.status = 'error';
    result.errors.push(`Processing failed: ${error.message}`);
    result.completedAt = new Date().toISOString();
    
    // Update final error state
    await supabase.from('batch_progress').upsert({
      session_id: sessionId,
      status: 'error',
      errors: result.errors,
      completed_at: result.completedAt
    });
    
    return result;
  }
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

    const config = req.method === 'POST' 
      ? await req.json().catch(() => ({}))
      : {};
    
    const {
      mode = 'consolidated_process',
      session_id,
      confidence_threshold = 70
    } = config;

    // Handle progress check mode
    if (mode === 'check_progress' && session_id) {
      const { data: progress } = await supabase
        .from('batch_progress')
        .select('*')
        .eq('session_id', session_id)
        .single();
        
      if (progress) {
        const timeElapsed = new Date().getTime() - new Date(progress.started_at).getTime();
        return new Response(JSON.stringify({
          sessionId: progress.session_id,
          status: progress.status,
          progress: progress.progress,
          currentBatch: progress.current_batch,
          totalBatches: progress.total_batches,
          linksCreated: progress.links_created,
          candidatesCreated: progress.candidates_created,
          errors: progress.errors || [],
          timeElapsed
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle consolidated processing mode
    if (mode === 'consolidated_process') {
      const sessionId = session_id || crypto.randomUUID();
      console.log(`🚀 Starting consolidated image linking process: ${sessionId}`);
      
      // Use background task for processing
      EdgeRuntime.waitUntil(
        runConsolidatedProcessing(supabase, sessionId, confidence_threshold)
          .catch(error => {
            console.error(`❌ Background processing failed: ${error}`);
          })
      );
      
      return new Response(JSON.stringify({
        sessionId,
        status: 'started',
        message: 'Consolidated processing started in background'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid mode' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Function error:', error);
    return new Response(JSON.stringify({ 
      error: 'Function failed', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});