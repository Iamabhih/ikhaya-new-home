import { md5 } from 'js-md5';
import { PAYFAST_CONFIG, getCurrentPayfastConfig } from './constants';

export interface FormData {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

/**
 * Generate PayFast signature exactly as PayFast expects
 * CRITICAL: Do NOT sort alphabetically - use natural order as per PayFast docs
 */
export const generateSignature = (data: Record<string, string>, passPhrase: string): string => {
  try {
    // Build parameter string in natural order (NOT alphabetical)
    let pfOutput = '';
    for (const key in data) {
      if (key !== 'signature' && data[key] !== undefined && data[key] !== null && data[key] !== '') {
        pfOutput += `${key}=${encodeURIComponent(data[key].trim()).replace(/%20/g, '+')}&`;
      }
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
  
  // Build PayFast data in the EXACT order as per PayFast documentation
  // Order matters for signature generation - do NOT reorder these fields
  const pfData: Record<string, string> = {
    // Merchant details (MUST be first)
    merchant_id: config.merchant_id,
    merchant_key: config.merchant_key,
    
    // Return/Cancel/Notify URLs
    return_url: `${baseUrl}/checkout/success`,
    cancel_url: `${baseUrl}/checkout`,
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
  
  // Add optional phone number if provided
  if (formData?.phone) {
    pfData.cell_number = formData.phone;
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