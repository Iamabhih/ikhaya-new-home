import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'
import { corsHeaders } from '../_shared/cors.ts'

// MD5 implementation for signature generation (Web Crypto API doesn't support MD5 in Deno)
function md5(text: string): string {
  // Simple MD5 implementation for PayFast signatures
  // Note: This is a basic implementation for compatibility
  
  function rotateLeft(value: number, amount: number): number {
    return (value << amount) | (value >>> (32 - amount));
  }
  
  function addUnsigned(x: number, y: number): number {
    return ((x & 0x7FFFFFFF) + (y & 0x7FFFFFFF)) ^ (x & 0x80000000) ^ (y & 0x80000000);
  }
  
  function f(x: number, y: number, z: number): number {
    return (x & y) | ((~x) & z);
  }
  
  function g(x: number, y: number, z: number): number {
    return (x & z) | (y & (~z));
  }
  
  function h(x: number, y: number, z: number): number {
    return x ^ y ^ z;
  }
  
  function i(x: number, y: number, z: number): number {
    return y ^ (x | (~z));
  }
  
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(f(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(g(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(h(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(i(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  
  function convertToWordArray(str: string): number[] {
    const wordArray: number[] = [];
    let wordCount = 0;
    for (let i = 0; i < str.length; i++) {
      const charCode = str.charCodeAt(i);
      wordArray[wordCount >>> 2] |= charCode << ((wordCount % 4) * 8);
      wordCount++;
    }
    return wordArray;
  }
  
  function wordToHex(word: number): string {
    let hex = '';
    for (let i = 0; i <= 3; i++) {
      const byte = (word >>> (i * 8)) & 255;
      hex += ((byte < 16) ? '0' : '') + byte.toString(16);
    }
    return hex;
  }
  
  const textLength = text.length;
  text += String.fromCharCode(0x80);
  const paddedLength = text.length + (56 - (text.length % 64));
  
  for (let i = text.length; i < paddedLength; i++) {
    text += String.fromCharCode(0x00);
  }
  
  text += String.fromCharCode(textLength & 0xFF);
  text += String.fromCharCode((textLength >>> 8) & 0xFF);
  text += String.fromCharCode((textLength >>> 16) & 0xFF);
  text += String.fromCharCode((textLength >>> 24) & 0xFF);
  text += String.fromCharCode(0x00);
  text += String.fromCharCode(0x00);
  text += String.fromCharCode(0x00);
  text += String.fromCharCode(0x00);
  
  const wordArray = convertToWordArray(text);
  
  let a = 0x67452301;
  let b = 0xEFCDAB89;
  let c = 0x98BADCFE;
  let d = 0x10325476;
  
  for (let i = 0; i < wordArray.length; i += 16) {
    const aa = a;
    const bb = b;
    const cc = c;
    const dd = d;
    
    a = ff(a, b, c, d, wordArray[i + 0], 7, 0xD76AA478);
    d = ff(d, a, b, c, wordArray[i + 1], 12, 0xE8C7B756);
    c = ff(c, d, a, b, wordArray[i + 2], 17, 0x242070DB);
    b = ff(b, c, d, a, wordArray[i + 3], 22, 0xC1BDCEEE);
    a = ff(a, b, c, d, wordArray[i + 4], 7, 0xF57C0FAF);
    d = ff(d, a, b, c, wordArray[i + 5], 12, 0x4787C62A);
    c = ff(c, d, a, b, wordArray[i + 6], 17, 0xA8304613);
    b = ff(b, c, d, a, wordArray[i + 7], 22, 0xFD469501);
    a = ff(a, b, c, d, wordArray[i + 8], 7, 0x698098D8);
    d = ff(d, a, b, c, wordArray[i + 9], 12, 0x8B44F7AF);
    c = ff(c, d, a, b, wordArray[i + 10], 17, 0xFFFF5BB1);
    b = ff(b, c, d, a, wordArray[i + 11], 22, 0x895CD7BE);
    a = ff(a, b, c, d, wordArray[i + 12], 7, 0x6B901122);
    d = ff(d, a, b, c, wordArray[i + 13], 12, 0xFD987193);
    c = ff(c, d, a, b, wordArray[i + 14], 17, 0xA679438E);
    b = ff(b, c, d, a, wordArray[i + 15], 22, 0x49B40821);
    
    a = gg(a, b, c, d, wordArray[i + 1], 5, 0xF61E2562);
    d = gg(d, a, b, c, wordArray[i + 6], 9, 0xC040B340);
    c = gg(c, d, a, b, wordArray[i + 11], 14, 0x265E5A51);
    b = gg(b, c, d, a, wordArray[i + 0], 20, 0xE9B6C7AA);
    a = gg(a, b, c, d, wordArray[i + 5], 5, 0xD62F105D);
    d = gg(d, a, b, c, wordArray[i + 10], 9, 0x2441453);
    c = gg(c, d, a, b, wordArray[i + 15], 14, 0xD8A1E681);
    b = gg(b, c, d, a, wordArray[i + 4], 20, 0xE7D3FBC8);
    a = gg(a, b, c, d, wordArray[i + 9], 5, 0x21E1CDE6);
    d = gg(d, a, b, c, wordArray[i + 14], 9, 0xC33707D6);
    c = gg(c, d, a, b, wordArray[i + 3], 14, 0xF4D50D87);
    b = gg(b, c, d, a, wordArray[i + 8], 20, 0x455A14ED);
    a = gg(a, b, c, d, wordArray[i + 13], 5, 0xA9E3E905);
    d = gg(d, a, b, c, wordArray[i + 2], 9, 0xFCEFA3F8);
    c = gg(c, d, a, b, wordArray[i + 7], 14, 0x676F02D9);
    b = gg(b, c, d, a, wordArray[i + 12], 20, 0x8D2A4C8A);
    
    a = hh(a, b, c, d, wordArray[i + 5], 4, 0xFFFA3942);
    d = hh(d, a, b, c, wordArray[i + 8], 11, 0x8771F681);
    c = hh(c, d, a, b, wordArray[i + 11], 16, 0x6D9D6122);
    b = hh(b, c, d, a, wordArray[i + 14], 23, 0xFDE5380C);
    a = hh(a, b, c, d, wordArray[i + 1], 4, 0xA4BEEA44);
    d = hh(d, a, b, c, wordArray[i + 4], 11, 0x4BDECFA9);
    c = hh(c, d, a, b, wordArray[i + 7], 16, 0xF6BB4B60);
    b = hh(b, c, d, a, wordArray[i + 10], 23, 0xBEBFBC70);
    a = hh(a, b, c, d, wordArray[i + 13], 4, 0x289B7EC6);
    d = hh(d, a, b, c, wordArray[i + 0], 11, 0xEAA127FA);
    c = hh(c, d, a, b, wordArray[i + 3], 16, 0xD4EF3085);
    b = hh(b, c, d, a, wordArray[i + 6], 23, 0x4881D05);
    a = hh(a, b, c, d, wordArray[i + 9], 4, 0xD9D4D039);
    d = hh(d, a, b, c, wordArray[i + 12], 11, 0xE6DB99E5);
    c = hh(c, d, a, b, wordArray[i + 15], 16, 0x1FA27CF8);
    b = hh(b, c, d, a, wordArray[i + 2], 23, 0xC4AC5665);
    
    a = ii(a, b, c, d, wordArray[i + 0], 6, 0xF4292244);
    d = ii(d, a, b, c, wordArray[i + 7], 10, 0x432AFF97);
    c = ii(c, d, a, b, wordArray[i + 14], 15, 0xAB9423A7);
    b = ii(b, c, d, a, wordArray[i + 5], 21, 0xFC93A039);
    a = ii(a, b, c, d, wordArray[i + 12], 6, 0x655B59C3);
    d = ii(d, a, b, c, wordArray[i + 3], 10, 0x8F0CCC92);
    c = ii(c, d, a, b, wordArray[i + 10], 15, 0xFFEFF47D);
    b = ii(b, c, d, a, wordArray[i + 1], 21, 0x85845DD1);
    a = ii(a, b, c, d, wordArray[i + 8], 6, 0x6FA87E4F);
    d = ii(d, a, b, c, wordArray[i + 15], 10, 0xFE2CE6E0);
    c = ii(c, d, a, b, wordArray[i + 6], 15, 0xA3014314);
    b = ii(b, c, d, a, wordArray[i + 13], 21, 0x4E0811A1);
    a = ii(a, b, c, d, wordArray[i + 4], 6, 0xF7537E82);
    d = ii(d, a, b, c, wordArray[i + 11], 10, 0xBD3AF235);
    c = ii(c, d, a, b, wordArray[i + 2], 15, 0x2AD7D2BB);
    b = ii(b, c, d, a, wordArray[i + 9], 21, 0xEB86D391);
    
    a = addUnsigned(a, aa);
    b = addUnsigned(b, bb);
    c = addUnsigned(c, cc);
    d = addUnsigned(d, dd);
  }
  
  return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
}

async function generateSignature(data: Record<string, string>, passphrase?: string): Promise<string> {
  // PayFast requires specific parameter order
  const orderedKeys = [
    'merchant_id',
    'merchant_key',
    'return_url',
    'cancel_url',
    'notify_url',
    'name_first',
    'name_last',
    'email_address',
    'cell_number',
    'm_payment_id',
    'amount',
    'item_name',
    'item_description',
    'custom_int1',
    'custom_int2',
    'custom_int3',
    'custom_int4',
    'custom_int5',
    'custom_str1',
    'custom_str2',
    'custom_str3',
    'custom_str4',
    'custom_str5',
    'email_confirmation',
    'confirmation_address',
    'payment_method',
    'subscription_type',
    'subscription_notify_email',
    'subscription_notify_webhook',
    'subscription_notify_buyer',
    'recurring_amount',
    'frequency',
    'cycles'
  ];

  // Build parameter string in correct order
  const paramStringArray: string[] = [];
  
  orderedKeys.forEach(key => {
    if (data.hasOwnProperty(key) && data[key] !== '') {
      // Don't encode here - just add raw values
      paramStringArray.push(`${key}=${data[key]}`);
    }
  });

  // Join with & to create parameter string
  let paramString = paramStringArray.join('&');
  
  // Add passphrase if provided (also unencoded)
  if (passphrase && passphrase !== '') {
    paramString += `&passphrase=${passphrase}`;
  }
  
  console.log('PayFast signature generation:');
  console.log('- Parameter string:', paramString);
  console.log('- String length:', paramString.length);

  // Generate MD5 hash
  const md5Hash = md5(paramString);
  
  console.log('- Generated signature:', md5Hash);
  return md5Hash;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('PayFast payment function called')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get PayFast configuration from environment
    const merchantId = Deno.env.get('PAYFAST_MERCHANT_ID')
    const merchantKey = Deno.env.get('PAYFAST_MERCHANT_KEY')
    const passphrase = Deno.env.get('PAYFAST_PASSPHRASE')
    const mode = Deno.env.get('PAYFAST_MODE') || 'sandbox'

    console.log('PayFast config:', {
      merchantId: merchantId ? '***' : 'missing',
      merchantKey: merchantKey ? '***' : 'missing',
      passphrase: passphrase ? '***' : 'missing',
      mode
    })

    if (!merchantId || !merchantKey) {
      console.error('Missing PayFast configuration')
      return new Response(
        JSON.stringify({ error: 'PayFast configuration missing' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse request body
    const { orderId, amount, customerEmail, customerName, customerPhone, items } = await req.json()

    console.log('Payment request:', {
      orderId,
      amount,
      customerEmail: customerEmail?.substring(0, 3) + '***',
      customerName,
      itemCount: items?.length
    })

    // Prepare PayFast parameters with proper formatting
    const payfastData: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: `${req.headers.get('origin')}/checkout/success?order_id=${orderId}`,
      cancel_url: `${req.headers.get('origin')}/checkout?cancelled=true`,
      notify_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/payfast-webhook`,
      name_first: customerName.split(' ')[0] || '',
      name_last: customerName.split(' ').slice(1).join(' ') || '',
      email_address: customerEmail,
      cell_number: customerPhone || '',
      m_payment_id: orderId,
      amount: amount.toFixed(2),
      item_name: items.map((item: any) => item.name).join(', ').substring(0, 100), // PayFast limit
      item_description: `Order ${orderId} - ${items.length} items`,
    }

    // IMPORTANT: Remove any undefined or null values before signature generation
    const cleanedData: Record<string, string> = {}
    for (const [key, value] of Object.entries(payfastData)) {
      if (value !== '' && value !== null && value !== undefined) {
        cleanedData[key] = String(value).trim(); // Ensure strings and trim whitespace
      }
    }

    // Generate signature
    const signature = await generateSignature(cleanedData, passphrase)
    cleanedData.signature = signature

    // PayFast URL based on mode
    const payfastUrl = mode === 'live' 
      ? 'https://www.payfast.co.za/eng/process'
      : 'https://sandbox.payfast.co.za/eng/process'

    console.log('PayFast payment data prepared:', {
      url: payfastUrl,
      dataKeys: Object.keys(cleanedData),
      signature: signature.substring(0, 8) + '***'
    })

    return new Response(
      JSON.stringify({
        success: true,
        payfast_url: payfastUrl,
        payment_data: cleanedData
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('PayFast payment error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})