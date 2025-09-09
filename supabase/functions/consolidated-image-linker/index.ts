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

// COMPREHENSIVE SKU EXTRACTION - Handles ALL common patterns and formats
function extractSKUsFromFilename(filename: string, fullPath?: string): ExtractedSKU[] {
  const results: ExtractedSKU[] = [];
  const originalFilename = filename;
  const cleanFilename = filename.toLowerCase().replace(/\.(jpg|jpeg|png|gif|webp|ngp|bmp|svg|tiff?)$/i, '');
  
  console.log(`📝 COMPREHENSIVE EXTRACTION from: "${filename}" (clean: "${cleanFilename}")`);
  
  // Strategy 1: EXACT NUMERIC MATCH (Pure numbers - highest confidence)
  const exactNumeric = cleanFilename.match(/^(\d{3,8})$/);
  if (exactNumeric) {
    const sku = exactNumeric[1];
    results.push({ sku, confidence: 98, source: 'exact_numeric' });
    console.log(`✅ EXACT numeric: ${sku}`);
    
    // Add zero-padded variations
    if (sku.length === 3) results.push({ sku: '0' + sku, confidence: 95, source: 'exact_padded_4' });
    if (sku.length === 4) results.push({ sku: '0' + sku, confidence: 95, source: 'exact_padded_5' });
    if (sku.length === 5) results.push({ sku: '0' + sku, confidence: 95, source: 'exact_padded_6' });
    
    // Add zero-removal variations
    if (sku.startsWith('0') && sku.length > 3) {
      results.push({ sku: sku.substring(1), confidence: 95, source: 'exact_unpadded' });
    }
  }
  
  // Strategy 2: ALPHANUMERIC SKUs (Letters + Numbers)
  const alphanumericPatterns = [
    /^([a-z]{1,3}\d{3,8})$/i,        // ABC123456
    /^(\d{3,8}[a-z]{1,3})$/i,        // 123456ABC  
    /^([a-z]\d{3,8})$/i,             // A123456
    /^(\d{3,8}[a-z])$/i,             // 123456A
    /^([a-z]{1,2}-\d{3,8})$/i,       // AB-123456
    /^(\d{3,8}-[a-z]{1,2})$/i,       // 123456-AB
  ];
  
  alphanumericPatterns.forEach((pattern, index) => {
    const match = cleanFilename.match(pattern);
    if (match) {
      results.push({
        sku: match[1].toUpperCase(),
        confidence: 92 - (index * 2),
        source: `alphanumeric_${index + 1}`
      });
      console.log(`✅ ALPHANUMERIC: ${match[1].toUpperCase()}`);
    }
  });
  
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
    const allNumbers = multiMatch[0].match(/\d{3,8}/g) || [];
    const uniqueNumbers = [...new Set(allNumbers)]; // Remove duplicates
    
    uniqueNumbers.forEach((sku, index) => {
      const isFirst = index === 0;
      const isLast = index === uniqueNumbers.length - 1;
      
      let confidence = 85;
      if (isLast && uniqueNumbers.length > 1) confidence = 90; // Last often most important
      if (isFirst && uniqueNumbers.length > 2) confidence = 75; // First might be category
      
      results.push({
        sku: sku,
        confidence: confidence,
        source: `multi_sku_${isLast ? 'last' : isFirst ? 'first' : 'middle'}`
      });
      console.log(`✅ MULTI-SKU ${isLast ? 'LAST' : isFirst ? 'FIRST' : 'MIDDLE'}: ${sku}`);
      
      // Add zero variations for multi-SKU
      if (sku.length === 5 && !sku.startsWith('0')) {
        results.push({ sku: '0' + sku, confidence: confidence - 5, source: `multi_sku_padded` });
      }
      if (sku.startsWith('0') && sku.length > 3) {
        results.push({ sku: sku.substring(1), confidence: confidence - 5, source: `multi_sku_unpadded` });
      }
    });
  }
  
  // Strategy 4: PREFIXED/SUFFIXED SKUs  
  const affixPatterns = [
    /^sku[\-_]?(\d{3,8})$/i,          // SKU-123456
    /^item[\-_]?(\d{3,8})$/i,         // ITEM-123456  
    /^prod[\-_]?(\d{3,8})$/i,         // PROD-123456
    /^product[\-_]?(\d{3,8})$/i,      // PRODUCT-123456
    /^(\d{3,8})[\-_]?sku$/i,          // 123456-SKU
    /^(\d{3,8})[\-_]?item$/i,         // 123456-ITEM
    /^(\d{3,8})[\-_]?v\d+$/i,         // 123456-v1
    /^(\d{3,8})[\-_]?\(\d+\)$/i,      // 123456-(1)
    /^(\d{3,8})[\-_]?copy$/i,         // 123456-copy
    /^(\d{3,8})[\-_]?final$/i,        // 123456-final
    /^(\d{3,8})[\-_]?main$/i,         // 123456-main
    /^(\d{3,8})[\-_]?front$/i,        // 123456-front
    /^(\d{3,8})[\-_]?back$/i,         // 123456-back
    /^(\d{3,8})[\-_]?side$/i,         // 123456-side
    /^(\d{3,8})[\-_]?top$/i,          // 123456-top
    /^(\d{3,8})[\-_]?angle$/i,        // 123456-angle
    /^(\d{3,8})[\-_]?detail$/i,       // 123456-detail
    /^(\d{3,8})[\-_]?pack$/i,         // 123456-pack
    /^(\d{3,8})[\-_]?box$/i,          // 123456-box
  ];
  
  affixPatterns.forEach((pattern, index) => {
    const match = cleanFilename.match(pattern);
    if (match) {
      const sku = match[1];
      const confidence = 88 - Math.floor(index / 3); // Slight decrease for less common patterns
      results.push({ sku, confidence, source: `affix_pattern_${index + 1}` });
      console.log(`✅ AFFIX pattern: ${sku} (confidence: ${confidence}%)`);
    }
  });
  
  // Strategy 5: BRACKETED/PARENTHETICAL SKUs
  const bracketPatterns = [
    /\[(\d{3,8})\]/g,                 // [123456]
    /\((\d{3,8})\)/g,                 // (123456)
    /\{(\d{3,8})\}/g,                 // {123456}
    /<(\d{3,8})>/g,                   // <123456>
  ];
  
  bracketPatterns.forEach((pattern, index) => {
    let match;
    while ((match = pattern.exec(cleanFilename)) !== null) {
      results.push({
        sku: match[1],
        confidence: 85 - (index * 2),
        source: `bracket_${index + 1}`
      });
      console.log(`✅ BRACKET: ${match[1]}`);
    }
  });
  
  // Strategy 6: ZERO-PADDING VARIATIONS (Comprehensive)
  const standaloneNumbers = cleanFilename.match(/\b\d{3,8}\b/g) || [];
  standaloneNumbers.forEach(sku => {
    if (!results.some(r => r.sku === sku)) {
      const baseConfidence = cleanFilename === sku ? 80 : 70;
      results.push({ sku, confidence: baseConfidence, source: 'standalone_numeric' });
      console.log(`✅ STANDALONE: ${sku}`);
      
      // Comprehensive zero-padding variations
      if (sku.length === 3) {
        results.push({ sku: '0' + sku, confidence: baseConfidence - 5, source: 'padded_4' });
        results.push({ sku: '00' + sku, confidence: baseConfidence - 10, source: 'padded_5' });
        results.push({ sku: '000' + sku, confidence: baseConfidence - 15, source: 'padded_6' });
      }
      if (sku.length === 4) {
        results.push({ sku: '0' + sku, confidence: baseConfidence - 5, source: 'padded_5' });
        results.push({ sku: '00' + sku, confidence: baseConfidence - 10, source: 'padded_6' });
      }
      if (sku.length === 5) {
        results.push({ sku: '0' + sku, confidence: baseConfidence - 5, source: 'padded_6' });
      }
      
      // Zero removal variations
      if (sku.startsWith('0')) {
        let trimmed = sku;
        let trimLevel = 0;
        while (trimmed.startsWith('0') && trimmed.length > 1) {
          trimmed = trimmed.substring(1);
          trimLevel++;
          if (trimmed.length >= 3) {
            results.push({ 
              sku: trimmed, 
              confidence: baseConfidence - (trimLevel * 3), 
              source: `unpadded_${trimLevel}` 
            });
            console.log(`✅ UNPADDED: ${trimmed}`);
          }
        }
      }
    }
  });
  
  // Strategy 7: PARTIAL MATCHES in longer strings
  const partialPatterns = [
    /(\d{3,8})[\-_][a-z]+/gi,         // 123456-variant
    /[a-z]+[\-_](\d{3,8})/gi,         // variant-123456
    /(\d{3,8})[a-z]{1,3}$/gi,         // 123456abc
    /^[a-z]{1,3}(\d{3,8})/gi,         // abc123456
  ];
  
  partialPatterns.forEach((pattern, index) => {
    let match;
    while ((match = pattern.exec(cleanFilename)) !== null) {
      if (!results.some(r => r.sku === match[1])) {
        results.push({
          sku: match[1],
          confidence: 75 - (index * 3),
          source: `partial_${index + 1}`
        });
        console.log(`✅ PARTIAL: ${match[1]}`);
      }
    }
  });
  
  // Strategy 8: FALLBACK - Any 3+ digit number not yet captured
  if (results.length === 0) {
    const fallbackNumbers = cleanFilename.match(/\d{3,}/g) || [];
    fallbackNumbers.forEach((sku, index) => {
      results.push({
        sku: sku,
        confidence: Math.max(50 - (index * 5), 20),
        source: 'fallback_any_numeric'
      });
      console.log(`✅ FALLBACK: ${sku}`);
    });
  }
  
  // Remove duplicates, keeping highest confidence
  const uniqueResults = new Map<string, ExtractedSKU>();
  results.forEach(result => {
    const existing = uniqueResults.get(result.sku);
    if (!existing || existing.confidence < result.confidence) {
      uniqueResults.set(result.sku, result);
    }
  });
  
  const finalResults = Array.from(uniqueResults.values()).sort((a, b) => b.confidence - a.confidence);
  console.log(`📊 FINAL: ${finalResults.length} unique SKUs from "${originalFilename}":`, 
    finalResults.map(r => `${r.sku}(${r.confidence}%)`));
  
  return finalResults;
}

// COMPREHENSIVE PRODUCT MATCHING - Handles all SKU variations and formats
function findMatchingProduct(productSKUs: Array<{id: string, sku: string}>, sku: string): {id: string, sku: string} | undefined {
  console.log(`🔍 MATCHING "${sku}" against ${productSKUs.length} products`);
  
  // Create normalized versions for comparison
  const normalizeForComparison = (str: string) => str.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  const skuNormalized = normalizeForComparison(sku);
  
  // Strategy 1: EXACT MATCH (case insensitive)
  let match = productSKUs.find(p => normalizeForComparison(p.sku) === skuNormalized);
  if (match) {
    console.log(`✅ EXACT match: ${sku} → ${match.sku}`);
    return match;
  }
  
  // Strategy 2: NUMERIC ONLY comparison (remove all non-numeric)
  const extractNumbers = (str: string) => str.replace(/[^0-9]/g, '');
  const skuNumbers = extractNumbers(sku);
  
  if (skuNumbers.length >= 3) {
    match = productSKUs.find(p => extractNumbers(p.sku) === skuNumbers);
    if (match) {
      console.log(`✅ NUMERIC match: ${sku} (${skuNumbers}) → ${match.sku}`);
      return match;
    }
  }
  
  // Strategy 3: ZERO-PADDING VARIATIONS (comprehensive)
  const zeroVariations = [];
  
  // Add leading zeros (3 to 8 digits total)
  for (let targetLength = Math.max(sku.length + 1, 4); targetLength <= 8; targetLength++) {
    if (sku.length < targetLength) {
      zeroVariations.push(sku.padStart(targetLength, '0'));
    }
  }
  
  // Remove leading zeros
  let trimmed = sku;
  while (trimmed.startsWith('0') && trimmed.length > 1) {
    trimmed = trimmed.substring(1);
    if (trimmed.length >= 3) {
      zeroVariations.push(trimmed);
    }
  }
  
  // Check all zero variations
  for (const variation of zeroVariations) {
    match = productSKUs.find(p => normalizeForComparison(p.sku) === normalizeForComparison(variation));
    if (match) {
      console.log(`✅ ZERO-PADDING match: ${sku} → ${variation} → ${match.sku}`);
      return match;
    }
  }
  
  // Strategy 4: CONTAINS MATCH (for partial SKUs)
  if (sku.length >= 4) {
    // Check if extracted SKU is contained in product SKU
    match = productSKUs.find(p => normalizeForComparison(p.sku).includes(skuNormalized));
    if (match) {
      console.log(`✅ CONTAINS match: ${sku} found in ${match.sku}`);
      return match;
    }
    
    // Check if product SKU is contained in extracted SKU
    match = productSKUs.find(p => skuNormalized.includes(normalizeForComparison(p.sku)) && p.sku.length >= 3);
    if (match) {
      console.log(`✅ REVERSE CONTAINS match: ${match.sku} found in ${sku}`);
      return match;
    }
  }
  
  // Strategy 5: ALPHANUMERIC VARIATIONS
  if (/[a-z]/i.test(sku)) {
    // Try matching just the numeric part
    const justNumbers = sku.replace(/[^0-9]/g, '');
    if (justNumbers.length >= 3) {
      match = productSKUs.find(p => extractNumbers(p.sku) === justNumbers);
      if (match) {
        console.log(`✅ ALPHANUMERIC-NUMERIC match: ${sku} (${justNumbers}) → ${match.sku}`);
        return match;
      }
    }
    
    // Try matching just the alphabetic part + numbers in product
    const letters = sku.replace(/[^a-z]/gi, '').toUpperCase();
    const numbers = sku.replace(/[^0-9]/g, '');
    if (letters && numbers.length >= 3) {
      match = productSKUs.find(p => {
        const pLetters = p.sku.replace(/[^a-z]/gi, '').toUpperCase();
        const pNumbers = p.sku.replace(/[^0-9]/g, '');
        return pLetters === letters && pNumbers === numbers;
      });
      if (match) {
        console.log(`✅ ALPHANUMERIC-SPLIT match: ${sku} (${letters}+${numbers}) → ${match.sku}`);
        return match;
      }
    }
  }
  
  // Strategy 6: LEVENSHTEIN DISTANCE for close matches
  const calculateDistance = (str1: string, str2: string): number => {
    const matrix: number[][] = [];
    for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
    for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  };
  
  if (sku.length >= 4) {
    const candidates = productSKUs.filter(p => Math.abs(p.sku.length - sku.length) <= 2);
    let bestMatch = null;
    let bestDistance = Infinity;
    
    for (const candidate of candidates) {
      const distance = calculateDistance(skuNormalized, normalizeForComparison(candidate.sku));
      const maxLength = Math.max(skuNormalized.length, normalizeForComparison(candidate.sku).length);
      const similarity = 1 - (distance / maxLength);
      
      if (similarity >= 0.8 && distance < bestDistance) {
        bestDistance = distance;
        bestMatch = candidate;
      }
    }
    
    if (bestMatch) {
      console.log(`✅ FUZZY match: ${sku} → ${bestMatch.sku} (similarity: ${(1 - bestDistance / Math.max(skuNormalized.length, normalizeForComparison(bestMatch.sku).length)) * 100}%)`);
      return bestMatch;
    }
  }
  
  console.log(`❌ NO match found for: ${sku}`);
  return undefined;
}

// Enhanced processing function with complete refresh capability
async function runConsolidatedProcessing(supabase: any, options: { completeRefresh?: boolean } = {}): Promise<ProcessingResult> {
  const startTime = new Date().toISOString();
  const result: ProcessingResult = {
    status: 'running',
    progress: 0,
    currentStep: 'Initializing',
    productsScanned: 0,
    imagesScanned: 0,
    directLinksCreated: 0,
    candidatesCreated: 0,
    errors: [],
    startTime,
    debugInfo: {}
  };

  console.log(`🚀 Starting consolidated image linking process`);
  console.log(`🔧 Options:`, options);
  const startProcessingTime = Date.now();
  
  try {
    let currentProgress = options.completeRefresh ? 5 : 10;
    
    // Step 0: Clear existing images if complete refresh requested
    if (options.completeRefresh) {
      result.currentStep = 'Clearing existing product images';
      result.progress = 5;
      
      console.log('🧹 COMPLETE REFRESH: Clearing existing product images...');
      
      const { data: existingImages, error: fetchError } = await supabase
        .from('product_images')
        .select('id');
      
      if (fetchError) {
        throw new Error(`Failed to fetch existing images: ${fetchError.message}`);
      }

      if (existingImages && existingImages.length > 0) {
        const { error: deleteError } = await supabase
          .from('product_images')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
        
        if (deleteError) {
          throw new Error(`Failed to clear existing images: ${deleteError.message}`);
        }
        
        result.imagesCleared = existingImages.length;
        console.log(`🧹 CLEARED: ${existingImages.length} existing product images`);
      } else {
        result.imagesCleared = 0;
        console.log('🧹 NO IMAGES TO CLEAR');
      }
      
      currentProgress = 15;
    }

    // Step 1: Get active products
    result.currentStep = 'Loading products';
    result.progress = currentProgress;
    
    console.log('🔍 DEBUG: About to query products table...');
    
    // Use multiple queries to ensure we get ALL products
    let allProducts = [];
    let hasMore = true;
    let offset = 0;
    const batchSize = 1000;
    
    while (hasMore) {
      const { data: batch, error: batchError } = await supabase
        .from('products')
        .select('id, sku, name')
        .eq('is_active', true)
        .range(offset, offset + batchSize - 1);
      
      if (batchError) throw new Error(`Products fetch error: ${batchError.message}`);
      
      if (batch && batch.length > 0) {
        allProducts = allProducts.concat(batch);
        offset += batchSize;
        hasMore = batch.length === batchSize; // Continue if we got a full batch
      } else {
        hasMore = false;
      }
    }
    
    console.log('🔍 DEBUG: Query completed');
    console.log('🔍 DEBUG: Total products loaded:', allProducts?.length);
    
    result.productsScanned = allProducts?.length || 0;
    console.log(`📊 Loaded ${result.productsScanned} products`);
    
    // Find packaging products for debugging
    const packagingProducts = allProducts?.filter(p => 
      p.sku === '455404' || p.sku === '455382'
    ) || [];
    result.debugInfo.packagingProducts = packagingProducts;
    console.log('📦 PACKAGING DEBUG: Found products:', packagingProducts);
    console.log('📦 PACKAGING DEBUG: All products count:', allProducts?.length);
    console.log('📦 PACKAGING DEBUG: Sample products:', allProducts?.slice(0, 5));
    
    // Step 2: Scan storage for images
    result.currentStep = 'Scanning storage images';
    result.progress = options.completeRefresh ? 35 : 30;
    
    console.log('🖼️ Scanning storage for images...');
    const { data: files, error: storageError } = await supabase.storage
      .from('product-images')
      .list('', { limit: 10000, sortBy: { column: 'name', order: 'asc' } });

    if (storageError) {
      throw new Error(`Storage scan error: ${storageError.message}`);
    }

    console.log(`📁 Found ${files?.length || 0} files in storage`);
    result.imagesScanned = files?.length || 0;

    // Step 3: Process matches and create links
    result.currentStep = 'Processing matches and creating links';
    result.progress = options.completeRefresh ? 65 : 60;
    
    const processedImages = new Set<string>();
    let directLinksCreated = 0;
    let candidatesCreated = 0;
    
    console.log('🔍 Starting image processing...');
    
    if (files && files.length > 0) {
      for (const file of files) {
        if (file.name && !processedImages.has(file.name)) {
          console.log(`📝 COMPREHENSIVE EXTRACTION from: "${file.name}" (clean: "${file.name.toLowerCase().replace(/\.(jpg|jpeg|png|gif|webp|ngp|bmp|svg|tiff?)$/i, '')}")`);
          
          try {
            // Extract SKUs using comprehensive strategy
            const extractedSKUs = extractSKUsFromFilename(file.name);
            
            if (extractedSKUs.length > 0) {
              console.log(`📊 Found ${extractedSKUs.length} potential SKUs:`, extractedSKUs.map(s => `${s.sku}(${s.confidence}%)`));
              
              // Try to match each extracted SKU (process ALL, not just first match)
              for (const extractedSKU of extractedSKUs) {
                const matchingProduct = findMatchingProduct(allProducts, extractedSKU.sku);
                
                if (matchingProduct) {
                  console.log(`🎯 MATCH FOUND: ${file.name} → ${extractedSKU.sku} → Product ${matchingProduct.sku} (${matchingProduct.id})`);
                  
                  // Check if link already exists
                  const { data: existingLink } = await supabase
                    .from('product_images')
                    .select('id')
                    .eq('product_id', matchingProduct.id)
                    .eq('image_url', `product-images/${file.name}`)
                    .single();
                  
                  if (!existingLink) {
                    const confidenceThreshold = 65; // Lowered from 70% for even better coverage
                    
                    if (extractedSKU.confidence >= confidenceThreshold) {
                      // Create direct link (high confidence)
                      const { error: linkError } = await supabase
                        .from('product_images')
                        .insert({
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
                            processing_method: 'consolidated_linker_v2_fixed',
                            complete_refresh: options.completeRefresh || false
                          },
                          auto_matched: true,
                          reviewed_at: new Date().toISOString(),
                          reviewed_by: null
                        });
                      
                      if (linkError) {
                        console.error(`❌ Error creating direct link:`, linkError);
                        result.errors.push(`Failed to create link for ${file.name}: ${linkError.message}`);
                      } else {
                        directLinksCreated++;
                        console.log(`✅ DIRECT LINK created: ${file.name} → ${matchingProduct.sku}`);
                      }
                    } else {
                      // Create candidate (lower confidence)
                      const { error: candidateError } = await supabase
                        .from('product_image_candidates')
                        .insert({
                          product_id: matchingProduct.id,
                          image_url: `product-images/${file.name}`,
                          alt_text: `${matchingProduct.name} - ${file.name}`,
                          match_confidence: extractedSKU.confidence,
                          match_metadata: {
                            source: extractedSKU.source,
                            original_filename: file.name,
                            extracted_sku: extractedSKU.sku,
                            matched_product_sku: matchingProduct.sku,
                            processing_method: 'consolidated_linker_v2_fixed',
                            complete_refresh: options.completeRefresh || false
                          },
                          status: 'pending'
                        });
                      
                      if (candidateError) {
                        console.error(`❌ Error creating candidate:`, candidateError);
                        result.errors.push(`Failed to create candidate for ${file.name}: ${candidateError.message}`);
                      } else {
                        candidatesCreated++;
                        console.log(`📋 CANDIDATE created: ${file.name} → ${matchingProduct.sku}`);
                      }
                    }
                  } else {
                    console.log(`⚡ SKIPPED: Link already exists for ${file.name} → ${matchingProduct.sku}`);
                  }
                  
                  // DON'T break here - continue processing other SKUs in the same image
                  // This allows multi-SKU images to link to multiple products
                } else {
                  console.log(`❌ NO MATCH: ${extractedSKU.sku} from ${file.name}`);
                }
              }
            } else {
              console.log(`⚠️ NO SKUs extracted from: ${file.name}`);
            }
          } catch (error) {
            console.error(`❌ Error processing ${file.name}:`, error);
            result.errors.push(`Error processing ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
          
          processedImages.add(file.name);
        }
      }
      
      result.directLinksCreated = directLinksCreated;
      result.candidatesCreated = candidatesCreated;
      
      console.log(`🎯 MATCHING COMPLETE:`);
      console.log(`   Direct Links: ${directLinksCreated}`);
      console.log(`   Candidates: ${candidatesCreated}`);
      console.log(`   Total Matches: ${directLinksCreated + candidatesCreated}`);
    }
    
    result.endTime = new Date().toISOString();
    result.totalTime = Date.now() - startProcessingTime;

    console.log(`✅ Processing completed successfully!`);
    result.status = 'completed';
    result.progress = 100;
    
    // Enhanced completion summary
    const successRate = allProducts.length > 0 ? 
      Math.round(((result.directLinksCreated + result.candidatesCreated) / allProducts.length) * 100) : 0;
    
    console.log(`📊 FINAL SUMMARY:`);
    console.log(`   Products: ${result.productsScanned}`);
    console.log(`   Images: ${result.imagesScanned}`);
    console.log(`   Direct Links: ${result.directLinksCreated}`);
    console.log(`   Candidates: ${result.candidatesCreated}`);
    console.log(`   Success Rate: ${successRate}%`);
    if (result.imagesCleared !== undefined) {
      console.log(`   Images Cleared: ${result.imagesCleared}`);
    }

  } catch (error) {
    console.error('❌ Processing failed:', error);
    result.status = 'failed';
    result.endTime = new Date().toISOString();
    result.totalTime = Date.now() - startProcessingTime;
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    
    // Preserve any partial progress
    result.currentStep = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }

  return result;
}

// Enhanced Deno serve handler with complete refresh support
Deno.serve(async (req) => {
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
    console.log('🚀 Starting consolidated processing...');
    
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
