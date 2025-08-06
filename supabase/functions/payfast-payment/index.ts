// supabase/functions/payfast-payment/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaymentRequest {
  orderId: string
  amount: number
  customerEmail: string
  customerName: string
  customerPhone?: string
  items: Array<{
    name: string
    description?: string
    quantity: number
    amount: number
  }>
}

// MD5 implementation (keep your existing one)
function md5(string: string): string {
  // ... your existing MD5 function
}

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
  
  return md5(pfOutput);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('PayFast payment function called');

    const requestBody = await req.json()
    const { orderId, amount, customerEmail, customerName, customerPhone, items }: PaymentRequest = requestBody

    // Get PayFast configuration
    const merchantId = Deno.env.get('PAYFAST_MERCHANT_ID')
    const merchantKey = Deno.env.get('PAYFAST_MERCHANT_KEY')
    const passphrase = Deno.env.get('PAYFAST_PASSPHRASE') || ''
    const isTestMode = Deno.env.get('PAYFAST_TEST_MODE') === 'true'

    if (!merchantId || !merchantKey) {
      throw new Error('PayFast configuration is incomplete')
    }

    // Use the CORRECT domain
    const appDomain = 'https://ikhayahomeware.online';
    
    // Use the NEW PayFast API endpoint
    const payfastApiUrl = isTestMode 
      ? 'https://api-sandbox.payfast.io/v1/process' 
      : 'https://api.payfast.io/v1/process';

    // Build PayFast data
    const payfastData: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: `${appDomain}/checkout/success?order_id=${orderId}`,
      cancel_url: `${appDomain}/checkout?cancelled=true`,
      notify_url: `https://kauostzhxqoxggwqgtym.supabase.co/functions/v1/payfast-webhook`,
      name_first: customerName.split(' ')[0] || '',
      name_last: customerName.split(' ').slice(1).join(' ') || '',
      email_address: customerEmail,
      m_payment_id: orderId,
      amount: amount.toFixed(2),
      item_name: items.map(item => item.name).join(', ').substring(0, 100),
      item_description: `Order ${orderId}`
    };

    if (customerPhone) {
      payfastData.cell_number = customerPhone;
    }

    // Generate signature
    const signature = generateSignature(payfastData, passphrase);
    payfastData.signature = signature;

    console.log('Calling PayFast API:', payfastApiUrl);
    console.log('With merchant_id:', merchantId);

    // Call the NEW PayFast API
    const response = await fetch(payfastApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payfastData)
    });

    const responseText = await response.text();
    console.log('PayFast API response:', responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      // If not JSON, might be an HTML error page
      console.error('PayFast returned non-JSON response:', responseText);
      throw new Error('Invalid response from PayFast');
    }

    if (!response.ok) {
      console.error('PayFast API error:', responseData);
      throw new Error(responseData.message || 'PayFast API error');
    }

    // The new API returns a redirect URL
    if (responseData.redirect_url || responseData.uuid) {
      const redirectUrl = responseData.redirect_url || 
                          `https://payment.payfast.io/eng/process/payment/${responseData.uuid}`;
      
      console.log('PayFast payment redirect URL:', redirectUrl);
      
      return new Response(
        JSON.stringify({
          success: true,
          redirectUrl: redirectUrl,
          uuid: responseData.uuid
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    } else {
      throw new Error('PayFast did not return a payment URL');
    }

  } catch (error) {
    console.error('PayFast payment function error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})