
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { md5 } from 'https://esm.sh/js-md5@0.7.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateSignature(data: Record<string, string>, passPhrase: string = ''): string {
  let pfOutput = '';
  
  for (const key of Object.keys(data).sort()) {
    if (key !== 'signature' && data[key] !== '') {
      pfOutput += `${key}=${encodeURIComponent(data[key].trim()).replace(/%20/g, '+')}&`;
    }
  }
  
  pfOutput = pfOutput.slice(0, -1);
  
  if (passPhrase !== '') {
    pfOutput += `&passphrase=${encodeURIComponent(passPhrase.trim()).replace(/%20/g, '+')}`;
  }
  
  return md5(pfOutput);
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.log('=== PayFast Webhook Received ===');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse form data
    const formData = await req.formData();
    const data: Record<string, string> = {};
    
    for (const [key, value] of formData) {
      data[key] = value.toString();
    }

    console.log('Payment Status:', data.payment_status);
    console.log('Order ID:', data.m_payment_id);

    // Verify signature only in production
    const isTestMode = Deno.env.get('PAYFAST_TEST_MODE') === 'true';
    
    if (!isTestMode && data.signature) {
      const passphrase = Deno.env.get('PAYFAST_PASSPHRASE') || '';
      const signature = generateSignature(data, passphrase);
      
      if (signature !== data.signature) {
        console.error('Invalid signature');
        return new Response('Invalid signature', { status: 400 });
      }
    }

    // Process payment
    if (data.payment_status === 'COMPLETE') {
      const orderNumber = data.m_payment_id;
      
      // Create order in database
      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          email: data.email_address,
          total_amount: parseFloat(data.amount_gross),
          status: 'confirmed',
          payment_status: 'paid',
          payment_gateway: 'payfast',
          payment_reference: data.pf_payment_id,
          payment_gateway_response: data,
          billing_address: {
            first_name: data.name_first,
            last_name: data.name_last,
            email: data.email_address,
            phone: data.cell_number || ''
          },
          shipping_address: {
            first_name: data.name_first,
            last_name: data.name_last,
            email: data.email_address,
            phone: data.cell_number || ''
          }
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create order:', error);
        return new Response('Database error', { status: 500 });
      }

      console.log('Order created:', order.id);
    }

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Internal error', { status: 500 });
  }
});
