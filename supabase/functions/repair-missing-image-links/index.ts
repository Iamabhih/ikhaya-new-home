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

// Enhanced SKU extraction function - copied from scanner with improvements
function extractSKUsFromFilename(filename: string, fullPath?: string): ExtractedSKU[] {
  const skus: ExtractedSKU[] = [];
  const cleanName = filename.replace(/\.(jpg|jpeg|png|webp|gif)$/i, '');
  
  console.log(`🔍 Extracting SKUs from: ${filename} → ${cleanName}`);
  
  // Strategy 1: Exact filename as SKU (highest confidence)
  if (/^\d{3,}$/.test(cleanName)) {
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
  
  // Strategy 2: Multiple SKUs in filename (e.g., "455470.455471.455472")
  const multiSkuPattern = /^(\d+(?:\.\d+)+)$/;
  const multiSkuMatch = cleanName.match(multiSkuPattern);
  if (multiSkuMatch) {
    const potentialSkus = cleanName.split('.');
    potentialSkus.forEach((sku, index) => {
      if (/^\d{3,}$/.test(sku) && !skus.find(s => s.sku === sku)) {
        skus.push({
          sku: sku,
          confidence: 85 - (index * 5),
          source: 'multi_sku'
        });
        console.log(`✅ Multi-SKU ${index + 1}: ${sku}`);
      }
    });
  }

  // Strategy 3: SKU with suffix/prefix patterns
  if (!skus.length) {
    const patterns = [
      /^(\d{3,})[a-zA-Z_\-]+$/g,     // numeric with suffix
      /^[a-zA-Z_\-]+(\d{3,})$/g,     // prefix with numeric
      /(\d{3,})/g                     // any 3+ digit sequence
    ];

    patterns.forEach((pattern, patternIndex) => {
      try {
        const matches = [...cleanName.matchAll(pattern)];
        matches.forEach(match => {
          const numericPart = match[1] || match[0].replace(/[^0-9]/g, '');
          if (/^\d{3,}$/.test(numericPart) && !skus.find(s => s.sku === numericPart)) {
            let confidence = 50 - (patternIndex * 10);
            
            // Boost confidence based on context
            if (cleanName === numericPart) confidence = 90;
            else if (cleanName.startsWith(numericPart)) confidence = 75;
            else if (cleanName.endsWith(numericPart)) confidence = 65;
            
            skus.push({
              sku: numericPart,
              confidence: Math.max(20, confidence),
              source: 'numeric_pattern'
            });
            console.log(`✅ Pattern match: ${numericPart} (${confidence}%)`);
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

    // Phase 3: Comprehensive storage scan
    console.log(`\n📁 Phase 3: Scanning storage for images`);
    
    const getAllImages = async (path = '', depth = 0): Promise<Array<{name: string, fullPath: string}>> => {
      if (depth > 10) {
        console.warn(`⚠️ Max depth reached at: ${path}`);
        return [];
      }
      
      const { data: items, error } = await supabase.storage
        .from('product-images')
        .list(path, { limit: 1000 });

      if (error) {
        console.error(`❌ Error scanning ${path}:`, error.message);
        return [];
      }

      let allImages: Array<{name: string, fullPath: string}> = [];
      
      for (const item of items || []) {
        if (!item.name || item.name.includes('.emptyFolderPlaceholder')) continue;
        
        const fullPath = path ? `${path}/${item.name}` : item.name;
        const isDirectory = !item.id && !item.metadata && !item.name.includes('.');
        
        if (isDirectory && comprehensive_scan) {
          console.log(`📁 Scanning folder: ${fullPath}`);
          const subImages = await getAllImages(fullPath, depth + 1);
          allImages = allImages.concat(subImages);
        } else if (item.name.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)) {
          allImages.push({ name: item.name, fullPath });
          console.log(`📸 Found image: ${fullPath}`);
        }
      }
      
      return allImages;
    };

    const allImages = await getAllImages();
    result.imagesFound = allImages.length;
    console.log(`📊 Storage scan complete: ${result.imagesFound} images found`);

    // Phase 4: Advanced matching with enhanced SKU extraction and duplicate prevention
    console.log(`\n🎯 Phase 4: Advanced image-to-product matching with duplicate prevention`);
    
    // Helper functions for matching
    const normalizeSKU = (sku: string) => (sku || '').toLowerCase().trim();
    const removeLeadingZeros = (sku: string) => sku.replace(/^0+/, '') || '0';
    
    for (const product of productsNeedingImages) {
      if (!product.sku) continue;
      
      console.log(`\n🔍 Processing: ${product.sku} (${product.name})`);
      const productSku = normalizeSKU(product.sku);
      
      let bestMatch = null;
      let bestConfidence = 0;
      let matchType = '';
      
      // Try to match with each image
      for (const image of allImages) {
        const filename = image.name.toLowerCase();
        const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
        
        // Extract potential SKUs using advanced logic
        const extractedSKUs = extractSKUsFromFilename(nameWithoutExt, image.fullPath);
        
        for (const skuCandidate of extractedSKUs) {
          const candidateSku = normalizeSKU(skuCandidate.sku);
          let confidence = 0;
          let type = '';
          
          // Exact match
          if (productSku === candidateSku) {
            confidence = skuCandidate.confidence;
            type = 'exact';
          }
          // Zero-padding variations
          else if (removeLeadingZeros(productSku) === removeLeadingZeros(candidateSku)) {
            confidence = skuCandidate.confidence * 0.95;
            type = 'zeropadded';
          }
          // Multi-SKU match
          else if (skuCandidate.source === 'multi_sku' && 
                   (productSku === candidateSku || candidateSku.includes(productSku))) {
            confidence = skuCandidate.confidence * 0.9;
            type = 'multisku';
          }
          // Pattern match
          else if (skuCandidate.source === 'numeric_pattern') {
            if (productSku === candidateSku || candidateSku === productSku) {
              confidence = skuCandidate.confidence * 0.8;
              type = 'pattern';
            }
          }
          // Contains match (for high-confidence candidates only)
          else if (skuCandidate.confidence >= 80 && 
                   (productSku.includes(candidateSku) || candidateSku.includes(productSku))) {
            confidence = skuCandidate.confidence * 0.7;
            type = 'contains';
          }
          
          if (confidence > bestConfidence) {
            bestMatch = image;
            bestConfidence = confidence;
            matchType = type;
          }
        }
      }
      
      // Process the best match with duplicate prevention
      if (bestMatch && bestConfidence >= confidence_threshold) {
        console.log(`✅ Best match: ${bestMatch.name} (${bestConfidence.toFixed(1)}% - ${matchType})`);
        
        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(bestMatch.fullPath);

        // Check for existing links to prevent duplicates
        const { data: existingImage } = await supabase
          .from('product_images')
          .select('id')
          .eq('product_id', product.id)
          .eq('image_url', publicUrl)
          .single();

        const { data: existingCandidate } = await supabase
          .from('product_image_candidates')
          .select('id')
          .eq('product_id', product.id)
          .eq('image_url', publicUrl)
          .single();

        if (existingImage || existingCandidate) {
          console.log(`⚠️ Duplicate prevented: ${product.sku} -> ${bestMatch.name} (already exists)`);
          result.skippedExisting++;
          continue;
        }

        try {
          // Direct link for high-confidence matches (>=85%)
          if (bestConfidence >= 85) {
            // Check if product already has a primary image
            const { data: existingPrimary } = await supabase
              .from('product_images')
              .select('id')
              .eq('product_id', product.id)
              .eq('is_primary', true)
              .single();

            const { error: insertError } = await supabase
              .from('product_images')
              .insert({
                product_id: product.id,
                image_url: publicUrl,
                alt_text: `${product.name} - ${bestMatch.name}`,
                is_primary: !existingPrimary, // Only set as primary if no existing primary
                sort_order: existingPrimary ? 999 : 1,
                image_status: 'active',
                match_confidence: Math.round(bestConfidence),
                match_metadata: {
                  source: 'advanced_repair',
                  filename: bestMatch.name,
                  session_id: sessionId,
                  match_type: matchType,
                  scan_mode: mode
                },
                auto_matched: true
              });

            if (insertError) {
              // Check if it's a duplicate error
              if (insertError.message.includes('duplicate') || insertError.code === '23505') {
                console.log(`⚠️ Duplicate prevented by constraint: ${product.sku} -> ${bestMatch.name}`);
                result.skippedExisting++;
              } else {
                result.errors.push(`Failed to link ${bestMatch.name} to ${product.sku}: ${insertError.message}`);
              }
            } else {
              result.linksCreated++;
              result.matchingStats[matchType as keyof typeof result.matchingStats]++;
              console.log(`✅ Direct link created: ${bestMatch.name} → ${product.sku}`);
            }
          }
          // Create candidate for medium-confidence matches (75-84%)
          else {
            const { error: candidateError } = await supabase
              .from('product_image_candidates')
              .insert({
                product_id: product.id,
                image_url: publicUrl,
                alt_text: `${product.name} - ${bestMatch.name}`,
                match_confidence: Math.round(bestConfidence),
                match_metadata: {
                  source: 'advanced_repair',
                  filename: bestMatch.name,
                  session_id: sessionId,
                  match_type: matchType,
                  scan_mode: mode
                },
                status: 'pending'
              });

            if (candidateError) {
              // Check if it's a duplicate error
              if (candidateError.message.includes('duplicate') || candidateError.code === '23505') {
                console.log(`⚠️ Candidate duplicate prevented: ${product.sku} -> ${bestMatch.name}`);
                result.skippedExisting++;
              } else {
                result.errors.push(`Failed to create candidate for ${bestMatch.name}: ${candidateError.message}`);
              }
            } else {
              result.candidatesCreated++;
              result.matchingStats[matchType as keyof typeof result.matchingStats]++;
              console.log(`📋 Candidate created: ${bestMatch.name} → ${product.sku} (${bestConfidence.toFixed(1)}%)`);
            }
          }
        } catch (error) {
          result.errors.push(`Error processing ${product.sku}: ${error.message}`);
        }
      } else if (bestMatch) {
        console.log(`⚠️ Low confidence match: ${bestMatch.name} (${bestConfidence.toFixed(1)}% - below ${confidence_threshold}%)`);
        result.skippedExisting++;
      } else {
        console.log(`❌ No matches found for: ${product.sku}`);
      }
    }

    // Final summary
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