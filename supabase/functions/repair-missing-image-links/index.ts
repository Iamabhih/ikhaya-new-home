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
}

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
      confidence_threshold = 75,
      comprehensive_scan = true,
      auto_promote_candidates = true
    } = config;

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
    
    // Helper functions for matching
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