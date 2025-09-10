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

// In-memory session storage (for demo - use Redis/DB in production)
const sessions = new Map<string, MasterResult>();

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

// Master processing function with no scale limitations
async function runMasterProcessing(
  supabase: any, 
  sessionId: string, 
  options: ProcessingOptions
): Promise<void> {
  const result: MasterResult = {
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
  
  sessions.set(sessionId, result);
  
  try {
    console.log(`🚀 MASTER IMAGE LINKER V1 - Starting processing with NO SCALE LIMITS`);
    console.log(`📊 Configuration: ${JSON.stringify(options, null, 2)}`);
    
    // Step 1: Clear existing data if refresh mode
    if (options.mode === 'refresh') {
      result.currentStep = 'Clearing existing image links...';
      sessions.set(sessionId, result);
      
      const { error: clearError } = await supabase
        .from('product_images')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
        
      if (clearError) throw clearError;
      console.log(`🧹 CLEARED existing product images`);
      result.imagesCleared = 0; // Could count deleted if needed
    }
    
    // Step 2: Load ALL products (no limits)
    result.currentStep = 'Loading products...';
    result.progress = 5;
    sessions.set(sessionId, result);
    
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, sku, name')
      .eq('is_active', true);
      
    if (productsError) throw productsError;
    console.log(`📊 Loaded ${products.length} products`);
    result.productsScanned = products.length;
    
    // Step 3: Scan ALL storage files (no limits)
    result.currentStep = 'Scanning storage files...';
    result.progress = 10;
    sessions.set(sessionId, result);
    
    let allFiles: any[] = [];
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
      result.progress = Math.min(10 + (allFiles.length / 50000) * 10, 20);
      sessions.set(sessionId, result);
    }
    
    // Filter to image files only
    const imageFiles = allFiles.filter(file => {
      const ext = file.name.toLowerCase().split('.').pop();
      return ext && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
    });
    
    console.log(`📊 Found ${imageFiles.length} image files out of ${allFiles.length} total files`);
    result.imagesScanned = imageFiles.length;
    
    // Step 4: Process images in large batches
    result.currentStep = 'Processing image-product matching...';
    result.progress = 25;
    result.totalBatches = Math.ceil(imageFiles.length / options.batchSize);
    sessions.set(sessionId, result);
    
    const startProcessingTime = Date.now();
    const linksToCreate: any[] = [];
    const candidatesToCreate: any[] = [];
    
    for (let i = 0; i < imageFiles.length; i += options.batchSize) {
      const batch = imageFiles.slice(i, i + options.batchSize);
      result.currentBatch = Math.floor(i / options.batchSize) + 1;
      result.currentStep = `Processing batch ${result.currentBatch}/${result.totalBatches}...`;
      
      console.log(`\n📦 Processing batch ${result.currentBatch}/${result.totalBatches} (${batch.length} files)`);
      
      for (const file of batch) {
        try {
          // Extract SKUs with strict full SKU matching
          const extractedSKUs = extractSKUsFromFilename(file.name);
          
          if (extractedSKUs.length === 0) {
            result.warnings.push(`No valid SKUs found in: ${file.name}`);
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
                    
                    result.directLinksCreated++;
                    
                    // Update matching stats
                    if (extractedSKU.source === 'exact_numeric') result.matchingStats.exactMatch++;
                    else if (extractedSKU.source.startsWith('multi_sku')) result.matchingStats.multiSku++;
                    else if (extractedSKU.source.startsWith('zero_padded')) result.matchingStats.paddedSku++;
                    else if (extractedSKU.source === 'contextual') result.matchingStats.patternMatch++;
                    
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
                  
                  result.candidatesCreated++;
                  console.log(`📋 CANDIDATE: ${file.name} → ${matchingProduct.sku} (${extractedSKU.confidence}%)`);
                }
                
                break; // Only match to first suitable product per file
              }
            }
          }
        } catch (error) {
          result.errors.push(`Error processing ${file.name}: ${error.message}`);
          console.error(`❌ Error processing ${file.name}:`, error);
        }
      }
      
      // Update progress and performance metrics
      const currentTime = Date.now();
      const elapsed = currentTime - startProcessingTime;
      const processedItems = i + batch.length;
      result.processingRate = processedItems / (elapsed / 1000);
      result.timeRemaining = (imageFiles.length - processedItems) / result.processingRate;
      result.progress = 25 + ((processedItems / imageFiles.length) * 50);
      
      sessions.set(sessionId, result);
      
      // Small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Step 5: Bulk insert links and candidates
    result.currentStep = 'Creating database entries...';
    result.progress = 80;
    sessions.set(sessionId, result);
    
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
          result.errors.push(`Failed to insert links: ${linkError.message}`);
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
          result.errors.push(`Failed to insert candidates: ${candidateError.message}`);
        }
      }
    }
    
    // Final results
    result.progress = 100;
    result.status = 'completed';
    result.endTime = new Date().toISOString();
    result.totalTime = Date.now() - new Date(result.startTime).getTime();
    result.avgProcessingTime = result.totalTime / result.imagesScanned;
    result.currentStep = 'Processing completed successfully';
    
    console.log(`✅ MASTER PROCESSING COMPLETE:`);
    console.log(`📊 Products: ${result.productsScanned}, Images: ${result.imagesScanned}`);
    console.log(`🔗 Direct Links: ${result.directLinksCreated}, Candidates: ${result.candidatesCreated}`);
    console.log(`⏱️ Total Time: ${result.totalTime}ms (${result.avgProcessingTime?.toFixed(2)}ms per image)`);
    console.log(`❌ Errors: ${result.errors.length}, Warnings: ${result.warnings.length}`);
    
  } catch (error) {
    console.error('❌ MASTER PROCESSING FAILED:', error);
    result.status = 'failed';
    result.errors.push(error.message);
    result.currentStep = 'Processing failed';
  }
  
  sessions.set(sessionId, result);
}

// Main handler
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const { action, sessionId, options } = await req.json();
    
    if (action === 'start') {
      // Start processing in background
      runMasterProcessing(supabase, sessionId, options);
      
      return new Response(
        JSON.stringify({ success: true, sessionId }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }
    
    if (action === 'check_progress') {
      const result = sessions.get(sessionId);
      return new Response(
        JSON.stringify(result || { error: 'Session not found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }
    
    if (action === 'pause') {
      const result = sessions.get(sessionId);
      if (result) {
        result.status = 'paused';
        sessions.set(sessionId, result);
      }
      return new Response(
        JSON.stringify({ success: true }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }
    
    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
    
  } catch (error) {
    console.error('Master Image Linker Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Master Image Linker processing failed'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});