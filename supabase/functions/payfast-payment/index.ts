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
  customerPhone: string
  items: Array<{
    name: string
    description?: string
    quantity: number
    amount: number
  }>
}

// Pure JavaScript MD5 implementation
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
  // Create parameter string
  let pfOutput = "";
  
  // Process parameters in the order they appear in the data object
  // Only include non-blank fields as per PayFast documentation
  for (let key in data) {
    if (data.hasOwnProperty(key)) {
      const value = data[key];
      // Only include non-blank fields
      if (value !== null && value !== undefined && value !== '') {
        // URL encode with uppercase hex codes and replace %20 with +
        const encodedValue = encodeURIComponent(value.trim())
          .replace(/%20/g, "+")
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
      .replace(/%20/g, "+")
      .replace(/%[0-9a-f]{2}/gi, (match) => match.toUpperCase());
    getString += `&passphrase=${encodedPassphrase}`;
  }
  
  console.log('PayFast signature generation:');
  console.log('- Parameter string (first 200 chars):', getString.substring(0, 200) + '...');
  console.log('- Full string length:', getString.length);
  console.log('- Has passphrase:', !!(passphrase && passphrase !== ""));

  // Generate MD5 hash
  const md5Hash = md5(getString);
  
  console.log('- Generated signature:', md5Hash);
  return md5Hash;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('PayFast payment function called');
    console.log('Request method:', req.method);
    console.log('Authorization header present:', !!req.headers.get('Authorization'));

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
      error: userError
    } = await supabaseClient.auth.getUser()

    console.log('User authentication check:', { 
      hasUser: !!user, 
      userId: user?.id, 
      userEmail: user?.email?.substring(0, 3) + '***',
      userError: userError?.message 
    });

    if (userError) {
      console.error('User authentication error:', userError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Authentication failed: ' + userError.message
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    if (!user) {
      console.error('User not authenticated')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'User not authenticated'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    const requestBody = await req.json()
    console.log('Raw request body (sanitized):', JSON.stringify({
      ...requestBody,
      customerEmail: requestBody.customerEmail?.substring(0, 3) + '***',
      customerPhone: requestBody.customerPhone ? '***' : undefined
    }))
    
    const { orderId, amount, customerEmail, customerName, customerPhone, items }: PaymentRequest = requestBody

    if (!orderId || !amount || !customerEmail || !customerName) {
      console.error('Missing required payment parameters:', { 
        orderId: !!orderId, 
        amount: !!amount, 
        customerEmail: !!customerEmail, 
        customerName: !!customerName 
      })
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required payment parameters: orderId, amount, customerEmail, and customerName are required'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    console.log('Payment request received:', { 
      orderId, 
      amount, 
      customerEmail: customerEmail.substring(0, 3) + '***',
      customerName,
      itemCount: items?.length || 0
    })

    // Get PayFast configuration from secrets
    const merchantId = Deno.env.get('PAYFAST_MERCHANT_ID')
    const merchantKey = Deno.env.get('PAYFAST_MERCHANT_KEY')
    const passphrase = Deno.env.get('PAYFAST_PASSPHRASE') || ''
    const payfastMode = Deno.env.get('PAYFAST_MODE') || 'sandbox'

    console.log('PayFast config check:', {
      hasMerchantId: !!merchantId,
      hasMerchantKey: !!merchantKey,
      hasPassphrase: !!passphrase,
      mode: payfastMode
    })

    if (!merchantId || !merchantKey) {
      console.error('PayFast configuration missing:', {
        merchantId: merchantId ? 'present' : 'missing',
        merchantKey: merchantKey ? 'present' : 'missing'
      })
      return new Response(
        JSON.stringify({
          success: false,
          error: 'PayFast configuration is incomplete. Please check merchant credentials.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    // Determine PayFast URL based on mode
    const payfastUrl = payfastMode === 'live' || payfastMode === 'production'
      ? 'https://www.payfast.co.za/eng/process'
      : 'https://sandbox.payfast.co.za/eng/process'

    // Prepare PayFast parameters in specific order
    const payfastData: Record<string, string> = {};
    
    // Add parameters in specific order
    payfastData.merchant_id = merchantId;
    payfastData.merchant_key = merchantKey;
    payfastData.return_url = `${req.headers.get('origin')}/checkout/success?order_id=${orderId}`;
    payfastData.cancel_url = `${req.headers.get('origin')}/checkout?cancelled=true`;
    payfastData.notify_url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/payfast-webhook`;
    
    // Only add non-empty values
    const firstName = customerName.split(' ')[0] || '';
    const lastName = customerName.split(' ').slice(1).join(' ') || '';
    
    if (firstName) payfastData.name_first = firstName;
    if (lastName) payfastData.name_last = lastName;
    
    payfastData.email_address = customerEmail;
    
    if (customerPhone) {
      payfastData.cell_number = customerPhone;
    }
    
    payfastData.m_payment_id = orderId;
    payfastData.amount = amount.toFixed(2);
    payfastData.item_name = items.map(item => item.name).join(', ').substring(0, 100);
    payfastData.item_description = `Order ${orderId} - ${items.length} items`;

    // Generate signature using the exact data object
    const signature = await generateSignature(payfastData, passphrase);
    
    // Add signature to the data
    payfastData.signature = signature;

    console.log('PayFast payment initiated successfully:', {
      orderId,
      amount,
      merchant_id: merchantId.substring(0, 4) + '****',
      mode: payfastMode,
      payfastUrl,
      dataKeys: Object.keys(payfastData)
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
    
    // Return more specific error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const statusCode = error.message?.includes('configuration') ? 500 :
                      error.message?.includes('Authentication') ? 401 :
                      error.message?.includes('required') ? 400 : 500;
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode,
      }
    )
  }
})