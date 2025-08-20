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

// SKU extraction function with enhanced logging
function extractSKUsFromFilename(filename: string, fullPath?: string): ExtractedSKU[] {
  console.log(`🔍 Extracting SKUs from: "${filename}"`);
  
  const skus: ExtractedSKU[] = [];
  const cleanFilename = filename.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
  
  // Debug log for specific SKUs we're tracking
  if (filename.includes('455404') || filename.includes('455382')) {
    console.log(`📦 PACKAGING DEBUG: Processing ${filename}`);
  }
  
  // Strategy 1: Exact numeric match (high confidence)
  const exactNumeric = cleanFilename.match(/^\d{4,}$/);
  if (exactNumeric) {
    skus.push({ sku: exactNumeric[0], confidence: 95, source: 'exact_numeric' });
  }
  
  // Strategy 2: Multiple SKUs in filename
  const multiSKUs = cleanFilename.match(/\d{4,}/g);
  if (multiSKUs && multiSKUs.length > 0) {
    multiSKUs.forEach((sku, index) => {
      const confidence = index === 0 ? 85 : 75;
      skus.push({ sku, confidence, source: 'multi_sku' });
    });
  }
  
  // Strategy 3: Pattern matching for various SKU lengths
  const patterns = [
    /(\d{6})/g,     // 6-digit SKUs
    /(\d{5})/g,     // 5-digit SKUs  
    /(\d{4})/g,     // 4-digit SKUs
  ];
  
  patterns.forEach((pattern, patternIndex) => {
    const matches = cleanFilename.match(pattern);
    if (matches) {
      matches.forEach(match => {
        if (!skus.some(s => s.sku === match)) {
          const confidence = 70 - (patternIndex * 10);
          skus.push({ sku: match, confidence, source: 'pattern_match' });
        }
      });
    }
  });
  
  console.log(`📊 Extracted ${skus.length} SKUs from "${filename}":`, skus.map(s => `${s.sku}(${s.confidence}%)`));
  return skus;
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
    
    const { data: allProducts, error: productsError } = await supabase
      .from('products')
      .select('id, sku, name')
      .eq('is_active', true);
    
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
            // Create direct link
            const { error: linkError } = await supabase
              .from('product_images')
              .insert({
                product_id: matchedProduct.id,
                image_url: image.url,
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
            } else {
              result.errors.push(`Link error for ${matchedProduct.sku}: ${linkError.message}`);
            }
          } else {
            // Create candidate
            const { error: candidateError } = await supabase
              .from('product_image_candidates')
              .insert({
                product_id: matchedProduct.id,
                image_url: image.url,
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