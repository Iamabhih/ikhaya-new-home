import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Enhanced diagnostic data structures
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
  diagnostics: {
    unmatchedFiles: string[]
    unmatchedProducts: string[]
    skuPatterns: { [key: string]: number }
    confidenceDistribution: { [range: string]: number }
    matchingStrategies: { [strategy: string]: number }
    storageInfo: {
      totalFiles: number
      processedFiles: number
      skippedFiles: number
      imageFiles: number
      nonImageFiles: number
    }
    performanceMetrics: {
      avgProcessingTimePerFile: number
      skuExtractionTime: number
      matchingTime: number
      databaseTime: number
    }
  }
}

interface ExtractedSKU {
  sku: string
  confidence: number
  source: string
}

// ENHANCED SKU EXTRACTION with comprehensive diagnostics and expanded patterns
function extractSKUsFromFilename(filename: string, diagnostics: any): ExtractedSKU[] {
  const extractionStart = Date.now();
  const results: ExtractedSKU[] = [];
  const originalFilename = filename;
  const cleanFilename = filename.toLowerCase().replace(/\.(jpg|jpeg|png|gif|webp|ngp|bmp|svg|tiff?)$/i, '');
  
  console.log(`📝 EXTRACTING from: "${filename}" → "${cleanFilename}"`);
  
  // Track filename patterns for diagnostics
  const filenamePattern = cleanFilename.replace(/\d/g, 'N').replace(/[a-z]/g, 'L');
  diagnostics.skuPatterns[filenamePattern] = (diagnostics.skuPatterns[filenamePattern] || 0) + 1;
  
  // Strategy 1: EXACT NUMERIC MATCH (Pure numbers - highest confidence)
  const exactNumeric = cleanFilename.match(/^(\d{3,10})$/);
  if (exactNumeric) {
    const sku = exactNumeric[1];
    results.push({ sku, confidence: 98, source: 'exact_numeric' });
    console.log(`✅ EXACT numeric: ${sku}`);
    
    // Add zero-padded variations for better matching
    if (sku.length >= 3 && sku.length <= 6) {
      for (let targetLen = 4; targetLen <= 8; targetLen++) {
        if (sku.length < targetLen) {
          const padded = sku.padStart(targetLen, '0');
          results.push({ sku: padded, confidence: 95 - (targetLen - sku.length), source: `exact_padded_${targetLen}` });
        }
      }
    }
  }
  
  // Strategy 2: LEADING NUMERIC (Starts with numbers)
  const leadingPatterns = [
    /^(\d{3,10})[^\d]/,        // Standard leading digits
    /^(\d{3,10})[-_.]/,       // Digits followed by separators
    /^(\d{3,10})[a-z]/,        // Digits followed by letters
  ];
  
  for (const pattern of leadingPatterns) {
    const match = cleanFilename.match(pattern);
    if (match && !results.some(r => r.sku === match[1])) {
      const sku = match[1];
      results.push({ sku, confidence: 92, source: 'leading_numeric' });
      console.log(`✅ LEADING numeric: ${sku}`);
    }
  }
  
  // Strategy 3: ENHANCED MULTI-SKU FILENAMES
  const multiSkuPatterns = [
    /(\d{3,8})\.(\d{3,8})/g,         // dot separated
    /(\d{3,8})_(\d{3,8})/g,          // underscore separated
    /(\d{3,8})-(\d{3,8})/g,          // hyphen separated
    /(\d{3,8})\s+(\d{3,8})/g,        // space separated
    /(\d{3,8})\+(\d{3,8})/g,         // plus separated
    /(\d{3,8})&(\d{3,8})/g,          // ampersand separated
    /(\d{3,8})x(\d{3,8})/g,          // x separated
    /(\d{3,8}),(\d{3,8})/g,          // comma separated
  ];
  
  for (const pattern of multiSkuPatterns) {
    let match: RegExpMatchArray | null;
    while ((match = pattern.exec(cleanFilename)) !== null) {
      if (!results.some(r => r.sku === match![1])) {
        results.push({ sku: match[1], confidence: 88, source: 'multi_first' });
        console.log(`✅ MULTI SKU first: ${match[1]}`);
      }
      if (!results.some(r => r.sku === match![2])) {
        results.push({ sku: match[2], confidence: 85, source: 'multi_second' });
        console.log(`✅ MULTI SKU second: ${match[2]}`);
      }
    }
  }
  
  // Strategy 4: CONTEXTUAL PATTERNS (SKU with context)
  const contextualPatterns = [
    /sku[_-]?(\d{3,8})/g,           // sku_12345
    /item[_-]?(\d{3,8})/g,          // item_12345
    /prod[_-]?(\d{3,8})/g,          // prod_12345
    /code[_-]?(\d{3,8})/g,          // code_12345
    /ref[_-]?(\d{3,8})/g,           // ref_12345
    /art[_-]?(\d{3,8})/g,           // art_12345 (article)
  ];
  
  for (const pattern of contextualPatterns) {
    let match;
    while ((match = pattern.exec(cleanFilename)) !== null) {
      const sku = match[1];
      if (!results.some(r => r.sku === sku)) {
        results.push({ sku, confidence: 90, source: 'contextual' });
        console.log(`✅ CONTEXTUAL: ${sku}`);
      }
    }
  }
  
  // Strategy 5: EMBEDDED NUMBERS (Numbers within filename)
  const embeddedPattern = /(?:^|[^\d])(\d{3,8})(?:[^\d]|$)/g;
  let embeddedMatch;
  while ((embeddedMatch = embeddedPattern.exec(cleanFilename)) !== null) {
    const sku = embeddedMatch[1];
    
    // Skip if already found with higher confidence
    if (results.some(r => r.sku === sku && r.confidence > 80)) continue;
    
    results.push({ sku, confidence: 80, source: 'embedded' });
    console.log(`✅ EMBEDDED: ${sku}`);
  }
  
  // Strategy 6: FULL SKU ONLY - No partial matches to avoid false positives
  // Only extract additional full SKUs that might be missed by other strategies
  const fullSkuPatterns = [
    /(?:^|[^\d])(\d{4,8})(?:[^\d]|$)/g,  // 4-8 digit numbers only (minimum 4 digits for full SKUs)
  ];
  
  for (const pattern of fullSkuPatterns) {
    let match;
    while ((match = pattern.exec(cleanFilename)) !== null) {
      const sku = match[1];
      
      // Skip if already found or too short (less than 4 digits)
      if (results.some(r => r.sku === sku)) continue;
      if (sku.length < 4) continue; // Only accept 4+ digit SKUs
      if (sku === '0000' || sku === '1234' || sku === '9999') continue; // Skip obvious non-SKUs
      
      // Higher confidence for longer SKUs, minimum 4 digits
      const confidence = sku.length >= 5 ? 75 : 70;
      results.push({ sku, confidence, source: 'full_sku_only' });
      console.log(`✅ FULL SKU: ${sku} (confidence: ${confidence}%)`);
    }
  }
  
  // Strategy 7: ALPHA-NUMERIC PATTERNS
  const alphaNumericPatterns = [
    /([a-z]+\d+)/g,                 // letters followed by numbers
    /(\d+[a-z]+)/g,                 // numbers followed by letters
  ];
  
  for (const pattern of alphaNumericPatterns) {
    let match;
    while ((match = pattern.exec(cleanFilename)) !== null) {
      const sku = match[1];
      
      // Extract numeric part and check if significant
      const numericPart = sku.match(/\d+/)?.[0];
      if (numericPart && numericPart.length >= 3 && !results.some(r => r.sku === sku)) {
        results.push({ sku, confidence: 75, source: 'alphanumeric' });
        console.log(`✅ ALPHANUMERIC: ${sku}`);
      }
    }
  }
  
  // Remove duplicates and sort by confidence
  const uniqueResults = results.filter((result, index, self) =>
    index === self.findIndex(r => r.sku === result.sku)
  ).sort((a, b) => b.confidence - a.confidence);
  
  // Update diagnostics
  diagnostics.performanceMetrics.skuExtractionTime += Date.now() - extractionStart;
  
  console.log(`📊 FINAL: ${uniqueResults.length} unique SKUs from "${originalFilename}":`, 
    uniqueResults.map(r => `${r.sku}(${r.confidence}%)`));
  
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
    if (!(candidate as any)?.sku) continue;
    
    const similarity = calculateSimilarity(targetSku, (candidate as any).sku);
    if (similarity > bestSimilarity && similarity >= 0.8) {
      bestMatch = candidate;
      bestSimilarity = similarity;
    }
  }
  
  if (bestMatch) {
    console.log(`✅ SIMILARITY match: ${targetSku} → ${(bestMatch as { sku: string }).sku} (${(bestSimilarity * 100).toFixed(1)}%)`);
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

// ENHANCED PROCESSING with comprehensive diagnostics and optimization
async function runConsolidatedProcessing(supabase: any, options: { completeRefresh?: boolean } = {}): Promise<ProcessingResult> {
  const startTime = Date.now();
  const timeoutLimit = 50000; // 50 seconds timeout
  
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
    diagnostics: {
      unmatchedFiles: [],
      unmatchedProducts: [],
      skuPatterns: {},
      confidenceDistribution: {},
      matchingStrategies: {},
      storageInfo: {
        totalFiles: 0,
        processedFiles: 0,
        skippedFiles: 0,
        imageFiles: 0,
        nonImageFiles: 0
      },
      performanceMetrics: {
        avgProcessingTimePerFile: 0,
        skuExtractionTime: 0,
        matchingTime: 0,
        databaseTime: 0
      }
    }
  };

  console.log(`🚀 ENHANCED IMAGE LINKER V4 - Starting comprehensive diagnostic processing`);
  console.log(`⏱️ Timeout protection: ${timeoutLimit/1000}s`);
  
  try {
    // Helper to check timeout
    const checkTimeout = () => {
      if (Date.now() - startTime > timeoutLimit) {
        throw new Error(`Processing timeout after ${timeoutLimit/1000}s - storage scan or matching taking too long`);
      }
    };
    
    // Step 0: Clear existing images if complete refresh requested
    if (options.completeRefresh) {
      result.currentStep = 'Clearing existing images...';
      result.progress = 5;
      
      console.log('🧹 COMPLETE REFRESH: Clearing existing images...');
      const dbStart = Date.now();
      
      const { error: deleteError } = await supabase
        .from('product_images')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      result.diagnostics.performanceMetrics.databaseTime += Date.now() - dbStart;
      
      if (deleteError) {
        console.error('❌ Error clearing images:', deleteError.message);
        result.errors.push(`Clear error: ${deleteError.message}`);
      } else {
        console.log('✅ Existing images cleared');
      }
    }

    // Step 1: Load products with diagnostics
    result.currentStep = 'Loading products and analyzing SKU patterns...';
    result.progress = 15;
    checkTimeout();
    
    console.log('📊 Loading products with diagnostic analysis...');
    const dbStart1 = Date.now();
    
    const { data: allProducts, error: productsError } = await supabase
      .from('products')
      .select('id, sku, name')
      .eq('is_active', true);

    result.diagnostics.performanceMetrics.databaseTime += Date.now() - dbStart1;

    if (productsError) {
      throw new Error(`Products load error: ${productsError.message}`);
    }

    console.log(`📈 Loaded ${allProducts?.length || 0} products`);
    result.productsScanned = allProducts?.length || 0;
    
    // Analyze product SKU patterns for diagnostics
    const productSkuPatterns: { [key: string]: number } = {};
    const productsWithoutImages = new Set<string>();
    
    if (allProducts) {
      for (const product of allProducts) {
        if (product.sku) {
          const skuPattern = product.sku.replace(/\d/g, 'N').replace(/[a-zA-Z]/g, 'L');
          productSkuPatterns[skuPattern] = (productSkuPatterns[skuPattern] || 0) + 1;
          productsWithoutImages.add(product.sku);
        }
      }
    }
    
    console.log('📊 Product SKU patterns:', productSkuPatterns);
    console.log(`📊 Products tracking: ${productsWithoutImages.size} products to match`);
    
    // Create optimized lookup maps
    console.log('🗺️ Creating enhanced lookup maps...');
    const lookupMaps = createProductLookupMaps(allProducts || []);
    console.log(`🗺️ Enhanced maps: ${lookupMaps.skuMap.size} SKU entries, ${lookupMaps.fuzzyMap.size} fuzzy entries`);

    // Step 2: Comprehensive storage scan with diagnostics
    result.currentStep = 'Scanning storage with comprehensive analysis...';
    result.progress = 30;
    checkTimeout();
    
    console.log('📁 Starting comprehensive storage scan...');
    
    // Try to get all files, not just 1000
    let allFiles: any[] = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMoreFiles = true;
    
    while (hasMoreFiles && allFiles.length < 5000) { // Safety limit of 5000 files
      checkTimeout();
      
      console.log(`📁 Scanning batch ${Math.floor(offset/batchSize) + 1} (offset: ${offset})...`);
      
      const { data: batchFiles, error: storageError } = await supabase.storage
        .from('product-images')
        .list('', { 
          limit: 1000,
          offset: offset,
          sortBy: { column: 'name', order: 'asc' } 
        });

      if (storageError) {
        console.error('❌ Storage scan error:', storageError.message);
        result.errors.push(`Storage scan error: ${storageError.message}`);
        break;
      }
      
      if (!batchFiles || batchFiles.length === 0) {
        hasMoreFiles = false;
        console.log('📁 No more files found, stopping scan');
      } else {
        allFiles = allFiles.concat(batchFiles);
        offset += batchSize;
        console.log(`📁 Found ${batchFiles.length} files in batch, total: ${allFiles.length}`);
        
        if (batchFiles.length < batchSize) {
          hasMoreFiles = false;
          console.log('📁 Last batch was partial, stopping scan');
        }
      }
    }

    console.log(`📁 STORAGE SCAN COMPLETE: ${allFiles.length} total files found`);
    result.diagnostics.storageInfo.totalFiles = allFiles.length;
    result.imagesScanned = allFiles.length;

    // Analyze file types
    for (const file of allFiles) {
      if (file.name && /\.(jpg|jpeg|png|gif|webp|ngp|bmp|svg|tiff?)$/i.test(file.name)) {
        result.diagnostics.storageInfo.imageFiles++;
      } else {
        result.diagnostics.storageInfo.nonImageFiles++;
      }
    }
    
    console.log(`📊 File analysis: ${result.diagnostics.storageInfo.imageFiles} images, ${result.diagnostics.storageInfo.nonImageFiles} non-images`);

    // Step 3: Enhanced matching with comprehensive diagnostics
    result.currentStep = 'Processing matches with full diagnostics...';
    result.progress = 50;
    
    const batchInserts: any[] = [];
    const batchCandidates: any[] = [];
    const processedFiles = new Set<string>();
    const matchedProducts = new Set<string>();
    
    if (allFiles && allFiles.length > 0) {
      console.log(`🔍 Starting enhanced matching for ${allFiles.length} files...`);
      
      for (let i = 0; i < allFiles.length; i++) {
        checkTimeout();
        
        const fileProcessStart = Date.now();
        const file = allFiles[i];
        
        if (!file.name || processedFiles.has(file.name)) {
          result.diagnostics.storageInfo.skippedFiles++;
          continue;
        }
        
        // Skip non-image files
        if (!/\.(jpg|jpeg|png|gif|webp|ngp|bmp|svg|tiff?)$/i.test(file.name)) {
          result.diagnostics.storageInfo.skippedFiles++;
          continue;
        }
        
        processedFiles.add(file.name);
        result.diagnostics.storageInfo.processedFiles++;
        
        let fileMatched = false;
        
        try {
          const extractedSKUs = extractSKUsFromFilename(file.name, result.diagnostics);
          
          if (extractedSKUs.length === 0) {
            console.log(`❌ NO SKUs extracted from: ${file.name}`);
            result.diagnostics.unmatchedFiles.push(`${file.name} - No SKUs extracted`);
            continue;
          }
          
          for (const extractedSKU of extractedSKUs.slice(0, 5)) { // Check up to 5 SKUs per file
            const matchStart = Date.now();
            const matchingProduct = findMatchingProduct(lookupMaps, extractedSKU.sku);
            result.diagnostics.performanceMetrics.matchingTime += Date.now() - matchStart;
            
            if (matchingProduct) {
              console.log(`🎯 MATCH: ${file.name} → ${extractedSKU.sku} → ${matchingProduct.sku} (${extractedSKU.confidence}%)`);
              
              // Track matching strategy
              result.diagnostics.matchingStrategies[extractedSKU.source] = 
                (result.diagnostics.matchingStrategies[extractedSKU.source] || 0) + 1;
              
              // Track confidence distribution
              const confidenceRange = Math.floor(extractedSKU.confidence / 10) * 10;
              const confidenceKey = `${confidenceRange}-${confidenceRange + 9}%`;
              result.diagnostics.confidenceDistribution[confidenceKey] = 
                (result.diagnostics.confidenceDistribution[confidenceKey] || 0) + 1;
              
              // Remove from unmatched products
              productsWithoutImages.delete(matchingProduct.sku);
              matchedProducts.add(matchingProduct.sku);
              
              // Strategic confidence thresholds - Prioritize full SKU matches
              let confidenceThreshold = 80; // Increased base threshold for better accuracy
              
              // PRIORITIZE EXACT MATCHES - Lower thresholds for high-confidence patterns
              if (extractedSKU.source === 'exact_numeric') confidenceThreshold = 50;      // Highest priority
              if (extractedSKU.source === 'contextual') confidenceThreshold = 55;         // High priority
              if (extractedSKU.source === 'leading_numeric') confidenceThreshold = 60;    // Good priority
              if (extractedSKU.source.startsWith('exact_padded')) confidenceThreshold = 65; // Padded exact matches
              
              // MULTI-SKU PATTERNS - Medium priority
              if (extractedSKU.source.startsWith('multi')) confidenceThreshold = 70;
              if (extractedSKU.source === 'alphanumeric') confidenceThreshold = 75;
              
              // LOWER PRIORITY - Higher thresholds for less reliable patterns  
              if (extractedSKU.source === 'embedded') confidenceThreshold = 80;
              if (extractedSKU.source === 'full_sku_only') confidenceThreshold = 70;     // Our new full SKU strategy
              
              // REJECT PARTIAL MATCHES - Very high threshold to avoid false positives
              if (extractedSKU.source === 'partial') confidenceThreshold = 95;           // Effectively disabled
              
              if (extractedSKU.confidence >= confidenceThreshold) {
                // Direct link
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
                    processing_method: 'enhanced_diagnostic_linker_v4',
                    confidence_threshold: confidenceThreshold
                  },
                  auto_matched: true,
                  reviewed_at: new Date().toISOString()
                });
              } else {
                // Candidate
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
                    processing_method: 'enhanced_diagnostic_linker_v4',
                    confidence_threshold: confidenceThreshold,
                    reason_for_candidate: `Confidence ${extractedSKU.confidence}% below threshold ${confidenceThreshold}%`
                  },
                  status: 'pending'
                });
              }
              
              fileMatched = true;
              break; // Only process first match per file
            }
          }
          
          if (!fileMatched) {
            console.log(`❌ NO PRODUCT MATCH for: ${file.name} (SKUs: ${extractedSKUs.map(s => s.sku).join(', ')})`);
            result.diagnostics.unmatchedFiles.push(`${file.name} - SKUs found: ${extractedSKUs.map(s => `${s.sku}(${s.confidence}%)`).join(', ')} - No product matches`);
          }
          
        } catch (fileError) {
          console.error(`❌ Error processing ${file.name}:`, fileError);
          result.errors.push(`File ${file.name}: ${fileError}`);
          result.diagnostics.unmatchedFiles.push(`${file.name} - Processing error: ${fileError}`);
        }
        
        // Update performance metrics
        result.diagnostics.performanceMetrics.avgProcessingTimePerFile += Date.now() - fileProcessStart;
        
        // Update progress
        if (i % 100 === 0) {
          result.progress = 50 + (i / allFiles.length) * 35;
          console.log(`📊 Progress: ${Math.round(result.progress)}% (${i}/${allFiles.length} files)`);
        }
      }
    }
    
    // Calculate average processing time
    if (result.diagnostics.storageInfo.processedFiles > 0) {
      result.diagnostics.performanceMetrics.avgProcessingTimePerFile = 
        result.diagnostics.performanceMetrics.avgProcessingTimePerFile / result.diagnostics.storageInfo.processedFiles;
    }
    
    // Identify unmatched products
    result.diagnostics.unmatchedProducts = Array.from(productsWithoutImages).slice(0, 100); // Limit for response size

    // Step 4: Batch database operations with metrics
    result.currentStep = 'Creating image links and candidates...';
    result.progress = 90;
    checkTimeout();
    
    console.log(`💾 BATCH OPERATIONS: ${batchInserts.length} direct links, ${batchCandidates.length} candidates`);
    
    // Batch insert direct links
    if (batchInserts.length > 0) {
      const dbStart2 = Date.now();
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
      
      result.diagnostics.performanceMetrics.databaseTime += Date.now() - dbStart2;
    }

    // Batch insert candidates
    if (batchCandidates.length > 0) {
      const dbStart3 = Date.now();
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
      
      result.diagnostics.performanceMetrics.databaseTime += Date.now() - dbStart3;
    }

    // Final completion and comprehensive diagnostics
    result.status = 'completed';
    result.progress = 100;
    result.currentStep = 'Processing complete - generating diagnostic report';
    result.endTime = new Date().toISOString();
    result.totalTime = Date.now() - startTime;
    
    const matchRate = result.productsScanned > 0 ? 
      ((result.productsScanned - result.diagnostics.unmatchedProducts.length) / result.productsScanned * 100).toFixed(1) : '0';
    
    console.log(`
✅ ENHANCED PROCESSING COMPLETE - DIAGNOSTIC REPORT
===============================================
📊 OVERVIEW:
   • Products: ${result.productsScanned}
   • Images Scanned: ${result.imagesScanned}
   • Images Processed: ${result.diagnostics.storageInfo.processedFiles}
   • Direct Links: ${result.directLinksCreated}
   • Candidates: ${result.candidatesCreated}
   • Match Rate: ${matchRate}%
   
📁 STORAGE ANALYSIS:
   • Total Files: ${result.diagnostics.storageInfo.totalFiles}
   • Image Files: ${result.diagnostics.storageInfo.imageFiles}
   • Non-Image Files: ${result.diagnostics.storageInfo.nonImageFiles}
   • Processed Files: ${result.diagnostics.storageInfo.processedFiles}
   • Skipped Files: ${result.diagnostics.storageInfo.skippedFiles}
   
🎯 MATCHING STRATEGIES:
${Object.entries(result.diagnostics.matchingStrategies).map(([strategy, count]) => 
  `   • ${strategy}: ${count}`).join('\n')}
   
📈 CONFIDENCE DISTRIBUTION:
${Object.entries(result.diagnostics.confidenceDistribution).map(([range, count]) => 
  `   • ${range}: ${count}`).join('\n')}
   
⚡ PERFORMANCE METRICS:
   • Total Time: ${result.totalTime}ms
   • Avg Time/File: ${result.diagnostics.performanceMetrics.avgProcessingTimePerFile.toFixed(2)}ms
   • SKU Extraction: ${result.diagnostics.performanceMetrics.skuExtractionTime}ms
   • Matching Time: ${result.diagnostics.performanceMetrics.matchingTime}ms
   • Database Time: ${result.diagnostics.performanceMetrics.databaseTime}ms
   
❌ ISSUES:
   • Unmatched Files: ${result.diagnostics.unmatchedFiles.length}
   • Unmatched Products: ${result.diagnostics.unmatchedProducts.length}
   • Errors: ${result.errors.length}
`);
    
    // Log some examples of unmatched files for analysis
    if (result.diagnostics.unmatchedFiles.length > 0) {
      console.log('\n🔍 SAMPLE UNMATCHED FILES (first 10):');
      result.diagnostics.unmatchedFiles.slice(0, 10).forEach(file => {
        console.log(`   ❌ ${file}`);
      });
    }
    
    // Log filename patterns that might need attention
    console.log('\n📊 FILENAME PATTERNS DETECTED:');
    Object.entries(result.diagnostics.skuPatterns)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([pattern, count]) => {
        console.log(`   • ${pattern}: ${count} files`);
      });
    
    return result;
    
  } catch (error) {
    console.error('❌ Enhanced processing failed:', error);
    
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