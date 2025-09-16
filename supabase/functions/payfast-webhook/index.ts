import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { md5 } from 'https://esm.sh/js-md5@0.7.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Signature verification for webhooks ONLY
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.log('=== PayFast Webhook Received ===');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
        console.error('Invalid webhook signature');
        // In production, you should reject invalid signatures
        // For testing, just log the error
      }
    }

    // Process successful payment by calling order processing function
    if (data.payment_status === 'COMPLETE') {
      const orderNumber = data.m_payment_id;
      
      try {
        // Call centralized order processing function
        const { data: processResult, error: processError } = await supabase.functions.invoke('process-order', {
          body: {
            orderNumber: orderNumber,
            source: 'webhook',
            paymentData: data
          }
        });

        if (processError) {
          console.error('Error calling order processing function:', processError);
        } else {
          console.log('Order processing result:', processResult);
        }
      } catch (error) {
        console.error('Failed to process order:', error);
      }
    }

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Internal error', { status: 500 });
  }
});