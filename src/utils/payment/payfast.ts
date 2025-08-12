import { md5 } from 'js-md5';
import { PAYFAST_CONFIG, getCurrentPayfastConfig } from './constants';

export interface FormData {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

/**
 * Generate PayFast signature exactly as PayFast expects
 * Per PayFast docs: Sort keys alphabetically, exclude empty values and 'signature', encode values, then append passphrase
 */
export const generateSignature = (data: Record<string, string>, passPhrase: string): string => {
  try {
    // Build parameter string sorted alphabetically by key as per PayFast docs
    const keys = Object.keys(data)
      .filter((key) => key !== 'signature' && data[key] !== undefined && data[key] !== null && data[key] !== '')
      .sort();

    let pfOutput = '';
    for (const key of keys) {
      const val = data[key];
      pfOutput += `${key}=${encodeURIComponent(val.toString().trim()).replace(/%20/g, '+')}&`;
    }

    // Remove last ampersand
    pfOutput = pfOutput.slice(0, -1);

    // Add passphrase if provided
    if (passPhrase && passPhrase !== '') {
      pfOutput += `&passphrase=${encodeURIComponent(passPhrase.trim()).replace(/%20/g, '+')}`;
    }

    console.log('Signature string:', pfOutput);
    const signature = md5(pfOutput);
    console.log('Generated signature:', signature);

    return signature;
  } catch (error) {
    console.error('Error generating PayFast signature:', error);
    return '';
  }
};

/**
 * Initialize PayFast payment - Following PayFast documentation exactly
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
  const baseUrl = PAYFAST_CONFIG.siteUrl;
  
  // Build PayFast data with required fields; signature generation will sort alphabetically
  const pfData: Record<string, string> = {
    // Merchant details (MUST be first)
    merchant_id: config.merchant_id,
    merchant_key: config.merchant_key,
    
    // Return/Cancel/Notify URLs
    return_url: `${baseUrl}/checkout/success?order_id=${orderId}`,
    cancel_url: `${baseUrl}/checkout?cancelled=true`,
    notify_url: `https://kauostzhxqoxggwqgtym.supabase.co/functions/v1/payfast-webhook`,
    
    // Customer details
    name_first: formData?.firstName || customerName.split(' ')[0] || '',
    name_last: formData?.lastName || customerName.split(' ').slice(1).join(' ') || '',
    email_address: customerEmail,
    
    // Transaction details
    m_payment_id: orderId,
    amount: formattedAmount,
    item_name: itemName.substring(0, 100),
    item_description: `Order #${orderId}`
  };
  
  // Add optional phone number if provided (digits only per PayFast guidance)
  if (formData?.phone) {
    const digitsOnly = formData.phone.replace(/\D/g, '');
    if (digitsOnly) {
      pfData.cell_number = digitsOnly;
    }
  }
  
  // Generate signature with the ordered data
  const signature = generateSignature(pfData, config.passphrase || '');
  
  // Add signature to data AFTER generation
  pfData.signature = signature;
  
  console.log('PayFast payment data:', {
    ...pfData,
    environment: PAYFAST_CONFIG.useSandbox ? 'SANDBOX' : 'PRODUCTION',
    action: formAction
  });
  
  return {
    formAction,
    formData: pfData
  };
};

// Shared helper to submit a PayFast form consistently across the app
export const submitPayfastForm = (formAction: string, formData: Record<string, string>) => {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = formAction;
  form.target = '_blank';
  form.acceptCharset = 'UTF-8';
  form.style.display = 'none';

  Object.entries(formData).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = String(value);
      form.appendChild(input);
    }
  });

  document.body.appendChild(form);

  // Submit with a tiny delay to ensure DOM is ready
  setTimeout(() => {
    form.submit();
  }, 300);
};