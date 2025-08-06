// Import js-md5
import { md5 } from 'js-md5';
import { PAYFAST_CONFIG, getCurrentPayfastConfig } from './constants';

// Define the FormData interface
export interface FormData {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

/**
 * Generate a PayFast payment signature
 */
export const generateSignature = (data: Record<string, string>, passPhrase: string): string => {
  try {
    // Create a string of all values in the payment data
    let pfOutput = '';
    for (const key of Object.keys(data).sort()) {
      if (key !== 'signature' && data[key] !== '') {
        pfOutput += `${key}=${encodeURIComponent(data[key].trim()).replace(/%20/g, '+')}&`;
      }
    }
    // Remove last ampersand
    pfOutput = pfOutput.slice(0, -1);
    // Add passphrase if it exists
    if (passPhrase !== '') {
      pfOutput += `&passphrase=${encodeURIComponent(passPhrase.trim()).replace(/%20/g, '+')}`;
    }
    // Use md5 directly without accessing a default property
    return md5(pfOutput);
  } catch (error) {
    console.error('Error generating PayFast signature:', error);
    return '';
  }
};

// Export for backward compatibility - used in OrderSuccess.tsx
export const calculatePayfastSignature = generateSignature;

/**
 * Initialize PayFast payment with required signature (RnR-Live style)
 */
export const initializePayfastPayment = (
  orderId: string,
  customerName: string,
  customerEmail: string,
  amount: number,
  itemName: string,
  formData?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  }
) => {
  // Get current PayFast config based on environment
  const config = getCurrentPayfastConfig();
  
  // Set base URL for PayFast API based on sandbox mode
  const formAction = PAYFAST_CONFIG.useSandbox
    ? 'https://sandbox.payfast.co.za/eng/process'
    : 'https://www.payfast.co.za/eng/process';
  
  // Format the amount to 2 decimal places
  const formattedAmount = amount.toFixed(2);
  
  // Create merchant details with Ikhaya domain
  const baseUrl = 'https://ikhayahomeware.online';
    
  const merchantData = {
    merchant_id: config.merchant_id,
    merchant_key: config.merchant_key,
    return_url: `${baseUrl}/checkout/success`,
    cancel_url: `${baseUrl}/checkout`,
    notify_url: `https://kauostzhxqoxggwqgtym.supabase.co/functions/v1/payfast-webhook`,
  };
  
  // Create customer details
  const customerData = {
    name_first: formData?.firstName || customerName.split(' ')[0] || '',
    name_last: formData?.lastName || customerName.split(' ').slice(1).join(' ') || '',
    email_address: customerEmail,
    cell_number: formData?.phone || ''
  };
  
  // Create transaction details
  const transactionData = {
    m_payment_id: orderId,
    amount: formattedAmount,
    item_name: itemName.substring(0, 100), // PayFast limits to 100 chars
    item_description: `Order #${orderId}`,
    custom_str1: orderId
  };
  
  // Combine all data
  const pfData = {
    ...merchantData,
    ...transactionData,
    ...customerData
  };
  
  // Generate signature
  const signature = generateSignature(
    pfData as Record<string, string>, 
    config.passphrase || ''
  );
  
  // Add signature to the payment data
  const pfDataWithSignature = {
    ...pfData,
    signature: signature
  };
  
  // Log the complete data object with signature
  console.log("PayFast Data:", JSON.stringify(pfDataWithSignature, null, 2));
  
  // Return data needed for form submission including signature
  return {
    formAction,
    formData: pfDataWithSignature
  };
};