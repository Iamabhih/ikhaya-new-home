import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { md5 } from "https://deno.land/x/md5@v1.0.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Parse form data from PayFast
    const formData = await req.formData()
    const payfastData: Record<string, string> = {}
    
    for (const [key, value] of formData) {
      payfastData[key] = value.toString()
    }

    console.log('PayFast webhook received:', {
      payment_status: payfastData.payment_status,
      m_payment_id: payfastData.m_payment_id,
      pf_payment_id: payfastData.pf_payment_id,
      amount_gross: payfastData.amount_gross
    })

    // Verify signature
    const receivedSignature = payfastData.signature
    delete payfastData.signature

    const passphrase = Deno.env.get('PAYFAST_PASSPHRASE')
    const calculatedSignature = await generateSignature(payfastData, passphrase)

    if (receivedSignature !== calculatedSignature) {
      console.error('Invalid PayFast signature:', {
        received: receivedSignature,
        calculated: calculatedSignature
      })
      return new Response('Invalid signature', { status: 400 })
    }

    const paymentStatus = payfastData.payment_status
    const orderId = payfastData.m_payment_id
    const amount = parseFloat(payfastData.amount_gross || '0')

    console.log(`PayFast webhook: Order ${orderId}, Status: ${paymentStatus}, Amount: ${amount}`)

    // Update order status based on payment status
    if (paymentStatus === 'COMPLETE') {
      // Payment successful
      const { error: updateError } = await supabaseClient
        .from('orders')
        .update({
          status: 'confirmed',
          payment_status: 'paid',
          payment_gateway: 'payfast',
          payment_reference: payfastData.pf_payment_id,
          payment_gateway_response: payfastData,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)

      if (updateError) {
        console.error('Failed to update order:', updateError)
        return new Response('Database update failed', { status: 500 })
      }

      console.log(`Order ${orderId} marked as paid`)

      // Optionally send confirmation email
      try {
        const { data: order } = await supabaseClient
          .from('orders')
          .select('email, order_number')
          .eq('id', orderId)
          .single()

        if (order?.email) {
          await supabaseClient.functions.invoke('send-email', {
            body: {
              to: order.email,
              template: 'order-confirmation',
              data: {
                orderId: order.order_number,
                amount,
                paymentReference: payfastData.pf_payment_id
              }
            }
          })
        }
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError)
        // Don't fail the webhook if email fails
      }

    } else if (paymentStatus === 'CANCELLED' || paymentStatus === 'FAILED') {
      // Payment failed or cancelled
      const { error: updateError } = await supabaseClient
        .from('orders')
        .update({
          status: 'cancelled',
          payment_status: 'failed',
          payment_gateway: 'payfast',
          payment_gateway_response: payfastData,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)

      if (updateError) {
        console.error('Failed to update order:', updateError)
        return new Response('Database update failed', { status: 500 })
      }

      console.log(`Order ${orderId} marked as failed/cancelled`)
    } else {
      // Pending or other status
      console.log(`Order ${orderId} has status: ${paymentStatus}`)
    }

    return new Response('OK', { status: 200 })

  } catch (error) {
    console.error('PayFast webhook error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
})

async function generateSignature(data: Record<string, string>, passphrase?: string): Promise<string> {
  // Sort the keys alphabetically (PayFast requirement)
  const sortedKeys = Object.keys(data).sort();
  
  // Create parameter string
  let pfOutput = "";
  
  for (const key of sortedKeys) {
    if (data[key] !== "") {
      pfOutput += `${key}=${encodeURIComponent(data[key].trim()).replace(/%20/g, "+")}&`;
    }
  }

  // Remove last ampersand
  let getString = pfOutput.slice(0, -1);
  
  // Add passphrase if provided
  if (passphrase !== null && passphrase !== undefined && passphrase !== "") {
    getString += `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, "+")}`;
  }
  
  console.log('Webhook string to hash (first 100 chars):', getString.substring(0, 100) + '...');

  // Use proper MD5 hash implementation
  const md5Hash = md5(getString);
  
  console.log('Webhook generated signature:', md5Hash);
  return md5Hash;
}
