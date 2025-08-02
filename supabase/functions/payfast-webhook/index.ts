// Updated signature generation for payfast-webhook/index.ts

async function generateSignature(data: Record<string, string>, passphrase?: string): Promise<string> {
  // For webhook verification, we need to maintain the exact order that PayFast sends
  // We should NOT reorder the parameters
  
  // Create parameter string from the data as received
  const paramStringArray: string[] = [];
  
  // Important: Process in the order received from PayFast
  for (const key in data) {
    if (data.hasOwnProperty(key) && data[key] !== '') {
      // Don't encode - use raw values as PayFast sends them
      paramStringArray.push(`${key}=${data[key]}`);
    }
  }

  // Join parameters
  let paramString = paramStringArray.join('&');
  
  // Add passphrase if provided
  if (passphrase && passphrase !== '') {
    paramString += `&passphrase=${passphrase}`;
  }
  
  console.log('Webhook signature verification:');
  console.log('- Parameter string:', paramString);
  console.log('- String length:', paramString.length);

  // Generate MD5 hash
  const md5Hash = md5(paramString);
  
  console.log('- Calculated signature:', md5Hash);
  return md5Hash;
}

// Also update the webhook handler to properly parse the data:

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

    console.log('PayFast webhook called - Raw request details:', {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries()),
      contentType: req.headers.get('content-type')
    });

    // Parse form data from PayFast
    const formData = await req.formData()
    const payfastData: Record<string, string> = {}
    const orderedData: Array<[string, string]> = [] // Maintain order
    
    for (const [key, value] of formData) {
      const stringValue = value.toString().trim() // Trim whitespace
      payfastData[key] = stringValue
      orderedData.push([key, stringValue])
    }

    console.log('PayFast webhook received data:', {
      payment_status: payfastData.payment_status,
      m_payment_id: payfastData.m_payment_id,
      pf_payment_id: payfastData.pf_payment_id,
      amount_gross: payfastData.amount_gross,
      signature: payfastData.signature,
      totalFields: Object.keys(payfastData).length
    })

    // Extract and remove signature
    const receivedSignature = payfastData.signature
    delete payfastData.signature

    // For signature verification, rebuild the data in the order received
    const orderedDataForSignature: Record<string, string> = {}
    orderedData.forEach(([key, value]) => {
      if (key !== 'signature') {
        orderedDataForSignature[key] = value
      }
    })

    const passphrase = Deno.env.get('PAYFAST_PASSPHRASE')
    const calculatedSignature = await generateSignature(orderedDataForSignature, passphrase)

    if (receivedSignature !== calculatedSignature) {
      console.error('Invalid PayFast signature:', {
        received: receivedSignature,
        calculated: calculatedSignature,
        receivedLength: receivedSignature?.length,
        calculatedLength: calculatedSignature?.length
      })
      // Log first few fields for debugging
      console.error('First 5 fields in order:', orderedData.slice(0, 5))
      return new Response('Invalid signature', { status: 400 })
    }

    // Rest of your webhook handling code remains the same...
  } catch (error) {
    console.error('PayFast webhook error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
})