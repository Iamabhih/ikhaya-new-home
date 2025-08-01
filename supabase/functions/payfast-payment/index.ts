import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHash } from "https://deno.land/std@0.168.0/crypto/mod.ts"

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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
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
    } = await supabaseClient.auth.getUser()

    if (!user) {
      throw new Error('User not authenticated')
    }

    const { orderId, amount, customerEmail, customerName, customerPhone, items }: PaymentRequest = await req.json()

    // Get PayFast configuration from secrets
    const merchantId = Deno.env.get('PAYFAST_MERCHANT_ID')
    const merchantKey = Deno.env.get('PAYFAST_MERCHANT_KEY')
    const passphrase = Deno.env.get('PAYFAST_PASSPHRASE')
    const payfastMode = Deno.env.get('PAYFAST_MODE') || 'sandbox' // sandbox or live

    if (!merchantId || !merchantKey) {
      throw new Error('PayFast configuration missing')
    }

    // Determine PayFast URL based on mode
    const payfastUrl = payfastMode === 'live' 
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

    // Add passphrase if provided
    if (passphrase) {
      payfastData.passphrase = passphrase
    }

    // Generate signature for security
    const signature = generateSignature(payfastData, passphrase)
    payfastData.signature = signature

    // Remove passphrase from data to send to PayFast
    delete payfastData.passphrase

    console.log('PayFast payment initiated:', {
      orderId,
      amount,
      merchant_id: merchantId,
      mode: payfastMode
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
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

function generateSignature(data: Record<string, string>, passphrase?: string): string {
  // Create parameter string
  const params = Object.keys(data)
    .filter(key => key !== 'signature' && data[key] !== '')
    .sort()
    .map(key => `${key}=${encodeURIComponent(data[key])}`)
    .join('&')

  // Add passphrase if provided
  const stringToHash = passphrase ? `${params}&passphrase=${encodeURIComponent(passphrase)}` : params

  // Generate MD5 hash
  const encoder = new TextEncoder()
  const hashBuffer = createHash("md5").update(encoder.encode(stringToHash)).digest()
  
  // Convert to hex string
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}