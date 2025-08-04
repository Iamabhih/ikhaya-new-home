// supabase/functions/payfast-webhook/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Pure JavaScript MD5 implementation (same as in payment function)
function md5(string: string): string {
  function RotateLeft(lValue: number, iShiftBits: number) {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
  }

  function AddUnsigned(lX: number, lY: number) {
    const lX4 = lX & 0x40000000;
    const lY4 = lY & 0x40000000;
    const lX8 = lX & 0x80000000;
    const lY8 = lY & 0x80000000;
    const lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
    if (lX4 & lY4) {
      return lResult ^ 0x80000000 ^ lX8 ^ lY8;
    }
    if (lX4 | lY4) {
      if (lResult & 0x40000000) {
        return lResult ^ 0xC0000000 ^ lX8 ^ lY8;
      } else {
        return lResult ^ 0x40000000 ^ lX8 ^ lY8;
      }
    } else {
      return lResult ^ lX8 ^ lY8;
    }
  }

  function F(x: number, y: number, z: number) {
    return (x & y) | (~x & z);
  }
  function G(x: number, y: number, z: number) {
    return (x & z) | (y & ~z);
  }
  function H(x: number, y: number, z: number) {
    return x ^ y ^ z;
  }
  function I(x: number, y: number, z: number) {
    return y ^ (x | ~z);
  }

  function FF(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  }

  function GG(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  }

  function HH(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  }

  function II(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  }

  function ConvertToWordArray(string: string) {
    let lWordCount;
    const lMessageLength = string.length;
    const lNumberOfWords_temp1 = lMessageLength + 8;
    const lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
    const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
    const lWordArray = Array(lNumberOfWords - 1);
    let lBytePosition = 0;
    let lByteCount = 0;
    while (lByteCount < lMessageLength) {
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition);
      lByteCount++;
    }
    lWordCount = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
    return lWordArray;
  }

  function WordToHex(lValue: number) {
    let WordToHexValue = "",
      WordToHexValue_temp = "",
      lByte,
      lCount;
    for (lCount = 0; lCount <= 3; lCount++) {
      lByte = (lValue >>> (lCount * 8)) & 255;
      WordToHexValue_temp = "0" + lByte.toString(16);
      WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2);
    }
    return WordToHexValue;
  }

  function Utf8Encode(string: string) {
    string = string.replace(/\r\n/g, "\n");
    let utftext = "";

    for (let n = 0; n < string.length; n++) {
      const c = string.charCodeAt(n);

      if (c < 128) {
        utftext += String.fromCharCode(c);
      } else if (c > 127 && c < 2048) {
        utftext += String.fromCharCode((c >> 6) | 192);
        utftext += String.fromCharCode((c & 63) | 128);
      } else {
        utftext += String.fromCharCode((c >> 12) | 224);
        utftext += String.fromCharCode(((c >> 6) & 63) | 128);
        utftext += String.fromCharCode((c & 63) | 128);
      }
    }

    return utftext;
  }

  let x = [];
  let k, AA, BB, CC, DD, a, b, c, d;
  const S11 = 7,
    S12 = 12,
    S13 = 17,
    S14 = 22;
  const S21 = 5,
    S22 = 9,
    S23 = 14,
    S24 = 20;
  const S31 = 4,
    S32 = 11,
    S33 = 16,
    S34 = 23;
  const S41 = 6,
    S42 = 10,
    S43 = 15,
    S44 = 21;

  string = Utf8Encode(string);

  x = ConvertToWordArray(string);

  a = 0x67452301;
  b = 0xEFCDAB89;
  c = 0x98BADCFE;
  d = 0x10325476;

  for (k = 0; k < x.length; k += 16) {
    AA = a;
    BB = b;
    CC = c;
    DD = d;
    a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
    d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
    c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
    b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
    a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
    d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
    c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
    b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
    a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
    d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
    c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
    b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
    a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
    d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
    c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
    b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
    a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
    d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
    c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
    b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
    a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
    d = GG(d, a, b, c, x[k + 10], S22, 0x2441453);
    c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
    b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
    a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
    d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
    c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
    b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
    a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
    d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
    c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
    b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
    a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
    d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
    c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
    b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
    a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
    d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
    c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
    b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
    a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
    d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
    c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
    b = HH(b, c, d, a, x[k + 6], S34, 0x4881D05);
    a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
    d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
    c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
    b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
    a = II(a, b, c, d, x[k + 0], S41, 0xF4292244);
    d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
    c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
    b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
    a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
    d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
    c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
    b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
    a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
    d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
    c = II(c, d, a, b, x[k + 6], S43, 0xA3014314);
    b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
    a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
    d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
    c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
    b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
    a = AddUnsigned(a, AA);
    b = AddUnsigned(b, BB);
    c = AddUnsigned(c, CC);
    d = AddUnsigned(d, DD);
  }

  const temp = WordToHex(a) + WordToHex(b) + WordToHex(c) + WordToHex(d);

  return temp.toLowerCase();
}

async function generateSignature(data: Record<string, string>, passphrase?: string): Promise<string> {
  // Create parameter string following PayFast's exact rules
  let pfOutput = "";
  
  // CRITICAL: For webhooks, PayFast sends data in their order, not alphabetical
  // We need to process in the order received from the webhook
  // Only include non-blank fields as per PayFast documentation
  for (let key in data) {
    if (data.hasOwnProperty(key)) {
      const value = data[key];
      // Only include non-blank fields
      if (value !== null && value !== undefined && value !== '') {
        // URL encode exactly as PayFast expects: uppercase hex, spaces as +
        const encodedValue = encodeURIComponent(value.trim())
          .replace(/!/g, '%21')
          .replace(/'/g, '%27')
          .replace(/\(/g, '%28')
          .replace(/\)/g, '%29')
          .replace(/\*/g, '%2A')
          .replace(/%20/g, '+')
          .replace(/%[0-9a-f]{2}/gi, (match) => match.toUpperCase());
        
        pfOutput += `${key}=${encodedValue}&`;
      }
    }
  }
  
  // Remove last ampersand
  let getString = pfOutput.slice(0, -1);
  
  // Add passphrase if provided (also with uppercase encoding)
  if (passphrase !== null && passphrase !== undefined && passphrase !== "") {
    const encodedPassphrase = encodeURIComponent(passphrase.trim())
      .replace(/!/g, '%21')
      .replace(/'/g, '%27')
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29')
      .replace(/\*/g, '%2A')
      .replace(/%20/g, '+')
      .replace(/%[0-9a-f]{2}/gi, (match) => match.toUpperCase());
    getString += `&passphrase=${encodedPassphrase}`;
  }
  
  console.log('Webhook signature verification (corrected):');
  console.log('- Parameter string (first 300 chars):', getString.substring(0, 300) + '...');
  console.log('- Full string length:', getString.length);
  console.log('- Has passphrase:', !!(passphrase && passphrase !== ""));
  console.log('- Fields included:', Object.keys(data).filter(k => data[k] !== '').join(', '));

  // Generate MD5 hash
  const md5Hash = md5(getString);
  
  console.log('- Calculated signature:', md5Hash);
  return md5Hash;
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

    console.log('PayFast webhook called - Raw request details:', {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries()),
      contentType: req.headers.get('content-type')
    });

    // Parse form data from PayFast
    const formData = await req.formData();
    
    // Create ordered data structure - preserving the order PayFast sends
    const payfastData: Record<string, string> = {};
    const fieldOrder: string[] = [];
    
    // Process form data in the order received
    for (const [key, value] of formData) {
      payfastData[key] = value.toString();
      fieldOrder.push(key);
    }

    console.log('PayFast webhook received data:', {
      payment_status: payfastData.payment_status,
      m_payment_id: payfastData.m_payment_id,
      pf_payment_id: payfastData.pf_payment_id,
      amount_gross: payfastData.amount_gross,
      signature: payfastData.signature ? payfastData.signature.substring(0, 8) + '...' : 'missing',
      totalFields: fieldOrder.length,
      fieldOrder: fieldOrder.slice(0, 10).join(', ') + '...',
      blankFields: fieldOrder.filter(k => !payfastData[k] || payfastData[k] === '').length
    });

    // Verify signature
    const receivedSignature = payfastData.signature;
    
    // Create ordered object for verification (excluding signature)
    const dataForVerification: Record<string, string> = {};
    for (const field of fieldOrder) {
      if (field !== 'signature') {
        dataForVerification[field] = payfastData[field];
      }
    }

    // Get PayFast configuration from database to match payment function
    console.log('Loading PayFast configuration from database for signature verification...');
    
    const { data: paymentSettings, error: settingsError } = await supabaseClient
      .from('payment_settings')
      .select('*')
      .eq('gateway_name', 'payfast')
      .eq('is_enabled', true)
      .maybeSingle();

    if (settingsError) {
      console.error('Error loading payment settings for webhook:', settingsError);
      return new Response('Failed to load payment configuration', { status: 500 });
    }

    if (!paymentSettings) {
      console.error('PayFast gateway not enabled or configured for webhook');
      return new Response('PayFast payment gateway is not enabled', { status: 500 });
    }

    const settings = paymentSettings.settings as any;
    const passphrase = settings?.passphrase || Deno.env.get('PAYFAST_PASSPHRASE') || '';
    
    console.log('PayFast config loaded for webhook:', {
      hasPassphrase: !!passphrase,
      isTestMode: paymentSettings.is_test_mode,
      fromDatabase: true
    });

    const calculatedSignature = await generateSignature(dataForVerification, passphrase);

    if (receivedSignature !== calculatedSignature) {
      console.error('Invalid PayFast signature:', {
        received: receivedSignature,
        calculated: calculatedSignature,
        receivedLength: receivedSignature?.length,
        calculatedLength: calculatedSignature?.length
      });
      
      // Debug: Log the exact data being used
      console.error('Data for verification:', JSON.stringify(dataForVerification, null, 2));
      console.error('Passphrase present:', !!passphrase);
      
      return new Response('Invalid signature', { status: 400 })
    }

    console.log('Signature verified successfully');

    const paymentStatus = payfastData.payment_status
    const orderId = payfastData.m_payment_id
    const amount = parseFloat(payfastData.amount_gross || '0')

    console.log(`PayFast webhook: Order ${orderId}, Status: ${paymentStatus}, Amount: ${amount}`)

    // Handle payment status - CREATE ORDER ONLY AFTER SUCCESSFUL PAYMENT
    if (paymentStatus === 'COMPLETE') {
      console.log(`Payment successful for temp order ${orderId}, creating actual order...`);
      
      // Check if this is a temporary order ID that needs order creation
      if (orderId.startsWith('TEMP-')) {
        try {
          // This is a new payment - create the order
          const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
          
          // Create order with confirmed status since payment is complete
          const orderData = {
            user_id: null, // Will be filled from frontend session data if available
            email: payfastData.email_address,
            order_number: orderNumber,
            billing_address: {
              address: `${payfastData.name_first} ${payfastData.name_last}`,
              city: 'Unknown',
              province: 'Unknown',
              postal_code: 'Unknown'
            },
            shipping_address: {
              address: `${payfastData.name_first} ${payfastData.name_last}`,
              city: 'Unknown', 
              province: 'Unknown',
              postal_code: 'Unknown'
            },
            subtotal: amount,
            shipping_amount: 0,
            total_amount: amount,
            status: 'confirmed',
            payment_status: 'paid',
            payment_gateway: 'payfast',
            payment_reference: payfastData.pf_payment_id,
            payment_gateway_response: payfastData
          };

          const { data: newOrder, error: orderError } = await supabaseClient
            .from('orders')
            .insert(orderData)
            .select()
            .single();

          if (orderError) {
            console.error('Failed to create order:', orderError);
            return new Response('Failed to create order', { status: 500 });
          }

          console.log(`Order ${newOrder.id} created successfully for temp order ${orderId}`);
          
          // Send confirmation email
          try {
            await supabaseClient.functions.invoke('send-email', {
              body: {
                to: newOrder.email,
                template: 'order-confirmation',
                data: {
                  orderId: newOrder.order_number,
                  amount,
                  paymentReference: payfastData.pf_payment_id
                }
              }
            });
          } catch (emailError) {
            console.error('Failed to send confirmation email:', emailError);
            // Don't fail the webhook if email fails
          }

        } catch (error) {
          console.error('Error creating order for successful payment:', error);
          return new Response('Order creation failed', { status: 500 });
        }
      } else {
        // This is an existing order - just update it
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
          .eq('id', orderId);

        if (updateError) {
          console.error('Failed to update existing order:', updateError);
          return new Response('Database update failed', { status: 500 });
        }

        console.log(`Existing order ${orderId} marked as paid`);
      }

    } else if (paymentStatus === 'CANCELLED' || paymentStatus === 'FAILED') {
      console.log(`Payment ${paymentStatus.toLowerCase()} for order ${orderId}`);
      
      // For temporary orders, we don't create anything - just log
      if (orderId.startsWith('TEMP-')) {
        console.log(`Temporary order ${orderId} payment failed - no order created`);
      } else {
        // For existing orders, mark as failed
        const { error: updateError } = await supabaseClient
          .from('orders')
          .update({
            status: 'cancelled',
            payment_status: 'failed',
            payment_gateway: 'payfast',
            payment_gateway_response: payfastData,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);

        if (updateError) {
          console.error('Failed to update order:', updateError);
          return new Response('Database update failed', { status: 500 });
        }

        console.log(`Order ${orderId} marked as failed/cancelled`);
      }
    } else {
      // Pending or other status
      console.log(`Order ${orderId} has status: ${paymentStatus} - no action taken`);
    }

    return new Response('OK', { status: 200 })

  } catch (error) {
    console.error('PayFast webhook error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
})