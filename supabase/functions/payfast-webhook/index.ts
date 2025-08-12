import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Pure JavaScript MD5 implementation
function md5(string: string): string {
  // [Keep the existing MD5 implementation - it's long but working]
  // ... (same MD5 function as in your current file)
}

// Generate signature for webhook verification
function generateSignature(data: Record<string, any>, passPhrase: string = ''): string {
  const sortedKeys = Object.keys(data)
    .filter(key => key !== 'signature' && data[key] !== undefined && data[key] !== null && data[key] !== '')
    .sort();
  
  let pfOutput = '';
  
  for (const key of sortedKeys) {
    const value = data[key].toString().trim();
    pfOutput += `${key}=${encodeURIComponent(value).replace(/%20/g, '+')}&`;
  }
  
  pfOutput = pfOutput.slice(0, -1);
  
  if (passPhrase && passPhrase.trim() !== '') {
    pfOutput += `&passphrase=${encodeURIComponent(passPhrase.trim()).replace(/%20/g, '+')}`;
  }
  
  console.log('Webhook signature verification:');
  console.log('- Parameter string length:', pfOutput.length);
  console.log('- Has passphrase:', !!(passPhrase && passPhrase.trim()));
  
  const signature = md5(pfOutput);
  console.log('- Calculated signature:', signature);
  
  return signature;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.log('=== PayFast Webhook Called for Ikhaya Homeware ===');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('❌ Missing Supabase environment variables');
      return new Response('Server configuration error', { status: 500 });
    }

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseServiceRoleKey
    )

    // Parse form data from PayFast
    const formData = await req.formData();
    const payfastData: Record<string, string> = {};
    
    for (const [key, value] of formData) {
      payfastData[key] = value.toString();
    }

    console.log('PayFast webhook data received:', {
      payment_status: payfastData.payment_status,
      m_payment_id: payfastData.m_payment_id,
      pf_payment_id: payfastData.pf_payment_id,
      amount_gross: payfastData.amount_gross,
      email_address: payfastData.email_address ? payfastData.email_address.substring(0, 3) + '***' : 'missing',
      signature: payfastData.signature ? 'present' : 'missing',
      totalFields: Object.keys(payfastData).length
    });

    // Verify signature
    const receivedSignature = payfastData.signature;
    
    if (!receivedSignature) {
      console.error('❌ No signature received from PayFast');
      return new Response('No signature provided', { status: 400 });
    }

    // Get PayFast passphrase from environment
    const passphrase = Deno.env.get('PAYFAST_PASSPHRASE') || '';
    
    console.log('PayFast webhook config:', {
      hasPassphrase: !!passphrase
    });

    // Generate signature for verification
    const calculatedSignature = generateSignature(payfastData, passphrase);

    if (receivedSignature !== calculatedSignature) {
      console.error('❌ Invalid PayFast signature:', {
        received: receivedSignature.substring(0, 8) + '...',
        calculated: calculatedSignature.substring(0, 8) + '...'
      });
      
      return new Response('Invalid signature', { status: 400 })
    }

    console.log('✅ Signature verified successfully');

    const paymentStatus = payfastData.payment_status
    const orderId = payfastData.m_payment_id
    const amount = parseFloat(payfastData.amount_gross || '0')

    console.log(`PayFast webhook processing: Order ${orderId}, Status: ${paymentStatus}, Amount: R${amount}`)

    // Handle payment completion
    if (paymentStatus === 'COMPLETE') {
      console.log(`✅ Payment successful for order ${orderId}, creating order...`);
      
      // Generate final order number
      const finalOrderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      // Create the main order record
      const orderData = {
        order_number: finalOrderNumber,
        email: payfastData.email_address || '',
        billing_address: {
          first_name: payfastData.name_first || '',
          last_name: payfastData.name_last || '',
          email: payfastData.email_address || '',
          phone: payfastData.cell_number || ''
        },
        shipping_address: {
          first_name: payfastData.name_first || '',
          last_name: payfastData.name_last || '',
          email: payfastData.email_address || '',
          phone: payfastData.cell_number || ''
        },
        subtotal: amount,
        shipping_amount: 0,
        total_amount: amount,
        status: 'confirmed',
        payment_status: 'paid',
        payment_gateway: 'payfast',
        payment_reference: payfastData.pf_payment_id,
        payment_gateway_response: payfastData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Insert the order
      const { data: newOrder, error: orderError } = await supabaseClient
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) {
        console.error('❌ Failed to create order:', orderError);
        return new Response('Failed to create order', { status: 500 });
      }

      console.log(`✅ Order ${newOrder.id} created successfully for Ikhaya Homeware`);

    } else if (paymentStatus === 'CANCELLED' || paymentStatus === 'FAILED') {
      console.log(`❌ Payment ${paymentStatus.toLowerCase()} for order ${orderId}`);
    } else {
      console.log(`⏳ Order ${orderId} has status: ${paymentStatus} - no action taken`);
    }

    console.log('✅ PayFast webhook processed successfully for Ikhaya Homeware');
    return new Response('OK', { status: 200 })

  } catch (error) {
    console.error('❌ PayFast webhook error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
})