import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simplified data structures
interface ProcessingResult {
  status: 'running' | 'completed' | 'failed'
  progress: number
  currentStep: string
  productsScanned: number
  imagesScanned: number
  directLinksCreated: number
  candidatesCreated: number
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

// Enhanced SKU extraction with better pattern matching for complex filenames
function extractSKUsFromFilename(filename: string, fullPath?: string): ExtractedSKU[] {
  const results: ExtractedSKU[] = [];
  const cleanFilename = filename.toLowerCase().replace(/\.(jpg|jpeg|png|gif|webp|ngp)$/i, '');
  
  console.log(`📝 Extracting SKUs from: "${filename}" (clean: "${cleanFilename}")`);
  
  // Strategy 1: Direct numeric match (highest confidence)
  const directNumeric = cleanFilename.match(/^(\d+)$/);
  if (directNumeric) {
    results.push({
      sku: directNumeric[1],
      confidence: 95,
      source: 'direct_numeric'
    });
    console.log(`✅ Direct numeric match: ${directNumeric[1]}`);
  }
  
  // Strategy 2: Numeric with extensions like (1), _copy, etc.
  const numericWithSuffix = cleanFilename.match(/^(\d+)[\s\-_]*(?:\(\d+\)|copy|duplicate)?$/);
  if (numericWithSuffix && !directNumeric) {
    results.push({
      sku: numericWithSuffix[1],
      confidence: 85,
      source: 'numeric_with_suffix'
    });
    console.log(`✅ Numeric with suffix: ${numericWithSuffix[1]}`);
  }
  
  // Strategy 3: Enhanced dot-separated SKUs (e.g., "4262.25731.21722.png")
  const dotSeparatedPattern = /(\d{4,})(?:\.(\d{4,}))*\.?(\d{4,})?/;
  const dotMatches = cleanFilename.match(dotSeparatedPattern);
  if (dotMatches) {
    // Extract all numeric segments that are 4+ digits
    const allNumbers = cleanFilename.match(/\d{4,}/g);
    if (allNumbers && allNumbers.length > 1) {
      // First number gets lower confidence, last number gets higher confidence
      allNumbers.forEach((sku, index) => {
        const isLast = index === allNumbers.length - 1;
        const isFirst = index === 0;
        let confidence = 70;
        
        if (isLast) confidence = 80; // Last SKU often most relevant
        if (isFirst && allNumbers.length > 2) confidence = 60; // First might be category
        
        results.push({
          sku: sku,
          confidence: confidence,
          source: `dot_separated_${isLast ? 'last' : isFirst ? 'first' : 'middle'}`
        });
        console.log(`✅ Dot-separated SKU (${isLast ? 'last' : isFirst ? 'first' : 'middle'}): ${sku}`);
      });
    }
  }
  
  // Strategy 4: Multiple SKUs separated by other delimiters
  const multiSKUPatterns = [
    /(\d{4,})[\.\-_](\d{4,})[\.\-_](\d{4,})/g, // three or more with delimiters
    /(\d{4,})[\.\-_](\d{4,})/g, // two with delimiters
  ];
  
  multiSKUPatterns.forEach((pattern, patternIndex) => {
    const matches = [...cleanFilename.matchAll(pattern)];
    matches.forEach(match => {
      for (let i = 1; i < match.length; i++) {
        if (match[i] && match[i].length >= 4) {
          const isLast = i === match.length - 1;
          results.push({
            sku: match[i],
            confidence: isLast ? 75 : 65,
            source: `multi_delimiter_${isLast ? 'last' : 'middle'}`
          });
          console.log(`✅ Multi-delimiter SKU: ${match[i]}`);
        }
      }
    });
  });
  
  // Strategy 5: Single numeric patterns (fallback)
  if (results.length === 0) {
    const allNumbers = cleanFilename.match(/\d{4,}/g);
    if (allNumbers) {
      allNumbers.forEach(sku => {
        results.push({
          sku: sku,
          confidence: 50,
          source: 'fallback_numeric'
        });
        console.log(`✅ Fallback numeric: ${sku}`);
      });
    }
  }
  
  // Strategy 6: SKU patterns in various formats
  const patterns = [
    /sku[\-_]?(\d+)/gi,
    /item[\-_]?(\d+)/gi,
    /product[\-_]?(\d+)/gi
  ];
  
  patterns.forEach((pattern, index) => {
    const matches = [...cleanFilename.matchAll(pattern)];
    matches.forEach(match => {
      if (match[1] && match[1].length >= 3) {
        results.push({
          sku: match[1],
          confidence: 55 - (index * 5),
          source: `labeled_pattern_${index + 1}`
        });
        console.log(`✅ Labeled pattern: ${match[1]}`);
      }
    });
  });
  
  // Remove duplicates and sort by confidence
  const uniqueResults = results.filter((result, index, self) => 
    index === self.findIndex(r => r.sku === result.sku)
  );
  
  console.log(`📊 Extracted ${uniqueResults.length} unique SKUs:`, uniqueResults.map(r => `${r.sku}(${r.confidence}%)`));
  
  return uniqueResults.sort((a, b) => b.confidence - a.confidence);
}

// Helper function to find matching product
function findMatchingProduct(productSKUs: Array<{id: string, sku: string}>, sku: string): {id: string, sku: string} | undefined {
  // Direct match first
  let match = productSKUs.find(p => p.sku === sku);
  if (match) return match;
  
  // Try with leading zeros removed
  const skuWithoutLeadingZeros = sku.replace(/^0+/, '');
  match = productSKUs.find(p => p.sku.replace(/^0+/, '') === skuWithoutLeadingZeros);
  if (match) return match;
  
  // Try with leading zeros added (up to 6 digits)
  const paddedSKU = sku.padStart(6, '0');
  match = productSKUs.find(p => p.sku === paddedSKU);
  
  return match;
}

// Streamlined processing function
async function runConsolidatedProcessing(supabase: any): Promise<ProcessingResult> {
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
  const startProcessingTime = Date.now();
  
  try {
    // Step 1: Get active products
    result.currentStep = 'Loading products';
    result.progress = 10;
    
    console.log('🔍 DEBUG: About to query products table...');
    const { data: allProducts, error: productsError } = await supabase
      .from('products')
      .select('id, sku, name')
      .eq('is_active', true);
    
    console.log('🔍 DEBUG: Query result - Error:', productsError);
    console.log('🔍 DEBUG: Query result - Data length:', allProducts?.length);
    
    if (productsError) throw new Error(`Products fetch error: ${productsError.message}`);
    
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
    result.progress = 30;
    
    console.log('🖼️ Scanning storage for images...');
    const { data: files, error: storageError } = await supabase.storage
      .from('product-images')
      .list('', { limit: 2000, sortBy: { column: 'name', order: 'asc' } });
    
    if (storageError) throw new Error(`Storage error: ${storageError.message}`);
    
    result.imagesScanned = files?.length || 0;
    console.log(`📁 Found ${result.imagesScanned} files in storage`);
    
    // Process images and extract SKUs
    const imageMatches = [];
    const packagingImages = [];
    
    for (const file of files || []) {
      if (file.name && file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        const imageUrl = supabase.storage.from('product-images').getPublicUrl(file.name).data.publicUrl;
        const extractedSKUs = extractSKUsFromFilename(file.name);
        
        imageMatches.push({
          filename: file.name,
          url: imageUrl,
          extractedSKUs
        });
        
        // Track packaging images for debugging
        if (file.name.includes('455404') || file.name.includes('455382')) {
          packagingImages.push({ filename: file.name, extractedSKUs });
        }
      }
    }
    
    result.debugInfo.packagingImages = packagingImages;
    console.log(`📦 PACKAGING DEBUG: Found ${packagingImages.length} packaging images:`, packagingImages);
    
    // Step 3: Match images to products
    result.currentStep = 'Matching images to products';
    result.progress = 60;
    
    console.log(`🔗 Starting matching with ${imageMatches.length} images`);
    
    const productSKUs = allProducts?.map(p => ({ id: p.id, sku: p.sku })) || [];
    const packagingMatches = [];
    
    for (const image of imageMatches) {
      for (const extractedSKU of image.extractedSKUs) {
        const matchedProduct = findMatchingProduct(productSKUs, extractedSKU.sku);
        
        if (matchedProduct) {
          console.log(`🎯 MATCH: ${image.filename} → ${matchedProduct.sku} (${extractedSKU.confidence}%)`);
          
          // Track packaging matches
          if (matchedProduct.sku === '455404' || matchedProduct.sku === '455382') {
            packagingMatches.push({
              filename: image.filename,
              productSku: matchedProduct.sku,
              confidence: extractedSKU.confidence
            });
            console.log(`📦 PACKAGING MATCH: ${image.filename} → ${matchedProduct.sku}`);
          }
          
          const isHighConfidence = extractedSKU.confidence >= 80;
          
          if (isHighConfidence) {
            // Create direct link (with duplicate prevention via unique constraint)
            const { error: linkError } = await supabase
              .from('product_images')
              .insert({
                product_id: matchedProduct.id,
                image_url: image.filename, // Use just filename, not full URL
                alt_text: `Product image for ${matchedProduct.sku}`,
                image_status: 'active',
                match_confidence: extractedSKU.confidence,
                match_metadata: {
                  source: extractedSKU.source,
                  filename: image.filename,
                  auto_matched: true
                },
                auto_matched: true
              });
            
            if (!linkError) {
              result.directLinksCreated++;
              console.log(`✅ Created direct link: ${image.filename} → ${matchedProduct.sku}`);
            } else if (linkError.code === '23505') {
              // Unique constraint violation - image already linked
              console.log(`⏭️ Image already linked: ${image.filename} → ${matchedProduct.sku}`);
            } else {
              result.errors.push(`Link error for ${matchedProduct.sku}: ${linkError.message}`);
            }
          } else {
            // Create candidate (with duplicate prevention via unique constraint)
            const { error: candidateError } = await supabase
              .from('product_image_candidates')
              .insert({
                product_id: matchedProduct.id,
                image_url: image.filename, // Use just filename, not full URL
                alt_text: `Candidate image for ${matchedProduct.sku}`,
                match_confidence: extractedSKU.confidence,
                match_metadata: {
                  source: extractedSKU.source,
                  filename: image.filename,
                  auto_matched: true
                },
                status: 'pending'
              });
            
            if (!candidateError) {
              result.candidatesCreated++;
              console.log(`📝 Created candidate: ${image.filename} → ${matchedProduct.sku}`);
            } else if (candidateError.code === '23505') {
              // Unique constraint violation - candidate already exists
              console.log(`⏭️ Candidate already exists: ${image.filename} → ${matchedProduct.sku}`);
            } else {
              result.errors.push(`Candidate error for ${matchedProduct.sku}: ${candidateError.message}`);
            }
          }
          
          break; // Found match, stop checking other SKUs
        }
      }
    }
    
    result.debugInfo.packagingMatches = packagingMatches;
    
    // Final step
    result.currentStep = 'Complete';
    result.progress = 100;
    result.status = 'completed';
    result.endTime = new Date().toISOString();
    result.totalTime = Date.now() - startProcessingTime;
    
    console.log(`🏁 Processing completed in ${result.totalTime}ms`);
    console.log(`📊 Results: ${result.directLinksCreated} direct links, ${result.candidatesCreated} candidates`);
    console.log(`📦 PACKAGING RESULTS:`, packagingMatches);
    
    return result;
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    result.status = 'failed';
    result.endTime = new Date().toISOString();
    result.totalTime = Date.now() - startProcessingTime;
    result.errors.push(`Fatal error: ${error}`);
    return result;
  }
}

// Main serverless function handler
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`🚀 Consolidated Image Linker called with method: ${req.method}`);
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'POST') {
      console.log(`🚀 Starting consolidated processing...`);
      
      // Run the processing directly and return results
      const result = await runConsolidatedProcessing(supabase);
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Default response for unsupported methods
    return new Response(JSON.stringify({
      error: 'Only POST method supported',
      message: 'Send POST request to start consolidated processing'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });

  } catch (error) {
    console.error('❌ Consolidated Image Linker error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});