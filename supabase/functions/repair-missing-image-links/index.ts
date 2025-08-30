import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RepairResult {
  sessionId: string;
  status: 'complete' | 'error';
  productsChecked: number;
  imagesFound: number;
  linksCreated: number;
  candidatesPromoted: number;
  candidatesCreated: number;
  skippedExisting: number;
  matchingStats: {
    exact: number;
    zeropadded: number;
    multisku: number;
    pattern: number;
    contains: number;
  };
  errors: string[];
}

interface ExtractedSKU {
  sku: string;
  confidence: number;
  source: string;
}

interface RepairConfig {
  mode?: string;
  force_rescan?: boolean;
  enhanced_matching?: boolean;
  confidence_threshold?: number;
  comprehensive_scan?: boolean;
  auto_promote_candidates?: boolean;
  session_id?: string;
  batch_size?: number;
}

// Helper functions (declared first to avoid "before initialization" errors)
const findMatchingProduct = (productSKUs: Array<{id: string, sku: string}>, sku: string) => {
  return productSKUs.find(p => 
    p.sku.toLowerCase() === sku.toLowerCase() ||
    p.sku.replace(/^0+/, '') === sku.replace(/^0+/, '') ||
    sku.replace(/^0+/, '') === p.sku.replace(/^0+/, '')
  );
};

const updateMatchingStats = (stats: any, source: string) => {
  if (source.includes('exact')) stats.exact++;
  else if (source.includes('zero')) stats.zeropadded++;
  else if (source.includes('multi')) stats.multisku++;
  else if (source.includes('pattern')) stats.pattern++;
  else stats.contains++;
};

// Enhanced SKU extraction function with comprehensive pattern matching
function extractSKUsFromFilename(filename: string, fullPath?: string): ExtractedSKU[] {
  const skus: ExtractedSKU[] = [];
  
  // Clean filename - handle double dots and extensions properly
  let cleanName = filename.replace(/\.(jpg|jpeg|png|webp|gif|bmp|svg|tiff?)$/i, '');
  
  // CRITICAL FIX: Handle double dots (e.g., "23319.23320..png" becomes "23319.23320")
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
  
  // Strategy 2: Enhanced Multi-SKU handling (e.g., "455470.455471.455472", "23319.23320.", "447799.453343.blue")
  // IMPROVED: Handle trailing dots, mixed text, and various separators
  const multiSkuPatterns = [
    // Pure numeric with dots (highest priority)
    /^(\d{3,8}(?:\.\d{3,8})+)\.?$/,
    // Numeric with mixed content
    /^(\d{3,8}(?:[\.\-_]\d{3,8})+)[\.\-_]?[a-zA-Z]*\.?$/,
    // Any sequence of numbers separated by dots/dashes/underscores
    /(\d{3,8}(?:[\.\-_]\d{3,8})+)/
  ];
  
  for (const pattern of multiSkuPatterns) {
    const match = cleanName.match(pattern);
    if (match) {
      // Extract all numbers that could be SKUs
      const allNumbers = match[1].match(/\d{3,8}/g) || [];
      const uniqueNumbers = [...new Set(allNumbers)]; // Remove duplicates
      
      uniqueNumbers.forEach((sku, index) => {
        if (!skus.find(s => s.sku === sku)) {
          const confidence = Math.max(90 - (index * 3), 70); // Min 70% confidence
          skus.push({
            sku: sku,
            confidence: confidence,
            source: 'multi_sku'
          });
          console.log(`✅ Multi-SKU ${index + 1}: ${sku} (${confidence}%)`);
        }
      });
      break; // Use first matching pattern
    }
  }

  // Strategy 3: Enhanced pattern matching for mixed content files
  if (!skus.length || cleanName.includes('.')) {
    const enhancedPatterns = [
      // Numeric with suffix (447799.453343.blue.png → 447799, 453343)
      /(\d{3,8})(?:[\.\-_][a-zA-Z]+)+/g,
      // Standard patterns
      /^(\d{3,8})[a-zA-Z_\-]+$/g,     // numeric with suffix
      /^[a-zA-Z_\-]+(\d{3,8})$/g,     // prefix with numeric
      /(\d{3,8})/g                    // any 3+ digit sequence
    ];

    enhancedPatterns.forEach((pattern, patternIndex) => {
      try {
        const matches = [...cleanName.matchAll(pattern)];
        matches.forEach(match => {
          const numericPart = match[1] || match[0].replace(/[^0-9]/g, '');
          if (/^\d{3,8}$/.test(numericPart) && !skus.find(s => s.sku === numericPart)) {
            let confidence = 60 - (patternIndex * 10);
            
            // Boost confidence based on context
            if (cleanName === numericPart) confidence = 90;
            else if (cleanName.startsWith(numericPart)) confidence = 80;
            else if (cleanName.endsWith(numericPart)) confidence = 70;
            else if (patternIndex === 0) confidence = 75; // Mixed content pattern
            
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

// Batch progressive processing function
async function processBatchProgressive(supabase: any, sessionId: string, confidenceThreshold: number, batchSize: number) {
  console.log(`🚀 Starting batch progressive processing: ${sessionId}`);
  
  // Phase 1: Auto-promote high-confidence candidates
  console.log(`\n🎯 Phase 1: Promoting high-confidence candidates (>=${confidenceThreshold}%)`);
  
  const { data: candidates, error: candidatesError } = await supabase
    .from('product_image_candidates')
    .select('id, product_id, match_confidence')
    .eq('status', 'pending')
    .gte('match_confidence', confidenceThreshold);

  let candidatesPromoted = 0;
  if (!candidatesError && candidates && candidates.length > 0) {
    console.log(`📋 Found ${candidates.length} high-confidence candidates to promote`);
    
    for (const candidate of candidates) {
      try {
        const { error: promoteError } = await supabase.rpc('promote_image_candidate', {
          candidate_id: candidate.id
        });

        if (!promoteError) {
          candidatesPromoted++;
          console.log(`✅ Promoted candidate ${candidate.id} (${candidate.match_confidence}%)`);
        }
      } catch (error) {
        console.error(`Failed to promote candidate ${candidate.id}:`, error);
      }
    }
  }

  // Phase 2: Get products without images
  console.log(`\n🔍 Phase 2: Finding products without images`);
  
  const { data: productsWithoutImages, error: productsError } = await supabase
    .from('products')
    .select('id, sku, name')
    .eq('is_active', true)
    .not('sku', 'is', null);

  if (productsError) {
    throw new Error(`Failed to fetch products: ${productsError.message}`);
  }

  // Filter products without images
  const productIds = productsWithoutImages?.map(p => p.id) || [];
  const { data: existingImages } = await supabase
    .from('product_images')
    .select('product_id')
    .in('product_id', productIds);

  const existingImageProductIds = new Set(existingImages?.map(img => img.product_id) || []);
  const productsNeedingImages = productsWithoutImages?.filter(p => !existingImageProductIds.has(p.id)) || [];

  console.log(`🎯 Found ${productsNeedingImages.length} products needing images`);

  // Phase 3: Progressive storage scanning and matching
  console.log(`\n📁 Phase 3: Progressive storage scan`);
  
  let allStorageFiles: any[] = [];
  let offset = 0;
  const STORAGE_BATCH_SIZE = 200;
  
  // Fetch storage files in smaller batches to avoid API limits
  while (true) {
    try {
      const { data: batch, error } = await supabase.storage
        .from('product-images')
        .list('', { 
          limit: Math.min(STORAGE_BATCH_SIZE, 100), // Reduced batch size
          offset,
          sortBy: { column: 'name', order: 'asc' }
        });
        
      if (error) {
        console.error(`Storage API error at offset ${offset}:`, error);
        if (error.message?.includes('timeout') || error.message?.includes('limit')) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        throw error;
      }
      
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
      if (batch.length < STORAGE_BATCH_SIZE) break;
    } catch (error) {
      console.error(`Storage batch error:`, error);
      break;
    }
  }

  console.log(`📁 Total storage files found: ${allStorageFiles.length}`);
  
  // Process images in batches with progress tracking
  const allProductSKUs = productsNeedingImages.map(p => ({ id: p.id, sku: p.sku }));
  const totalBatches = Math.ceil(allStorageFiles.length / batchSize);
  let linksCreated = 0;
  let candidatesCreated = 0;
  
  await supabase.from('batch_progress').update({
    total_batches: totalBatches
  }).eq('session_id', sessionId);

  for (let i = 0; i < allStorageFiles.length; i += batchSize) {
    const batch = allStorageFiles.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const progress = Math.round((i / allStorageFiles.length) * 100);
    
    console.log(`📊 Processing batch ${batchNum}/${totalBatches} (${batch.length} files)`);
    
    // Update progress
    await supabase.from('batch_progress').update({
      current_batch: batchNum,
      progress: progress,
      links_created: linksCreated,
      candidates_created: candidatesCreated
    }).eq('session_id', sessionId);

    // Process files in this batch
    await Promise.all(batch.map(async (file) => {
      try {
        const extractedSKUs = extractSKUsFromFilename(file.name, file.fullPath);
        
        for (const extractedSKU of extractedSKUs) {
          const matchedProduct = findMatchingProduct(allProductSKUs, extractedSKU.sku);
          
          if (matchedProduct) {
            // Check if link already exists
            const { data: existing } = await supabase
              .from('product_images')
              .select('id')
              .eq('product_id', matchedProduct.id)
              .eq('image_status', 'active')
              .limit(1);
              
            if (existing && existing.length > 0) break;
            
            const { data: { publicUrl } } = supabase.storage
              .from('product-images')
              .getPublicUrl(file.name);
              
            if (extractedSKU.confidence >= 85) {
              // Create direct link for high confidence
              const { error } = await supabase
                .from('product_images')
                .insert({
                  product_id: matchedProduct.id,
                  image_url: publicUrl,
                  alt_text: `Product ${matchedProduct.sku}`,
                  image_status: 'active',
                  is_primary: true,
                  sort_order: 1,
                  match_confidence: extractedSKU.confidence,
                  match_metadata: {
                    filename: file.name,
                    extraction_method: extractedSKU.source,
                    session_id: sessionId
                  },
                  auto_matched: true
                });
                
              if (!error) {
                linksCreated++;
                console.log(`✅ Direct link: ${file.name} → ${matchedProduct.sku} (${extractedSKU.confidence}%)`);
              }
            } else if (extractedSKU.confidence >= confidenceThreshold) {
              // Create candidate for manual review
              const { error } = await supabase
                .from('product_image_candidates')
                .insert({
                  product_id: matchedProduct.id,
                  image_url: publicUrl,
                  alt_text: `Product ${matchedProduct.sku}`,
                  match_confidence: extractedSKU.confidence,
                  match_metadata: {
                    filename: file.name,
                    extraction_method: extractedSKU.source,
                    session_id: sessionId
                  },
                  status: 'pending'
                });
                
              if (!error) {
                candidatesCreated++;
                console.log(`📋 Candidate: ${file.name} → ${matchedProduct.sku} (${extractedSKU.confidence}%)`);
              }
            }
            
            break; // Found match, move to next file
          }
        }
      } catch (error) {
        console.error(`❌ Error processing file ${file.name}:`, error);
      }
    }));
    
    // Small delay between batches
    if (i + batchSize < allStorageFiles.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Final progress update
  await supabase.from('batch_progress').update({
    progress: 100,
    current_batch: totalBatches,
    links_created: linksCreated,
    candidates_created: candidatesCreated
  }).eq('session_id', sessionId);

  console.log(`\n📊 Batch Progressive Summary:`);
  console.log(`   Candidates promoted: ${candidatesPromoted}`);
  console.log(`   Products checked: ${productsNeedingImages.length}`);
  console.log(`   Images found: ${allStorageFiles.length}`);
  console.log(`   Direct links created: ${linksCreated}`);
  console.log(`   Candidates created: ${candidatesCreated}`);

  return {
    candidatesPromoted,
    productsChecked: productsNeedingImages.length,
    imagesFound: allStorageFiles.length,
    linksCreated,
    candidatesCreated
  };
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

    // Parse request configuration
    const config: RepairConfig = req.method === 'POST' 
      ? await req.json().catch(() => ({}))
      : {};
    
    const {
      mode = 'comprehensive_scan',
      force_rescan = true,
      enhanced_matching = true,
      confidence_threshold = 70, // Consistent with UI
      comprehensive_scan = true,
      auto_promote_candidates = true,
      session_id,
      batch_size = 100
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

    // Handle batch progressive mode
    if (mode === 'batch_progressive') {
      const sessionId = session_id || crypto.randomUUID();
      console.log(`🚀 Starting batch progressive mode: ${sessionId}`);
      
      // Initialize progress tracking
      await supabase.from('batch_progress').insert({
        session_id: sessionId,
        status: 'running',
        progress: 0,
        current_batch: 0,
        total_batches: 0,
        links_created: 0,
        candidates_created: 0,
        errors: []
      });

      // Use background task for processing
      const backgroundProcess = async () => {
        try {
          const result = await processBatchProgressive(supabase, sessionId, confidence_threshold, batch_size);
          
          await supabase.from('batch_progress').update({
            status: 'complete',
            progress: 100,
            completed_at: new Date().toISOString()
          }).eq('session_id', sessionId);
          
        } catch (error) {
          console.error('❌ Background process error:', error);
          await supabase.from('batch_progress').update({
            status: 'error',
            completed_at: new Date().toISOString(),
            errors: [error.message]
          }).eq('session_id', sessionId);
        }
      };

      // Start background processing
      EdgeRuntime.waitUntil(backgroundProcess());
      
      return new Response(JSON.stringify({ 
        sessionId, 
        status: 'started',
        message: 'Batch processing started'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Original comprehensive scan mode (existing functionality)
    const sessionId = crypto.randomUUID();
    const result: RepairResult = {
      sessionId,
      status: 'complete',
      productsChecked: 0,
      imagesFound: 0,
      linksCreated: 0,
      candidatesPromoted: 0,
      candidatesCreated: 0,
      skippedExisting: 0,
      matchingStats: {
        exact: 0,
        zeropadded: 0,
        multisku: 0,
        pattern: 0,
        contains: 0
      },
      errors: []
    };

    console.log(`🚀 Starting advanced image repair: ${sessionId}`);
    console.log(`🔧 Config:`, { mode, force_rescan, enhanced_matching, confidence_threshold, comprehensive_scan, auto_promote_candidates });

    // Phase 1: Auto-promote high-confidence candidates
    if (auto_promote_candidates) {
      console.log(`\n🎯 Phase 1: Promoting high-confidence candidates (>=${confidence_threshold}%)`);
      
      const { data: candidates, error: candidatesError } = await supabase
        .from('product_image_candidates')
        .select('id, product_id, match_confidence')
        .eq('status', 'pending')
        .gte('match_confidence', confidence_threshold);

      if (candidatesError) {
        console.error('❌ Error fetching candidates:', candidatesError);
        result.errors.push(`Failed to fetch candidates: ${candidatesError.message}`);
      } else if (candidates && candidates.length > 0) {
        console.log(`📋 Found ${candidates.length} high-confidence candidates to promote`);
        
        for (const candidate of candidates) {
          try {
            const { data: promotedId, error: promoteError } = await supabase.rpc('promote_image_candidate', {
              candidate_id: candidate.id
            });

            if (promoteError) {
              result.errors.push(`Failed to promote candidate ${candidate.id}: ${promoteError.message}`);
            } else {
              result.candidatesPromoted++;
              console.log(`✅ Promoted candidate ${candidate.id} (${candidate.match_confidence}%)`);
            }
          } catch (error) {
            result.errors.push(`Error promoting candidate ${candidate.id}: ${error.message}`);
          }
        }
      }
    }

    // Phase 2: Get products without images efficiently
    console.log(`\n🔍 Phase 2: Finding products without images`);
    
    const { data: productsWithoutImages, error: productsError } = await supabase
      .from('products')
      .select('id, sku, name')
      .eq('is_active', true)
      .not('sku', 'is', null);

    if (productsError) {
      throw new Error(`Failed to fetch products: ${productsError.message}`);
    }

    console.log(`📦 Found ${productsWithoutImages?.length || 0} active products with SKUs`);

    // Efficiently filter products without images using batch query
    const productIds = productsWithoutImages?.map(p => p.id) || [];
    const { data: existingImages } = await supabase
      .from('product_images')
      .select('product_id')
      .in('product_id', productIds);

    const existingImageProductIds = new Set(existingImages?.map(img => img.product_id) || []);
    const productsNeedingImages = productsWithoutImages?.filter(p => !existingImageProductIds.has(p.id)) || [];

    result.productsChecked = productsNeedingImages.length;
    console.log(`🎯 Found ${result.productsChecked} products needing images`);

    console.log(`\n📁 Phase 3: Optimized storage scan with batching`);
    
    // Process storage in smaller batches to avoid timeouts
    const STORAGE_BATCH_SIZE = 200;
    const PROCESSING_BATCH_SIZE = 50;
    
    console.log("🔍 Starting optimized storage scan...");
    let allStorageFiles: any[] = [];
    let offset = 0;
    
    // Fetch storage files in batches
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
      
      // Break if we got less than requested (end of files)
      if (batch.length < STORAGE_BATCH_SIZE) break;
      
      console.log(`📁 Loaded ${allStorageFiles.length} storage files so far...`);
    }
    
    result.imagesFound = allStorageFiles.length;
    console.log(`📁 Total storage files found: ${result.imagesFound}`);
    
    console.log("🔍 Starting optimized product matching...");
    const allProductSKUs = productsNeedingImages.map(p => ({ id: p.id, sku: p.sku }));
    
    let processedFiles = 0;
    
    // Process images in smaller batches
    for (let i = 0; i < allStorageFiles.length; i += PROCESSING_BATCH_SIZE) {
      const batch = allStorageFiles.slice(i, i + PROCESSING_BATCH_SIZE);
      const batchNum = Math.floor(i / PROCESSING_BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(allStorageFiles.length / PROCESSING_BATCH_SIZE);
      
      console.log(`📊 Processing batch ${batchNum}/${totalBatches} (${batch.length} files)`);
      
      await Promise.all(batch.map(async (file) => {
        try {
          const extractedSKUs = extractSKUsFromFilename(file.name, file.fullPath);
          
          for (const extractedSKU of extractedSKUs) {
            const matchedProduct = findMatchingProduct(allProductSKUs, extractedSKU.sku);
            
            if (matchedProduct) {
              // Check if link already exists to avoid duplicates
              const { data: existing } = await supabase
                .from('product_images')
                .select('id')
                .eq('product_id', matchedProduct.id)
                .eq('image_status', 'active')
                .limit(1);
                
              if (existing && existing.length > 0) {
                result.skippedExisting++;
                break;
              }
              
              const { data: { publicUrl } } = supabase.storage
                .from('product-images')
                .getPublicUrl(file.name);
                
              if (extractedSKU.confidence >= 85) {
                // Create direct link for high confidence
                const { error } = await supabase
                  .from('product_images')
                  .insert({
                    product_id: matchedProduct.id,
                    image_url: publicUrl,
                    alt_text: `Product ${matchedProduct.sku}`,
                    image_status: 'active',
                    is_primary: true,
                    sort_order: 1,
                    match_confidence: extractedSKU.confidence,
                    match_metadata: {
                      filename: file.name,
                      extraction_method: extractedSKU.source,
                      session_id: sessionId
                    },
                    auto_matched: true
                  });
                  
                if (!error) {
                  result.linksCreated++;
                  updateMatchingStats(result.matchingStats, extractedSKU.source);
                  console.log(`✅ Direct link: ${file.name} → ${matchedProduct.sku} (${extractedSKU.confidence}%)`);
                }
              } else if (extractedSKU.confidence >= confidence_threshold) {
                // Create candidate for manual review
                const { error } = await supabase
                  .from('product_image_candidates')
                  .insert({
                    product_id: matchedProduct.id,
                    image_url: publicUrl,
                    alt_text: `Product ${matchedProduct.sku}`,
                    match_confidence: extractedSKU.confidence,
                    match_metadata: {
                      filename: file.name,
                      extraction_method: extractedSKU.source,
                      session_id: sessionId
                    },
                    status: 'pending'
                  });
                  
                if (!error) {
                  result.candidatesCreated++;
                  console.log(`📋 Candidate: ${file.name} → ${matchedProduct.sku} (${extractedSKU.confidence}%)`);
                }
              } else {
                result.skippedExisting++;
              }
              
              break; // Found match, move to next file
            }
          }
          
          processedFiles++;
        } catch (error) {
          console.error(`❌ Error processing file ${file.name}:`, error);
          result.errors.push(`Error processing ${file.name}: ${error.message}`);
        }
      }));
      
      // Small delay between batches to prevent overwhelming
      if (i + PROCESSING_BATCH_SIZE < allStorageFiles.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Progress update every 5 batches
      if (batchNum % 5 === 0 || batchNum === totalBatches) {
        console.log(`📈 Progress: ${processedFiles}/${allStorageFiles.length} files processed`);
      }
    }

    console.log(`\n📊 Repair Summary:`);
    console.log(`   Products checked: ${result.productsChecked}`);
    console.log(`   Images found: ${result.imagesFound}`);
    console.log(`   Direct links: ${result.linksCreated}`);
    console.log(`   Candidates promoted: ${result.candidatesPromoted}`);
    console.log(`   Candidates created: ${result.candidatesCreated}`);
    console.log(`   Skipped (low confidence): ${result.skippedExisting}`);
    console.log(`   Matching breakdown:`, result.matchingStats);
    console.log(`   Errors: ${result.errors.length}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Image repair error:', error);
    return new Response(
      JSON.stringify({ 
        sessionId: 'error',
        status: 'error', 
        error: error.message,
        productsChecked: 0,
        imagesFound: 0,
        linksCreated: 0,
        candidatesPromoted: 0,
        candidatesCreated: 0,
        skippedExisting: 0,
        matchingStats: { exact: 0, zeropadded: 0, multisku: 0, pattern: 0, contains: 0 },
        errors: [error.message]
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});