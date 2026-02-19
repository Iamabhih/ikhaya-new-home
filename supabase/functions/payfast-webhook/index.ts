import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Enhanced logging function
const logWebhookEvent = async (supabase: any, eventType: string, data: any, errorMessage?: string, errorDetails?: any) => {
  try {
    await supabase.from('payment_logs').insert({
      payment_id: data.pf_payment_id || data.payment_id || 'unknown',
      m_payment_id: data.m_payment_id || data.orderNumber,
      pf_payment_id: data.pf_payment_id,
      payment_status: data.payment_status || 'unknown',
      event_type: eventType,
      event_data: data,
      error_message: errorMessage,
      error_details: errorDetails,
      ip_address: data.ip_address
    });
  } catch (logError) {
    console.error('Failed to log webhook event:', logError);
  }
};

Deno.serve(async (req: Request) => {
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

    console.log('PayFast webhook received:', {
      payment_status: data.payment_status,
      m_payment_id: data.m_payment_id,
      pf_payment_id: data.pf_payment_id,
      amount_gross: data.amount_gross
    });
    
    // Log webhook event immediately
    await logWebhookEvent(supabase, 'webhook_received', data);

    // Simple form submission flow - no signature verification required
    // This is intentional as per project configuration

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
          await logWebhookEvent(supabase, 'retry_attempted', data, undefined, {
            retriesRemaining: retries,
            error: processError?.message
          });
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        }
      }

      if (processError) {
        const errorMsg = `Error processing order after retries: ${processError.message || processError}`;
        console.error(errorMsg);
        await logWebhookEvent(supabase, 'processing_failed', data, errorMsg, {
          result: processResult,
          retriesExhausted: true
        });
        return new Response('Error processing order', { status: 500, headers: corsHeaders });
      }

      console.log('Order processed successfully:', processResult);
      await logWebhookEvent(supabase, 'processing_completed', data, undefined, { result: processResult });
    } else {
      // Log other payment statuses (CANCELLED, PENDING, etc.)
      console.log('Non-complete payment status received:', data.payment_status);
      await logWebhookEvent(supabase, 'payment_status_received', data, `Payment status: ${data.payment_status}`);
    }

    return new Response('OK', { status: 200, headers: corsHeaders });
    
  } catch (error) {
    const errorMsg = `PayFast webhook error: ${(error as Error).message || error}`;
    console.error(errorMsg);

    try {
      await logWebhookEvent(supabase, 'webhook_error', {}, errorMsg, {
        error: (error as Error).message,
        stack: (error as Error).stack
      });
    } catch (logError) {
      console.error('Failed to log webhook error:', logError);
    }

    return new Response('Internal server error', { status: 500, headers: corsHeaders });
  }
});
