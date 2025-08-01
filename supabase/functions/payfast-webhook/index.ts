import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHash } from "https://deno.land/std@0.168.0/crypto/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse form data from PayFast
    const formData = await req.formData()
    const payfastData: Record<string, string> = {}
    
    for (const [key, value] of formData) {
      payfastData[key] = value.toString()
    }

    console.log('PayFast webhook received:', payfastData)

    // Verify signature
    const receivedSignature = payfastData.signature
    delete payfastData.signature

    const passphrase = Deno.env.get('PAYFAST_PASSPHRASE')
    const calculatedSignature = generateSignature(payfastData, passphrase)

    if (receivedSignature !== calculatedSignature) {
      console.error('Invalid PayFast signature')
      return new Response('Invalid signature', { status: 400 })
    }

    const paymentStatus = payfastData.payment_status
    const orderId = payfastData.m_payment_id
    const amount = parseFloat(payfastData.amount_gross || '0')

    console.log(`PayFast webhook: Order ${orderId}, Status: ${paymentStatus}, Amount: ${amount}`)

    // Update order status based on payment status
    if (paymentStatus === 'COMPLETE') {
      // Payment successful
      await supabaseClient
        .from('orders')
        .update({
          status: 'confirmed',
          payment_status: 'paid',
          payment_method: 'payfast',
          payment_reference: payfastData.pf_payment_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)

      console.log(`Order ${orderId} marked as paid`)

      // Optionally send confirmation email
      try {
        await supabaseClient.functions.invoke('send-email', {
          body: {
            to: payfastData.email_address,
            template: 'order-confirmation',
            data: {
              orderId,
              amount,
              paymentReference: payfastData.pf_payment_id
            }
          }
        })
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError)
      }

    } else {
      // Payment failed or cancelled
      await supabaseClient
        .from('orders')
        .update({
          status: 'cancelled',
          payment_status: 'failed',
          payment_method: 'payfast',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)

      console.log(`Order ${orderId} marked as failed/cancelled`)
    }

    return new Response('OK', { status: 200 })

  } catch (error) {
    console.error('PayFast webhook error:', error)
    return new Response('Internal Server Error', { status: 500 })
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