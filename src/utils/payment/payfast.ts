import { md5 } from 'js-md5';
import { PAYFAST_CONFIG, getCurrentPayfastConfig } from './constants';

export interface FormData {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

/**
 * Generate PayFast signature exactly as PayFast expects
 */
export const generateSignature = (data: Record<string, string>, passPhrase: string): string => {
  try {
    // Sort keys alphabetically
    const sortedKeys = Object.keys(data).sort();
    
    // Build parameter string
    let pfOutput = '';
    for (const key of sortedKeys) {
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
 * Initialize PayFast payment (RnR-Live style)
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
  
  // Build PayFast data in correct order
  const pfData: Record<string, string> = {};
  
  // Merchant details
  pfData.merchant_id = config.merchant_id;
  pfData.merchant_key = config.merchant_key;
  pfData.return_url = `${baseUrl}/checkout/success`;
  pfData.cancel_url = `${baseUrl}/checkout`;
  pfData.notify_url = `https://kauostzhxqoxggwqgtym.supabase.co/functions/v1/payfast-webhook`;
  
  // Customer details
  pfData.name_first = formData?.firstName || customerName.split(' ')[0] || '';
  pfData.name_last = formData?.lastName || customerName.split(' ').slice(1).join(' ') || '';
  pfData.email_address = customerEmail;
  
  if (formData?.phone) {
    pfData.cell_number = formData.phone;
  }
  
  // Transaction details
  pfData.m_payment_id = orderId;
  pfData.amount = formattedAmount;
  pfData.item_name = itemName.substring(0, 100);
  pfData.item_description = `Order #${orderId}`;
  
  // Generate signature
  const signature = generateSignature(pfData, config.passphrase || '');
  
  // Add signature to data
  const pfDataWithSignature = {
    ...pfData,
    signature: signature
  };
  
  console.log('PayFast payment data:', pfDataWithSignature);
  
  return {
    formAction,
    formData: pfDataWithSignature
  };
};