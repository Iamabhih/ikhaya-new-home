import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DriveFile {
  id: string
  name: string
  mimeType: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const googleApiKey = Deno.env.get('GOOGLE_DRIVE_API_KEY')
    const folderId = '1tG66zQTXGR-BQwjYZheRHVQ7s4n6-Jan'

    if (!googleApiKey) {
      throw new Error('Google Drive API key not configured')
    }

    console.log('Starting image migration from Google Drive to Supabase')

    // Get all products with their SKUs
    const { data: products, error: productsError } = await supabaseClient
      .from('products')
      .select('id, sku, name')
      .not('sku', 'is', null)

    if (productsError) {
      throw new Error(`Failed to fetch products: ${productsError.message}`)
    }

    console.log(`Found ${products.length} products with SKUs`)

    // Get all files from the Google Drive folder
    const driveResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&key=${googleApiKey}&fields=files(id,name,mimeType)`
    )

    if (!driveResponse.ok) {
      throw new Error(`Google Drive API error: ${driveResponse.statusText}`)
    }

    const driveData = await driveResponse.json()
    const driveFiles: DriveFile[] = driveData.files || []

    console.log(`Found ${driveFiles.length} files in Google Drive folder`)

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Process each product
    for (const product of products) {
      if (!product.sku) continue

      try {
        results.processed++

        // Look for matching image files (SKU.png or SKU.jpg)
        const matchingFiles = driveFiles.filter(file => {
          const fileName = file.name.toLowerCase()
          const sku = product.sku.toLowerCase()
          return (fileName === `${sku}.png` || fileName === `${sku}.jpg`) &&
                 (file.mimeType === 'image/png' || file.mimeType === 'image/jpeg')
        })

        if (matchingFiles.length === 0) {
          console.log(`No image found for SKU: ${product.sku}`)
          continue
        }

        const imageFile = matchingFiles[0]
        console.log(`Processing image for SKU ${product.sku}: ${imageFile.name}`)

        // Download the image from Google Drive
        const imageResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files/${imageFile.id}?alt=media&key=${googleApiKey}`
        )

        if (!imageResponse.ok) {
          throw new Error(`Failed to download image: ${imageResponse.statusText}`)
        }

        const imageBlob = await imageResponse.blob()
        const fileExtension = imageFile.name.toLowerCase().endsWith('.png') ? 'png' : 'jpg'
        const fileName = `${product.sku}.${fileExtension}`

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
          .from('product-images')
          .upload(fileName, imageBlob, {
            contentType: imageFile.mimeType,
            upsert: true
          })

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`)
        }

        // Get the public URL
        const { data: urlData } = supabaseClient.storage
          .from('product-images')
          .getPublicUrl(fileName)

        // Check if product image already exists
        const { data: existingImage } = await supabaseClient
          .from('product_images')
          .select('id')
          .eq('product_id', product.id)
          .eq('is_primary', true)
          .single()

        if (existingImage) {
          // Update existing image
          const { error: updateError } = await supabaseClient
            .from('product_images')
            .update({
              image_url: urlData.publicUrl,
              alt_text: `${product.name} product image`
            })
            .eq('id', existingImage.id)

          if (updateError) {
            throw new Error(`Failed to update product image: ${updateError.message}`)
          }
        } else {
          // Create new product image record
          const { error: insertError } = await supabaseClient
            .from('product_images')
            .insert({
              product_id: product.id,
              image_url: urlData.publicUrl,
              alt_text: `${product.name} product image`,
              is_primary: true,
              sort_order: 0
            })

          if (insertError) {
            throw new Error(`Failed to create product image record: ${insertError.message}`)
          }
        }

        results.successful++
        console.log(`Successfully migrated image for SKU: ${product.sku}`)

      } catch (error) {
        results.failed++
        const errorMsg = `SKU ${product.sku}: ${error.message}`
        results.errors.push(errorMsg)
        console.error(errorMsg)
      }
    }

    console.log('Migration completed:', results)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Image migration completed',
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Migration error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})