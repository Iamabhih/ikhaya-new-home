import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const generateSignature = async (data: Record<string, string>, passPhrase: string = ''): Promise<string> => {
  // Define the exact field order as per PayFast documentation
  const fieldOrder = [
    'merchant_id', 'merchant_key', 'return_url', 'cancel_url', 'notify_url',
    'name_first', 'name_last', 'email_address', 'cell_number',
    'm_payment_id', 'amount', 'item_name', 'item_description',
    'custom_int1', 'custom_int2', 'custom_int3', 'custom_int4', 'custom_int5',
    'custom_str1', 'custom_str2', 'custom_str3', 'custom_str4', 'custom_str5',
    'email_confirmation', 'confirmation_address', 'payment_method',
    'pf_payment_id', 'payment_status', 'amount_gross', 'amount_fee', 'amount_net'
  ];
  
  let pfOutput = '';
  
  // Process fields in the correct order (not alphabetical) - match client exactly
  fieldOrder.forEach(key => {
    const value = data[key];
    if (value && value !== '') {
      // Use standard URL encoding with + for spaces (as per PayFast docs)
      const encodedValue = encodeURIComponent(value.trim()).replace(/%20/g, '+');
      pfOutput += `${key}=${encodedValue}&`;
    }
  });
  
  // Remove last ampersand
  pfOutput = pfOutput.slice(0, -1);
  
  // Add passphrase if provided
  if (passPhrase && passPhrase.trim() !== '') {
    const encodedPassphrase = encodeURIComponent(passPhrase.trim()).replace(/%20/g, '+');
    pfOutput += `&passphrase=${encodedPassphrase}`;
  }
  
  console.log('Webhook signature string:', pfOutput);
  
  // Generate MD5 hash using Web Crypto API
  const encoder = new TextEncoder();
  const data_array = encoder.encode(pfOutput);
  const hashBuffer = await crypto.subtle.digest("MD5", data_array);
  const hashArray = new Uint8Array(hashBuffer);
  const hashHex = Array.from(hashArray)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return hashHex;
};

// Enhanced logging function
const logWebhookEvent = async (supabase: any, eventType: string, data: any, error?: string) => {
  try {
    await supabase.from('payment_logs').insert({
      event_type: eventType,
      message: error || `PayFast webhook ${eventType}`,
      metadata: data,
      created_at: new Date().toISOString()
    });
  } catch (logError) {
    console.error('Failed to log webhook event:', logError);
  }
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const formData = await req.formData();
    const data: Record<string, string> = {};
    
    for (const [key, value] of formData.entries()) {
      data[key] = value as string;
    }

    console.log('PayFast webhook received:', data);
    
    // Log webhook event
    await logWebhookEvent(supabase, 'webhook_received', data);

    // In production, verify the signature
    const isTestMode = Deno.env.get('PAYFAST_MODE') !== 'live';
    
    if (!isTestMode) {
      const receivedSignature = data.signature;
      const passPhrase = Deno.env.get('PAYFAST_PASSPHRASE') || '';
      
      // Remove signature from data before generating our own
      const { signature, ...dataForSigning } = data;
      
      const expectedSignature = await generateSignature(dataForSigning, passPhrase);
      
      if (receivedSignature !== expectedSignature) {
        const errorMsg = 'Signature verification failed';
        console.error(errorMsg);
        await logWebhookEvent(supabase, 'signature_verification_failed', { receivedSignature, expectedSignature }, errorMsg);
        return new Response('Invalid signature', { status: 400, headers: corsHeaders });
      }
    }

    // Process completed payments with retry logic
    if (data.payment_status === 'COMPLETE') {
      console.log('Processing completed payment:', data.m_payment_id);
      
      let retries = 3;
      let processResult = null;
      let processError = null;
      
      while (retries > 0) {
        try {
          // Call the process-order function
          const { data: result, error } = await supabase.functions.invoke('process-order', {
            body: {
              orderNumber: data.m_payment_id,
              source: 'payfast_webhook',
              paymentData: {
                payment_status: data.payment_status,
                pf_payment_id: data.pf_payment_id,
                amount_gross: data.amount_gross,
                amount_fee: data.amount_fee,
                amount_net: data.amount_net,
              }
            }
          });
          
          processResult = result;
          processError = error;
          
          if (!error) {
            break; // Success, exit retry loop
          }
          
        } catch (invokeError) {
          processError = invokeError;
        }
        
        retries--;
        if (retries > 0) {
          console.log(`Retrying order processing, ${retries} attempts remaining...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        }
      }

      if (processError) {
        const errorMsg = `Error processing order after retries: ${processError.message || processError}`;
        console.error(errorMsg);
        await logWebhookEvent(supabase, 'order_processing_failed', data, errorMsg);
        return new Response('Error processing order', { status: 500, headers: corsHeaders });
      }

      console.log('Order processed successfully:', processResult);
      await logWebhookEvent(supabase, 'order_processed', { orderNumber: data.m_payment_id, result: processResult });
    } else {
      // Log other payment statuses
      await logWebhookEvent(supabase, 'payment_status_received', { 
        payment_status: data.payment_status, 
        orderNumber: data.m_payment_id 
      });
    }

    return new Response('OK', { status: 200, headers: corsHeaders });
    
  } catch (error) {
    const errorMsg = `PayFast webhook error: ${error.message || error}`;
    console.error(errorMsg);
    
    try {
      await logWebhookEvent(supabase, 'webhook_error', { error: errorMsg }, errorMsg);
    } catch (logError) {
      console.error('Failed to log webhook error:', logError);
    }
    
    return new Response('Internal server error', { status: 500, headers: corsHeaders });
  }
});