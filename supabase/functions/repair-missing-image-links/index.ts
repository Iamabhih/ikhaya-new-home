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
  errors: string[];
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

    const sessionId = crypto.randomUUID();
    const result: RepairResult = {
      sessionId,
      status: 'complete',
      productsChecked: 0,
      imagesFound: 0,
      linksCreated: 0,
      errors: []
    };

    console.log(`Starting missing image link repair session: ${sessionId}`);

    // Get products without images
    const { data: productsWithoutImages, error: productsError } = await supabase
      .from('products')
      .select(`
        id, sku, name,
        product_images!left(id)
      `)
      .eq('is_active', true)
      .is('product_images.id', null);

    if (productsError) {
      throw new Error(`Failed to fetch products: ${productsError.message}`);
    }

    result.productsChecked = productsWithoutImages?.length || 0;
    console.log(`Found ${result.productsChecked} products without images`);

    // Get all storage images
    const { data: storageFiles, error: storageError } = await supabase.storage
      .from('product-images')
      .list('', { limit: 10000 });

    if (storageError) {
      throw new Error(`Failed to list storage files: ${storageError.message}`);
    }

    // Recursively scan all folders for images
    const getAllImages = async (path = ''): Promise<string[]> => {
      const { data: items, error } = await supabase.storage
        .from('product-images')
        .list(path, { limit: 1000 });

      if (error) return [];

      let allImages: string[] = [];
      
      for (const item of items || []) {
        const fullPath = path ? `${path}/${item.name}` : item.name;
        
        if (!item.id && !item.metadata && !item.name.includes('.')) {
          // It's a folder, scan recursively
          const subImages = await getAllImages(fullPath);
          allImages = allImages.concat(subImages);
        } else if (item.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          allImages.push(fullPath);
        }
      }
      
      return allImages;
    };

    const allImages = await getAllImages();
    result.imagesFound = allImages.length;
    console.log(`Found ${result.imagesFound} images in storage`);

    // For each product without images, try to find matching storage images
    for (const product of productsWithoutImages || []) {
      const sku = product.sku?.toLowerCase();
      if (!sku) continue;

      console.log(`\nChecking product ${product.sku} (${product.name})`);

      // Find potential matching images
      const matchingImages = allImages.filter(imagePath => {
        const filename = imagePath.split('/').pop()?.toLowerCase().replace(/\.(jpg|jpeg|png|gif|webp)$/i, '') || '';
        
        // Direct SKU match
        if (filename === sku) return true;
        
        // Remove leading zeros variations
        const trimmedSku = sku.replace(/^0+/, '');
        const trimmedFilename = filename.replace(/^0+/, '');
        if (trimmedSku === trimmedFilename) return true;
        
        // Zero-padded variations
        if (filename === '0' + sku || '0' + filename === sku) return true;
        
        // Multi-SKU filenames (e.g., "sku1.sku2.sku3")
        if (filename.includes('.')) {
          const parts = filename.split('.');
          if (parts.some(part => part === sku || part === trimmedSku)) return true;
        }
        
        // Filename starts or ends with SKU
        if (filename.startsWith(sku) || filename.endsWith(sku)) return true;
        if (filename.startsWith(trimmedSku) || filename.endsWith(trimmedSku)) return true;
        
        return false;
      });

      if (matchingImages.length > 0) {
        console.log(`Found ${matchingImages.length} potential images for ${product.sku}:`, matchingImages);
        
        // Use the first (most likely) match
        const bestMatch = matchingImages[0];
        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(bestMatch);

        try {
          const { error: insertError } = await supabase
            .from('product_images')
            .insert({
              product_id: product.id,
              image_url: publicUrl,
              alt_text: `${product.name} - ${bestMatch.split('/').pop()}`,
              is_primary: true,
              sort_order: 1,
              image_status: 'active',
              match_confidence: 85,
              match_metadata: {
                source: 'repair_missing_links',
                filename: bestMatch.split('/').pop(),
                session_id: sessionId,
                total_candidates: matchingImages.length
              },
              auto_matched: true
            });

          if (insertError) {
            console.error(`Error linking image for ${product.sku}:`, insertError);
            result.errors.push(`Failed to link image for ${product.sku}: ${insertError.message}`);
          } else {
            result.linksCreated++;
            console.log(`✅ Successfully linked ${bestMatch} to ${product.sku}`);
          }
        } catch (error) {
          console.error(`Error processing ${product.sku}:`, error);
          result.errors.push(`Error processing ${product.sku}: ${error.message}`);
        }
      } else {
        console.log(`No matching images found for ${product.sku}`);
      }
    }

    console.log(`Repair completed:`, result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Image repair error:', error);
    return new Response(
      JSON.stringify({ 
        sessionId: 'error',
        status: 'error', 
        error: error.message,
        productsChecked: 0,
        imagesFound: 0,
        linksCreated: 0,
        errors: [error.message]
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});