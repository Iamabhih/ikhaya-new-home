/**
 * PayFast Signature Generation Utility
 * Implements the PayFast signature generation algorithm as per official documentation
 * @see https://developers.payfast.co.za/docs#step_2_signature
 */

export interface PayFastFormData {
  merchant_id: string;
  merchant_key: string;
  return_url: string;
  cancel_url: string;
  notify_url?: string;
  amount: string;
  item_name: string;
  item_description?: string;
  m_payment_id: string;
  name_first?: string;
  name_last?: string;
  email_address?: string;
  cell_number?: string;
  // Additional optional fields
  custom_int1?: string;
  custom_int2?: string;
  custom_int3?: string;
  custom_int4?: string;
  custom_int5?: string;
  custom_str1?: string;
  custom_str2?: string;
  custom_str3?: string;
  custom_str4?: string;
  custom_str5?: string;
  signature?: string; // Added for type safety, but excluded from signature generation
}

/**
 * MD5 hash implementation for browser (PayFast requires MD5)
 * Standard MD5 algorithm implementation
 * @param str - String to hash
 * @returns MD5 hash as hex string
 */
const md5 = (str: string): string => {
  const rotateLeft = (n: number, s: number) => (n << s) | (n >>> (32 - s));

  const addUnsigned = (x: number, y: number) => {
    const lsw = (x & 0xFFFF) + (y & 0xFFFF);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xFFFF);
  };

  const utf8Encode = (s: string): string => {
    return unescape(encodeURIComponent(s));
  };

  const convertToWordArray = (s: string): number[] => {
    const numberOfWords = ((s.length + 8) >> 6) + 1;
    const wordArray: number[] = new Array(numberOfWords * 16).fill(0);

    for (let i = 0; i < s.length; i++) {
      wordArray[i >> 2] |= (s.charCodeAt(i) & 0xFF) << ((i % 4) * 8);
    }
    wordArray[s.length >> 2] |= 0x80 << ((s.length % 4) * 8);
    wordArray[numberOfWords * 16 - 2] = s.length * 8;

    return wordArray;
  };

  const FF = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) => {
    a = addUnsigned(a, addUnsigned(addUnsigned((b & c) | (~b & d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  };

  const GG = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) => {
    a = addUnsigned(a, addUnsigned(addUnsigned((b & d) | (c & ~d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  };

  const HH = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) => {
    a = addUnsigned(a, addUnsigned(addUnsigned(b ^ c ^ d, x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  };

  const II = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) => {
    a = addUnsigned(a, addUnsigned(addUnsigned(c ^ (b | ~d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  };

  const convertToHex = (n: number): string => {
    let hex = '';
    for (let i = 0; i <= 3; i++) {
      hex += ((n >> (i * 8 + 4)) & 0x0F).toString(16) + ((n >> (i * 8)) & 0x0F).toString(16);
    }
    return hex;
  };

  const string = utf8Encode(str);
  const x = convertToWordArray(string);

  let a = 0x67452301;
  let b = 0xEFCDAB89;
  let c = 0x98BADCFE;
  let d = 0x10325476;

  for (let k = 0; k < x.length; k += 16) {
    const AA = a, BB = b, CC = c, DD = d;

    a = FF(a, b, c, d, x[k + 0], 7, 0xD76AA478);
    d = FF(d, a, b, c, x[k + 1], 12, 0xE8C7B756);
    c = FF(c, d, a, b, x[k + 2], 17, 0x242070DB);
    b = FF(b, c, d, a, x[k + 3], 22, 0xC1BDCEEE);
    a = FF(a, b, c, d, x[k + 4], 7, 0xF57C0FAF);
    d = FF(d, a, b, c, x[k + 5], 12, 0x4787C62A);
    c = FF(c, d, a, b, x[k + 6], 17, 0xA8304613);
    b = FF(b, c, d, a, x[k + 7], 22, 0xFD469501);
    a = FF(a, b, c, d, x[k + 8], 7, 0x698098D8);
    d = FF(d, a, b, c, x[k + 9], 12, 0x8B44F7AF);
    c = FF(c, d, a, b, x[k + 10], 17, 0xFFFF5BB1);
    b = FF(b, c, d, a, x[k + 11], 22, 0x895CD7BE);
    a = FF(a, b, c, d, x[k + 12], 7, 0x6B901122);
    d = FF(d, a, b, c, x[k + 13], 12, 0xFD987193);
    c = FF(c, d, a, b, x[k + 14], 17, 0xA679438E);
    b = FF(b, c, d, a, x[k + 15], 22, 0x49B40821);

    a = GG(a, b, c, d, x[k + 1], 5, 0xF61E2562);
    d = GG(d, a, b, c, x[k + 6], 9, 0xC040B340);
    c = GG(c, d, a, b, x[k + 11], 14, 0x265E5A51);
    b = GG(b, c, d, a, x[k + 0], 20, 0xE9B6C7AA);
    a = GG(a, b, c, d, x[k + 5], 5, 0xD62F105D);
    d = GG(d, a, b, c, x[k + 10], 9, 0x02441453);
    c = GG(c, d, a, b, x[k + 15], 14, 0xD8A1E681);
    b = GG(b, c, d, a, x[k + 4], 20, 0xE7D3FBC8);
    a = GG(a, b, c, d, x[k + 9], 5, 0x21E1CDE6);
    d = GG(d, a, b, c, x[k + 14], 9, 0xC33707D6);
    c = GG(c, d, a, b, x[k + 3], 14, 0xF4D50D87);
    b = GG(b, c, d, a, x[k + 8], 20, 0x455A14ED);
    a = GG(a, b, c, d, x[k + 13], 5, 0xA9E3E905);
    d = GG(d, a, b, c, x[k + 2], 9, 0xFCEFA3F8);
    c = GG(c, d, a, b, x[k + 7], 14, 0x676F02D9);
    b = GG(b, c, d, a, x[k + 12], 20, 0x8D2A4C8A);

    a = HH(a, b, c, d, x[k + 5], 4, 0xFFFA3942);
    d = HH(d, a, b, c, x[k + 8], 11, 0x8771F681);
    c = HH(c, d, a, b, x[k + 11], 16, 0x6D9D6122);
    b = HH(b, c, d, a, x[k + 14], 23, 0xFDE5380C);
    a = HH(a, b, c, d, x[k + 1], 4, 0xA4BEEA44);
    d = HH(d, a, b, c, x[k + 4], 11, 0x4BDECFA9);
    c = HH(c, d, a, b, x[k + 7], 16, 0xF6BB4B60);
    b = HH(b, c, d, a, x[k + 10], 23, 0xBEBFBC70);
    a = HH(a, b, c, d, x[k + 13], 4, 0x289B7EC6);
    d = HH(d, a, b, c, x[k + 0], 11, 0xEAA127FA);
    c = HH(c, d, a, b, x[k + 3], 16, 0xD4EF3085);
    b = HH(b, c, d, a, x[k + 6], 23, 0x04881D05);
    a = HH(a, b, c, d, x[k + 9], 4, 0xD9D4D039);
    d = HH(d, a, b, c, x[k + 12], 11, 0xE6DB99E5);
    c = HH(c, d, a, b, x[k + 15], 16, 0x1FA27CF8);
    b = HH(b, c, d, a, x[k + 2], 23, 0xC4AC5665);

    a = II(a, b, c, d, x[k + 0], 6, 0xF4292244);
    d = II(d, a, b, c, x[k + 7], 10, 0x432AFF97);
    c = II(c, d, a, b, x[k + 14], 15, 0xAB9423A7);
    b = II(b, c, d, a, x[k + 5], 21, 0xFC93A039);
    a = II(a, b, c, d, x[k + 12], 6, 0x655B59C3);
    d = II(d, a, b, c, x[k + 3], 10, 0x8F0CCC92);
    c = II(c, d, a, b, x[k + 10], 15, 0xFFEFF47D);
    b = II(b, c, d, a, x[k + 1], 21, 0x85845DD1);
    a = II(a, b, c, d, x[k + 8], 6, 0x6FA87E4F);
    d = II(d, a, b, c, x[k + 15], 10, 0xFE2CE6E0);
    c = II(c, d, a, b, x[k + 6], 15, 0xA3014314);
    b = II(b, c, d, a, x[k + 13], 21, 0x4E0811A1);
    a = II(a, b, c, d, x[k + 4], 6, 0xF7537E82);
    d = II(d, a, b, c, x[k + 11], 10, 0xBD3AF235);
    c = II(c, d, a, b, x[k + 2], 15, 0x2AD7D2BB);
    b = II(b, c, d, a, x[k + 9], 21, 0xEB86D391);

    a = addUnsigned(a, AA);
    b = addUnsigned(b, BB);
    c = addUnsigned(c, CC);
    d = addUnsigned(d, DD);
  }

  return (convertToHex(a) + convertToHex(b) + convertToHex(c) + convertToHex(d)).toLowerCase();
};

/**
 * Generate PayFast signature for form data
 * Follows PayFast signature generation specification
 * @param data - The form data to sign (without signature field)
 * @param passphrase - Optional passphrase for additional security
 * @returns MD5 hash signature
 */
export const generatePayFastSignature = (
  data: PayFastFormData,
  passphrase: string = ''
): string => {
  // Create a copy to avoid mutating original, excluding signature
  const params: Record<string, string> = {};

  // Add all non-empty values to params object (except signature)
  Object.keys(data).forEach((key) => {
    if (key === 'signature') return; // Exclude signature from generation

    const value = data[key as keyof PayFastFormData];
    if (value !== undefined && value !== null && value !== '') {
      params[key] = String(value);
    }
  });

  // Sort parameters alphabetically by key
  const sortedKeys = Object.keys(params).sort();

  // Build parameter string
  const paramArray: string[] = [];
  sortedKeys.forEach((key) => {
    // URL encode the value
    const encodedValue = encodeURIComponent(params[key]).replace(/%20/g, '+');
    paramArray.push(`${key}=${encodedValue}`);
  });

  let paramString = paramArray.join('&');

  // Append passphrase if provided
  if (passphrase && passphrase.trim() !== '') {
    paramString += `&passphrase=${encodeURIComponent(passphrase.trim())}`;
  }

  console.log('[PayFast Signature] Parameter string length:', paramString.length);
  console.log('[PayFast Signature] Keys included:', sortedKeys.join(', '));

  // Generate MD5 hash
  const signature = md5(paramString);

  console.log('[PayFast Signature] Generated signature:', signature);

  return signature;
};

/**
 * Validate that all required fields are present
 * @param data - The form data to validate
 * @returns True if all required fields are present
 */
export const validatePayFastData = (data: Partial<PayFastFormData>): boolean => {
  const requiredFields: (keyof PayFastFormData)[] = [
    'merchant_id',
    'merchant_key',
    'return_url',
    'cancel_url',
    'amount',
    'item_name',
    'm_payment_id'
  ];

  for (const field of requiredFields) {
    if (!data[field] || data[field] === '') {
      console.error(`[PayFast Validation] Missing required field: ${field}`);
      return false;
    }
  }

  // Validate amount is a valid number
  const amount = parseFloat(data.amount || '0');
  if (isNaN(amount) || amount <= 0) {
    console.error('[PayFast Validation] Invalid amount:', data.amount);
    return false;
  }

  return true;
};

/**
 * Format amount to 2 decimal places (PayFast requirement)
 * @param amount - The amount to format
 * @returns Formatted amount string
 */
export const formatPayFastAmount = (amount: number): string => {
  return amount.toFixed(2);
};
