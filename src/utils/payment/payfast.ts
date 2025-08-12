
import { md5 } from 'js-md5';
import { PAYFAST_CONFIG, getCurrentPayfastConfig } from './constants';

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
 * Generate PayFast signature - matching rnr-live exactly
 */
export const generateSignature = (data: Record<string, string>, passPhrase: string = ''): string => {
  try {
    // Build parameter string
    let pfOutput = '';
    for (const key of Object.keys(data).sort()) {
      if (key !== 'signature' && data[key] !== '') {
        pfOutput += `${key}=${encodeURIComponent(data[key].trim()).replace(/%20/g, '+')}&`;
      }
    }
    // Remove last ampersand
    pfOutput = pfOutput.slice(0, -1);
    
    // Add passphrase if it exists (production only)
    if (passPhrase !== '') {
      pfOutput += `&passphrase=${encodeURIComponent(passPhrase.trim()).replace(/%20/g, '+')}`;
    }
    
    // Generate MD5 hash
    return md5(pfOutput);
  } catch (error) {
    console.error('Error generating PayFast signature:', error);
    return '';
  }
};

/**
 * Initialize PayFast payment - simplified version
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
  
  // Build PayFast data with ONLY required fields
  const pfData: Record<string, string> = {
    // Required merchant details
    merchant_id: config.merchant_id,
    merchant_key: config.merchant_key,
    
    // Required URLs - simplified return URL with order ID
    return_url: `${PAYFAST_CONFIG.siteUrl}/checkout/success?order_id=${orderId}&from=payfast`,
    cancel_url: `${PAYFAST_CONFIG.siteUrl}/checkout?cancelled=true`,
    
    // Required customer details
    name_first: formData?.firstName || customerName.split(' ')[0] || '',
    name_last: formData?.lastName || customerName.split(' ').slice(1).join(' ') || '',
    email_address: customerEmail,
    
    // Required transaction details
    m_payment_id: orderId,
    amount: formattedAmount,
    item_name: itemName.substring(0, 100)
  };
  
  // Add optional phone if provided
  if (formData?.phone) {
    const digitsOnly = formData.phone.replace(/\D/g, '');
    if (digitsOnly.length >= 10) {
      pfData.cell_number = digitsOnly.substring(0, 10);
    }
  }
  
  // Generate signature
  const signature = generateSignature(pfData, config.passphrase || '');
  pfData.signature = signature;
  
  console.log('PayFast initialized (simplified):', {
    environment: PAYFAST_CONFIG.useSandbox ? 'SANDBOX' : 'PRODUCTION',
    orderId,
    amount: formattedAmount
  });
  
  return {
    formAction,
    formData: pfData
  };
};

/**
 * Submit PayFast form
 */
export const submitPayfastForm = (formAction: string, formData: Record<string, string>) => {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = formAction;
  form.acceptCharset = 'UTF-8';
  form.style.display = 'none';
  
  Object.entries(formData).forEach(([key, value]) => {
    if (value !== '' && value !== undefined && value !== null) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value.toString();
      form.appendChild(input);
    }
  });
  
  document.body.appendChild(form);
  form.submit();
};
