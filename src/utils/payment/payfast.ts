// src/utils/payment/payfast.ts

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
  const config = getCurrentPayfastConfig();
  
  const formAction = PAYFAST_CONFIG.useSandbox
    ? 'https://sandbox.payfast.co.za/eng/process'
    : 'https://www.payfast.co.za/eng/process';
  
  const formattedAmount = amount.toFixed(2);
  
  // Use the consistent domain from constants
  const baseUrl = PAYFAST_CONFIG.https://ikhayahomeware.online; // This will be 'https://ikhayahomeware.online'
    
  const merchantData = {
    merchant_id: config.merchant_id,
    merchant_key: config.merchant_key,
    return_url: `${baseUrl}/checkout/success`,
    cancel_url: `${baseUrl}/checkout`,
    notify_url: `https://kauostzhxqoxggwqgtym.supabase.co/functions/v1/payfast-webhook`,
  };
  
  // Rest of the function remains the same...
  const customerData = {
    name_first: formData?.firstName || customerName.split(' ')[0] || '',
    name_last: formData?.lastName || customerName.split(' ').slice(1).join(' ') || '',
    email_address: customerEmail,
    cell_number: formData?.phone || ''
  };
  
  const transactionData = {
    m_payment_id: orderId,
    amount: formattedAmount,
    item_name: itemName.substring(0, 100),
    item_description: `Order #${orderId}`,
    custom_str1: orderId
  };
  
  const pfData = {
    ...merchantData,
    ...transactionData,
    ...customerData
  };
  
  const signature = generateSignature(
    pfData as Record<string, string>, 
    config.passphrase || ''
  );
  
  const pfDataWithSignature = {
    ...pfData,
    signature: signature
  };
  
  console.log("PayFast Data:", JSON.stringify(pfDataWithSignature, null, 2));
  
  return {
    formAction,
    formData: pfDataWithSignature
  };
};