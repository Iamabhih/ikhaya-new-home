import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaymentRequest {
  orderId: string
  amount: number
  customerEmail: string
  customerName: string
  customerPhone: string
  items: Array<{
    name: string
    description?: string
    quantity: number
    amount: number
  }>
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('PayFast payment function called');
    console.log('Request method:', req.method);
    console.log('Authorization header present:', !!req.headers.get('Authorization'));

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the user from the request
    const {
      data: { user },
      error: userError
    } = await supabaseClient.auth.getUser()

    console.log('User authentication check:', { 
      hasUser: !!user, 
      userId: user?.id, 
      userEmail: user?.email?.substring(0, 3) + '***',
      userError: userError?.message 
    });

    if (userError) {
      console.error('User authentication error:', userError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Authentication failed: ' + userError.message
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    if (!user) {
      console.error('User not authenticated')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'User not authenticated'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    const requestBody = await req.json()
    console.log('Raw request body (sanitized):', JSON.stringify({
      ...requestBody,
      customerEmail: requestBody.customerEmail?.substring(0, 3) + '***',
      customerPhone: requestBody.customerPhone ? '***' : undefined
    }))
    
    const { orderId, amount, customerEmail, customerName, customerPhone, items }: PaymentRequest = requestBody

    if (!orderId || !amount || !customerEmail || !customerName) {
      console.error('Missing required payment parameters:', { 
        orderId: !!orderId, 
        amount: !!amount, 
        customerEmail: !!customerEmail, 
        customerName: !!customerName 
      })
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required payment parameters: orderId, amount, customerEmail, and customerName are required'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    console.log('Payment request received:', { 
      orderId, 
      amount, 
      customerEmail: customerEmail.substring(0, 3) + '***',
      customerName,
      itemCount: items?.length || 0
    })

    // Get PayFast configuration from secrets
    const merchantId = Deno.env.get('PAYFAST_MERCHANT_ID')
    const merchantKey = Deno.env.get('PAYFAST_MERCHANT_KEY')
    const passphrase = Deno.env.get('PAYFAST_PASSPHRASE')
    const payfastMode = Deno.env.get('PAYFAST_MODE') || 'sandbox'

    console.log('PayFast config check:', {
      hasMerchantId: !!merchantId,
      hasMerchantKey: !!merchantKey,
      hasPassphrase: !!passphrase,
      mode: payfastMode
    })

    if (!merchantId || !merchantKey) {
      console.error('PayFast configuration missing:', {
        merchantId: merchantId ? 'present' : 'missing',
        merchantKey: merchantKey ? 'present' : 'missing'
      })
      return new Response(
        JSON.stringify({
          success: false,
          error: 'PayFast configuration is incomplete. Please check merchant credentials.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    // Determine PayFast URL based on mode
    const payfastUrl = payfastMode === 'live' || payfastMode === 'production'
      ? 'https://www.payfast.co.za/eng/process'
      : 'https://sandbox.payfast.co.za/eng/process'

    // Prepare PayFast parameters
    const payfastData: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: `${req.headers.get('origin')}/checkout/success?order_id=${orderId}`,
      cancel_url: `${req.headers.get('origin')}/checkout?cancelled=true`,
      notify_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/payfast-webhook`,
      name_first: customerName.split(' ')[0] || '',
      name_last: customerName.split(' ').slice(1).join(' ') || '',
      email_address: customerEmail,
      cell_number: customerPhone,
      m_payment_id: orderId,
      amount: amount.toFixed(2),
      item_name: items.map(item => item.name).join(', '),
      item_description: `Order ${orderId} - ${items.length} items`,
    }

    // Generate signature for security (passphrase is used in signature but not sent as parameter)
    const signature = await generateSignature(payfastData, passphrase)
    payfastData.signature = signature

    console.log('PayFast payment initiated successfully:', {
      orderId,
      amount,
      merchant_id: merchantId.substring(0, 4) + '****',
      mode: payfastMode,
      payfastUrl
    })

    return new Response(
      JSON.stringify({
        success: true,
        payfast_url: payfastUrl,
        payment_data: payfastData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('PayFast payment error:', error)
    
    // Return more specific error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const statusCode = error.message?.includes('configuration') ? 500 :
                      error.message?.includes('Authentication') ? 401 :
                      error.message?.includes('required') ? 400 : 500;
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode,
      }
    )
  }
})

async function generateSignature(data: Record<string, string>, passphrase?: string): Promise<string> {
  // Create parameter string - exactly matching PayFast's specification
  let pfOutput = ''
  
  // Build parameter string (PayFast expects sorted keys)
  const sortedKeys = Object.keys(data)
    .filter(key => key !== 'signature' && data[key] !== '')
    .sort()
  
  for (const key of sortedKeys) {
    const val = data[key]
    if (val !== '') {
      // PayFast requires specific encoding: encodeURIComponent + replace %20 with +
      pfOutput += `${key}=${encodeURIComponent(val.trim()).replace(/%20/g, "+")}&`
    }
  }
  
  // Remove last ampersand
  let getString = pfOutput.slice(0, -1)
  
  // Add passphrase if provided (PayFast format)
  if (passphrase !== null && passphrase !== undefined) {
    getString += `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, "+")}`
  }
  
  console.log('String to hash:', getString)

  try {
    // Generate proper MD5 hash using Deno std crypto
    const encoder = new TextEncoder()
    const data_encoded = encoder.encode(getString)
    const hashHex = crypto.md5(data_encoded, "hex") as string
    
    console.log('Generated signature:', hashHex)
    return hashHex
  } catch (error) {
    console.error('Signature generation error:', error)
    throw new Error('Failed to generate payment signature')
  }
}