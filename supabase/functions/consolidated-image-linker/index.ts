import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Enhanced data structures with complete refresh support
interface ProcessingResult {
  status: 'running' | 'completed' | 'failed'
  progress: number
  currentStep: string
  productsScanned: number
  imagesScanned: number
  directLinksCreated: number
  candidatesCreated: number
  imagesCleared?: number
  errors: string[]
  startTime: string
  endTime?: string
  totalTime?: number
  debugInfo?: any
}

interface ExtractedSKU {
  sku: string
  confidence: number
  source: string
}

// OPTIMIZED SKU EXTRACTION - More comprehensive patterns with performance focus
function extractSKUsFromFilename(filename: string): ExtractedSKU[] {
  const results: ExtractedSKU[] = [];
  const originalFilename = filename;
  const cleanFilename = filename.toLowerCase().replace(/\.(jpg|jpeg|png|gif|webp|ngp|bmp|svg|tiff?)$/i, '');
  
  console.log(`📝 EXTRACTING from: "${filename}" → "${cleanFilename}"`);
  
  // Strategy 1: EXACT NUMERIC MATCH (Pure numbers - highest confidence)
  const exactNumeric = cleanFilename.match(/^(\d{3,8})$/);
  if (exactNumeric) {
    const sku = exactNumeric[1];
    results.push({ sku, confidence: 98, source: 'exact_numeric' });
    console.log(`✅ EXACT numeric: ${sku}`);
    
    // Add zero-padded variations for better matching
    if (sku.length === 3) results.push({ sku: '0' + sku, confidence: 95, source: 'exact_padded_4' });
    if (sku.length === 4) results.push({ sku: '0' + sku, confidence: 95, source: 'exact_padded_5' });
    if (sku.length === 5) results.push({ sku: '0' + sku, confidence: 95, source: 'exact_padded_6' });
  }
  
  // Strategy 2: LEADING NUMERIC (Starts with numbers)
  const leadingNumeric = cleanFilename.match(/^(\d{3,8})[^\d]/);
  if (leadingNumeric) {
    const sku = leadingNumeric[1];
    results.push({ sku, confidence: 92, source: 'leading_numeric' });
    console.log(`✅ LEADING numeric: ${sku}`);
  }
  
  // Strategy 3: MULTI-SKU FILENAMES (Multiple SKUs in one file) - FIXED REGEX
  const multiSkuDelimiters = ['.', '_', '-', ' ', '+', '&'];
  // Properly escape special regex characters for character class
  const escapedDelimiters = multiSkuDelimiters.map(d => {
    if (d === '.' || d === '+' || d === '&') return '\\' + d;
    if (d === '-') return '\\-'; // Hyphen must be escaped in character class
    return d;
  }).join('');
  const multiSkuPattern = new RegExp(`(\\d{3,8})(?:[${escapedDelimiters}]+(\\d{3,8}))+`, 'g');
  
  let multiMatch;
  while ((multiMatch = multiSkuPattern.exec(cleanFilename)) !== null) {
    results.push({ sku: multiMatch[1], confidence: 88, source: 'multi_first' });
    console.log(`✅ MULTI SKU first: ${multiMatch[1]}`);
    
    // Extract additional numbers from the match
    const fullMatch = multiMatch[0];
    const additionalNumbers = fullMatch.match(/\d{3,8}/g);
    if (additionalNumbers && additionalNumbers.length > 1) {
      for (let i = 1; i < additionalNumbers.length; i++) {
        results.push({ sku: additionalNumbers[i], confidence: 85, source: `multi_${i + 1}` });
        console.log(`✅ MULTI SKU additional: ${additionalNumbers[i]}`);
      }
    }
  }
  
  // Strategy 4: EMBEDDED NUMBERS (Numbers within filename)
  const embeddedPattern = /(?:^|[^\d])(\d{3,8})(?:[^\d]|$)/g;
  let embeddedMatch;
  while ((embeddedMatch = embeddedPattern.exec(cleanFilename)) !== null) {
    const sku = embeddedMatch[1];
    
    // Skip if already found with higher confidence
    if (results.some(r => r.sku === sku && r.confidence > 80)) continue;
    
    results.push({ sku, confidence: 80, source: 'embedded' });
    console.log(`✅ EMBEDDED: ${sku}`);
  }
  
  // Strategy 5: PARTIAL MATCHES (Last resort)
  const partialPattern = /(\d{4,8})/g;
  let partialMatch;
  while ((partialMatch = partialPattern.exec(cleanFilename)) !== null) {
    const sku = partialMatch[1];
    
    // Skip if already found
    if (results.some(r => r.sku === sku)) continue;
    
    results.push({ sku, confidence: 70, source: 'partial' });
    console.log(`✅ PARTIAL: ${sku}`);
  }
  
  // Remove duplicates and sort by confidence
  const uniqueResults = results.filter((result, index, self) =>
    index === self.findIndex(r => r.sku === result.sku)
  ).sort((a, b) => b.confidence - a.confidence);
  
  console.log(`📊 FINAL: ${uniqueResults.length} unique SKUs from "${originalFilename}":`, uniqueResults.map(r => `${r.sku}(${r.confidence}%)`));
  
  return uniqueResults;
}

// OPTIMIZED MATCHING with Map-based lookups
function createProductLookupMaps(products: any[]) {
  const skuMap = new Map();
  const nameMap = new Map();
  const fuzzyMap = new Map();
  
  products.forEach(product => {
    if (product.sku) {
      const sku = product.sku;
      // Exact SKU
      skuMap.set(sku, product);
      skuMap.set(sku.toLowerCase(), product);
      
      // Remove leading zeros variations
      skuMap.set(sku.replace(/^0+/, ''), product);
      
      // Add leading zeros variations (up to 8 digits)
      for (let len = sku.length + 1; len <= 8; len++) {
        const padded = sku.padStart(len, '0');
        skuMap.set(padded, product);
      }
      
      // Fuzzy matching preparation
      const normalized = sku.replace(/\D/g, ''); // Remove non-digits
      if (normalized.length >= 3) {
        fuzzyMap.set(normalized, product);
      }
    }
    
    if (product.name) {
      nameMap.set(product.name.toLowerCase(), product);
    }
  });
  
  return { skuMap, nameMap, fuzzyMap };
}

function findMatchingProduct(lookupMaps: any, targetSku: string): any {
  const { skuMap, fuzzyMap } = lookupMaps;
  
  console.log(`🔍 MATCHING "${targetSku}" against lookup maps`);
  
  // Strategy 1: Exact match
  let match = skuMap.get(targetSku) || skuMap.get(targetSku.toLowerCase());
  if (match) {
    console.log(`✅ EXACT match: ${targetSku} → ${match.sku}`);
    return match;
  }
  
  // Strategy 2: Numeric-only fuzzy match
  const targetNumeric = targetSku.replace(/\D/g, '');
  if (targetNumeric.length >= 3) {
    match = fuzzyMap.get(targetNumeric);
    if (match) {
      console.log(`✅ FUZZY numeric match: ${targetSku} → ${match.sku}`);
      return match;
    }
  }
  
  // Strategy 3: Similarity-based fuzzy matching (limited to prevent timeout)
  const candidates = Array.from(skuMap.values()).slice(0, 100); // Limit for performance
  let bestMatch = null;
  let bestSimilarity = 0;
  
  for (const candidate of candidates) {
    if (!candidate.sku) continue;
    
    const similarity = calculateSimilarity(targetSku, candidate.sku);
    if (similarity > bestSimilarity && similarity >= 0.8) {
      bestMatch = candidate;
      bestSimilarity = similarity;
    }
  }
  
  if (bestMatch) {
    console.log(`✅ SIMILARITY match: ${targetSku} → ${bestMatch.sku} (${(bestSimilarity * 100).toFixed(1)}%)`);
    return bestMatch;
  }
  
  console.log(`❌ NO match found for: ${targetSku}`);
  return null;
}

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  
  // Simple Levenshtein distance approximation
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1;
  
  let matches = 0;
  const minLen = Math.min(s1.length, s2.length);
  
  for (let i = 0; i < minLen; i++) {
    if (s1[i] === s2[i]) matches++;
  }
  
  return matches / maxLen;
}

// OPTIMIZED PROCESSING with timeout protection and batch operations
async function runConsolidatedProcessing(supabase: any, options: { completeRefresh?: boolean } = {}): Promise<ProcessingResult> {
  const startTime = Date.now();
  const timeoutLimit = 45000; // 45 seconds to prevent edge function timeout
  
  const result: ProcessingResult = {
    status: 'running',
    progress: 0,
    currentStep: 'Initializing',
    productsScanned: 0,
    imagesScanned: 0,
    directLinksCreated: 0,
    candidatesCreated: 0,
    errors: [],
    startTime: new Date().toISOString(),
    debugInfo: {}
  };

  console.log(`🚀 OPTIMIZED IMAGE LINKER V3 - Starting with ${timeoutLimit/1000}s timeout protection`);
  
  try {
    // Helper to check timeout
    const checkTimeout = () => {
      if (Date.now() - startTime > timeoutLimit) {
        throw new Error('Processing timeout - too many files to process in single request');
      }
    };
    
    // Step 0: Clear existing images if complete refresh requested
    if (options.completeRefresh) {
      result.currentStep = 'Clearing existing images...';
      result.progress = 5;
      
      console.log('🧹 COMPLETE REFRESH: Clearing existing images...');
      const { error: deleteError } = await supabase
        .from('product_images')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (deleteError) {
        console.error('❌ Error clearing images:', deleteError.message);
        result.errors.push(`Clear error: ${deleteError.message}`);
      } else {
        console.log('✅ Existing images cleared');
      }
    }

    // Step 1: Load products efficiently
    result.currentStep = 'Loading products...';
    result.progress = 15;
    checkTimeout();
    
    console.log('📊 Loading products in optimized batches...');
    const { data: allProducts, error: productsError } = await supabase
      .from('products')
      .select('id, sku, name')
      .eq('is_active', true);

    if (productsError) {
      throw new Error(`Products load error: ${productsError.message}`);
    }

    console.log(`📈 Loaded ${allProducts?.length || 0} products`);
    result.productsScanned = allProducts?.length || 0;
    
    // Create optimized lookup maps
    console.log('🗺️ Creating optimized lookup maps...');
    const lookupMaps = createProductLookupMaps(allProducts || []);
    console.log(`🗺️ Created maps with ${lookupMaps.skuMap.size} SKU entries`);

    // Step 2: Scan storage efficiently with limits
    result.currentStep = 'Scanning storage...';
    result.progress = 30;
    checkTimeout();
    
    console.log('📁 Scanning storage with smart limits...');
    const { data: files, error: storageError } = await supabase.storage
      .from('product-images')
      .list('', { 
        limit: 1000, // Reduced limit to prevent timeout
        sortBy: { column: 'name', order: 'asc' } 
      });

    if (storageError) {
      throw new Error(`Storage scan error: ${storageError.message}`);
    }

    console.log(`📁 Processing ${files?.length || 0} files`);
    result.imagesScanned = files?.length || 0;

    // Step 3: Process matches in optimized batches
    result.currentStep = 'Processing matches...';
    result.progress = 50;
    
    const batchInserts: any[] = [];
    const batchCandidates: any[] = [];
    const processedFiles = new Set<string>();
    
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        checkTimeout(); // Check timeout frequently
        
        const file = files[i];
        if (!file.name || processedFiles.has(file.name)) continue;
        
        processedFiles.add(file.name);
        
        try {
          const extractedSKUs = extractSKUsFromFilename(file.name);
          
          for (const extractedSKU of extractedSKUs.slice(0, 3)) { // Limit SKUs per file
            const matchingProduct = findMatchingProduct(lookupMaps, extractedSKU.sku);
            
            if (matchingProduct) {
              console.log(`🎯 MATCH: ${file.name} → ${extractedSKU.sku} → ${matchingProduct.sku}`);
              
              const confidenceThreshold = 60; // Lowered for better coverage
              
              if (extractedSKU.confidence >= confidenceThreshold) {
                // Prepare for batch insert
                batchInserts.push({
                  product_id: matchingProduct.id,
                  image_url: `product-images/${file.name}`,
                  alt_text: `${matchingProduct.name} - ${file.name}`,
                  is_primary: false,
                  image_status: 'active',
                  match_confidence: extractedSKU.confidence,
                  match_metadata: {
                    source: extractedSKU.source,
                    original_filename: file.name,
                    extracted_sku: extractedSKU.sku,
                    matched_product_sku: matchingProduct.sku,
                    processing_method: 'consolidated_linker_v3_optimized'
                  },
                  auto_matched: true,
                  reviewed_at: new Date().toISOString()
                });
              } else {
                // Prepare candidate for batch insert
                batchCandidates.push({
                  product_id: matchingProduct.id,
                  image_url: `product-images/${file.name}`,
                  alt_text: `${matchingProduct.name} - ${file.name}`,
                  match_confidence: extractedSKU.confidence,
                  match_metadata: {
                    source: extractedSKU.source,
                    original_filename: file.name,
                    extracted_sku: extractedSKU.sku,
                    matched_product_sku: matchingProduct.sku,
                    processing_method: 'consolidated_linker_v3_optimized'
                  },
                  status: 'pending'
                });
              }
              break; // Only process first match per file to save time
            }
          }
        } catch (fileError) {
          console.error(`❌ Error processing ${file.name}:`, fileError);
          result.errors.push(`File ${file.name}: ${fileError}`);
        }
        
        // Update progress
        if (i % 50 === 0) {
          result.progress = 50 + (i / files.length) * 40;
        }
      }
    }

    // Step 4: Batch insert direct links
    result.currentStep = 'Creating image links...';
    result.progress = 90;
    checkTimeout();
    
    if (batchInserts.length > 0) {
      console.log(`💾 Batch inserting ${batchInserts.length} direct image links...`);
      
      // Process in smaller batches to avoid database limits
      const chunkSize = 50;
      for (let i = 0; i < batchInserts.length; i += chunkSize) {
        const chunk = batchInserts.slice(i, i + chunkSize);
        
        const { error: insertError } = await supabase
          .from('product_images')
          .upsert(chunk, { 
            onConflict: 'product_id,image_url',
            ignoreDuplicates: true 
          });
        
        if (insertError) {
          console.error('❌ Batch insert error:', insertError.message);
          result.errors.push(`Batch insert error: ${insertError.message}`);
        } else {
          result.directLinksCreated += chunk.length;
        }
      }
    }

    // Step 5: Batch insert candidates
    if (batchCandidates.length > 0) {
      console.log(`💾 Batch inserting ${batchCandidates.length} image candidates...`);
      
      const chunkSize = 50;
      for (let i = 0; i < batchCandidates.length; i += chunkSize) {
        const chunk = batchCandidates.slice(i, i + chunkSize);
        
        const { error: candidateError } = await supabase
          .from('product_image_candidates')
          .upsert(chunk, { 
            onConflict: 'product_id,image_url',
            ignoreDuplicates: true 
          });
        
        if (candidateError) {
          console.error('❌ Candidate insert error:', candidateError.message);
          result.errors.push(`Candidate insert error: ${candidateError.message}`);
        } else {
          result.candidatesCreated += chunk.length;
        }
      }
    }

    // Completion
    result.status = 'completed';
    result.progress = 100;
    result.currentStep = 'Processing complete';
    result.endTime = new Date().toISOString();
    result.totalTime = Date.now() - startTime;
    
    console.log(`✅ PROCESSING COMPLETE:
    📊 Products: ${result.productsScanned}
    📁 Images: ${result.imagesScanned} 
    🔗 Direct links: ${result.directLinksCreated}
    📝 Candidates: ${result.candidatesCreated}
    ⏱️ Time: ${result.totalTime}ms
    ❌ Errors: ${result.errors.length}`);
    
    return result;
    
  } catch (error) {
    console.error('❌ Processing failed:', error);
    
    result.status = 'failed';
    result.currentStep = 'Error occurred';
    result.endTime = new Date().toISOString();
    result.totalTime = Date.now() - startTime;
    result.errors.push(error instanceof Error ? error.message : String(error));
    
    return result;
  }
}

// Main handler
Deno.serve(async (req: Request) => {
  console.log(`🚀 Consolidated Image Linker called with method: ${req.method}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    console.log('🚀 Starting optimized consolidated processing...');
    
    // Parse request body for options
    const body = await req.json().catch(() => ({}));
    const options = {
      completeRefresh: body.completeRefresh || false
    };
    
    console.log('🔧 Processing options:', options);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const result = await runConsolidatedProcessing(supabase, options);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Fatal error:', error);
    return new Response(
      JSON.stringify({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        progress: 0,
        currentStep: 'Error occurred',
        productsScanned: 0,
        imagesScanned: 0,
        directLinksCreated: 0,
        candidatesCreated: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        totalTime: 0
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});