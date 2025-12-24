/**
 * PayFast Signature Generation Utility
 * 
 * According to PayFast documentation, the signature is created by:
 * 1. Concatenating field values in a SPECIFIC order (not alphabetical)
 * 2. URL-encoding the values
 * 3. Appending the passphrase (if configured)
 * 4. Generating an MD5 hash
 * 
 * Field order per PayFast docs:
 * 1. Merchant details (merchant_id, merchant_key, return_url, cancel_url, notify_url)
 * 2. Buyer details (name_first, name_last, email_address, cell_number)
 * 3. Transaction details (m_payment_id, amount, item_name, item_description)
 * 4. Custom values (custom_str1-5, custom_int1-5)
 * 5. Subscription details (subscription_type, billing_date, recurring_amount, frequency, cycles)
 * 6. Payment method (payment_method)
 */

import { md5 } from 'js-md5';

export interface PayFastFieldsForSignature {
  // Merchant details (required)
  merchant_id: string;
  merchant_key: string;
  return_url?: string;
  cancel_url?: string;
  notify_url?: string;
  
  // Buyer details
  name_first?: string;
  name_last?: string;
  email_address?: string;
  cell_number?: string;
  
  // Transaction details
  m_payment_id?: string;
  amount: string;
  item_name: string;
  item_description?: string;
  
  // Custom fields
  custom_str1?: string;
  custom_str2?: string;
  custom_str3?: string;
  custom_str4?: string;
  custom_str5?: string;
  custom_int1?: string;
  custom_int2?: string;
  custom_int3?: string;
  custom_int4?: string;
  custom_int5?: string;
  
  // Payment method
  payment_method?: string;
}

// PayFast-specified field order
const PAYFAST_FIELD_ORDER = [
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
  'custom_str1',
  'custom_str2',
  'custom_str3',
  'custom_str4',
  'custom_str5',
  'custom_int1',
  'custom_int2',
  'custom_int3',
  'custom_int4',
  'custom_int5',
  'payment_method',
] as const;

/**
 * URL-encode a value according to PayFast requirements
 * PayFast requires RFC 3986 encoding (uppercase hex)
 */
const urlEncode = (value: string): string => {
  return encodeURIComponent(value)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A')
    .replace(/%20/g, '+');
};

/**
 * Generate PayFast signature string (before hashing)
 */
export const generateSignatureString = (
  fields: PayFastFieldsForSignature,
  passphrase?: string
): string => {
  const pairs: string[] = [];
  
  // Add fields in the correct order
  for (const key of PAYFAST_FIELD_ORDER) {
    const value = fields[key as keyof PayFastFieldsForSignature];
    if (value !== undefined && value !== null && value !== '') {
      pairs.push(`${key}=${urlEncode(value)}`);
    }
  }
  
  // Join with ampersand
  let signatureString = pairs.join('&');
  
  // Append passphrase if configured
  if (passphrase && passphrase.trim() !== '') {
    signatureString += `&passphrase=${urlEncode(passphrase)}`;
  }
  
  return signatureString;
};

/**
 * Generate PayFast MD5 signature
 */
export const generateSignature = (
  fields: PayFastFieldsForSignature,
  passphrase?: string
): string => {
  const signatureString = generateSignatureString(fields, passphrase);
  return md5(signatureString);
};

/**
 * Get ordered form fields (for debugging)
 */
export const getOrderedFormFields = (
  fields: PayFastFieldsForSignature
): Array<{ name: string; value: string }> => {
  const result: Array<{ name: string; value: string }> = [];
  
  for (const key of PAYFAST_FIELD_ORDER) {
    const value = fields[key as keyof PayFastFieldsForSignature];
    if (value !== undefined && value !== null && value !== '') {
      result.push({ name: key, value });
    }
  }
  
  return result;
};
