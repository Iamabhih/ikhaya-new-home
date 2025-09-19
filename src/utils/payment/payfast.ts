import { PAYFAST_CONFIG, getCurrentPayfastConfig } from './constants';
import { md5 } from 'js-md5';

export interface FormData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  province?: string;
}

/**
 * Generate PayFast signature according to official documentation
 */
const generateSignature = (data: Record<string, string>, passPhrase?: string): string => {
  // Create parameter string
  let pfOutput = '';
  
  // Sort keys and create URL encoded string
  Object.keys(data)
    .sort()
    .forEach(key => {
      const value = data[key];
      if (value && value !== '') {
        pfOutput += `${key}=${encodeURIComponent(value.trim())}&`;
      }
    });
  
  // Remove last ampersand
  pfOutput = pfOutput.slice(0, -1);
  
  // Add passphrase if provided
  if (passPhrase) {
    pfOutput += `&passphrase=${encodeURIComponent(passPhrase.trim())}`;
  }
  
  // Generate MD5 hash
  return md5(pfOutput);
};

/**
 * Simple PayFast HTML form integration - exactly like the documentation
 */
export const initializePayfastPayment = (
  orderId: string,
  customerName: string,
  customerEmail: string,
  amount: number,
  itemName: string,
  formData?: FormData
) => {
  const config = getCurrentPayfastConfig();
  const formAction = config.host;
  const formattedAmount = amount.toFixed(2);
  
  // Build PayFast data - following official documentation format
  const pfData: Record<string, string> = {
    // Merchant details
    merchant_id: config.merchant_id,
    merchant_key: config.merchant_key,
    
    // URLs  
    return_url: `${PAYFAST_CONFIG.siteUrl}/checkout/success`,
    cancel_url: `${PAYFAST_CONFIG.siteUrl}/checkout?cancelled=true`,
    notify_url: `https://kauostzhxqoxggwqgtym.supabase.co/functions/v1/payfast-webhook`,
    
    // Customer details
    name_first: formData?.firstName || customerName.split(' ')[0] || '',
    name_last: formData?.lastName || customerName.split(' ').slice(1).join(' ') || '',
    email_address: customerEmail,
    
    // Transaction details
    m_payment_id: orderId,
    amount: formattedAmount,
    item_name: itemName.substring(0, 100)
  };
  
  // Add phone if provided
  if (formData?.phone) {
    const digitsOnly = formData.phone.replace(/\D/g, '');
    let processedPhone = digitsOnly;
    
    // Handle South African country code (+27)
    if (digitsOnly.startsWith('27') && digitsOnly.length === 11) {
      // Remove country code (27) and add local prefix (0)
      processedPhone = '0' + digitsOnly.substring(2);
    } else if (digitsOnly.length >= 10) {
      // Take first 10 digits for other formats
      processedPhone = digitsOnly.substring(0, 10);
    }
    
    // Only add if we have exactly 10 digits
    if (processedPhone.length === 10) {
      pfData.cell_number = processedPhone;
    }
  }
  
  // Generate signature (required for PayFast)
  const signature = generateSignature(pfData, config.passphrase || '');
  pfData.signature = signature;
  
  console.log('PayFast payment initialized with signature:', {
    environment: PAYFAST_CONFIG.useSandbox ? 'SANDBOX' : 'PRODUCTION',
    orderId,
    amount: formattedAmount,
    merchantId: config.merchant_id,
    signatureGenerated: !!signature
  });
  
  return {
    formAction,
    formData: pfData
  };
};

/**
 * Submit PayFast form - exactly like SACHA does it
 */
export const submitPayfastForm = (formAction: string, formData: Record<string, string>) => {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = formAction;
  form.style.display = 'none';
  
  // Add all form fields as hidden inputs
  Object.entries(formData).forEach(([name, value]) => {
    if (value !== '' && value !== undefined && value !== null) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value.toString();
      form.appendChild(input);
      console.log(`Form field: ${name} = ${value}`);
    }
  });
  
  // Add form to document and submit
  document.body.appendChild(form);
  console.log('Submitting form to PayFast with signature...');
  form.submit();
  
  // Clean up after a delay
  setTimeout(() => {
    if (document.body.contains(form)) {
      document.body.removeChild(form);
    }
  }, 1000);
};