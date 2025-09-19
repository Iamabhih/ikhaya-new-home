import { FormData, DeliveryOption } from '@/types/checkout';
import { CartItem } from '@/contexts/CartContext';
import { getPayFastConfig } from '@/utils/payment/PayFastConfig';
import { toast } from 'sonner';

export interface BankDetails {
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  branchCode: string;
  accountType: string;
}

export interface PaymentResult {
  success: boolean;
  orderId?: string;
  error?: string;
  bankDetails?: BankDetails; // Added bankDetails property
  redirectUrl?: string;
}

export interface ProcessPaymentParams {
  paymentMethod: string;
  formData: FormData;
  cartItems: CartItem[];
  deliveryOption: DeliveryOption;
  totalAmount: number;
}

/**
 * Process PayFast payment (simplified direct form submission)
 */
export const processPayfastPayment = async (
  { formData, cartItems, totalAmount, orderId }: ProcessPaymentParams & { orderId: string }
): Promise<PaymentResult> => {
  console.log('Processing PayFast payment for order:', orderId);
  
  try {
    const config = getPayFastConfig();
    const returnUrls = config.getReturnUrls();
    
    // Create simple cart summary
    const cartSummary = cartItems
      .map(item => `${item.product?.name || 'Product'} x${item.quantity}`)
      .join(', ')
      .substring(0, 100);
    
    // Prepare PayFast form data
    const payfastFormData = {
      merchant_id: config.MERCHANT_ID,
      merchant_key: config.MERCHANT_KEY,
      return_url: returnUrls.return_url,
      cancel_url: returnUrls.cancel_url,
      notify_url: returnUrls.notify_url,
      amount: totalAmount.toFixed(2),
      item_name: `Ikhaya Order ${orderId}`,
      item_description: cartSummary,
      m_payment_id: orderId,
      name_first: formData.firstName || '',
      name_last: formData.lastName || '',
      email_address: formData.email || ''
    };
    
    return {
      success: true,
      orderId,
      redirectUrl: config.IS_TEST_MODE ? config.SANDBOX_URL : config.PRODUCTION_URL
    };
  } catch (error) {
    console.error('PayFast payment error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment failed'
    };
  }
};

/**
 * Process EFT payment
 */
export const processEftPayment = async (orderId: string): Promise<PaymentResult> => {
  try {
    console.log('Processing EFT payment for order:', orderId);
    
    // Bank details for Ikhaya Homeware
    const bankDetails: BankDetails = {
      bankName: 'Standard Bank',
      accountHolder: 'Ikhaya Homeware',
      accountNumber: '123456789', // Replace with actual
      branchCode: '051001', // Replace with actual
      accountType: 'Current'
    };
    
    toast.success('EFT payment instructions will be sent to your email.');
    
    return {
      success: true,
      orderId,
      bankDetails
    };
  } catch (error) {
    console.error('Error in EFT payment processing:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process EFT payment'
    };
  }
};

/**
 * Main payment processor
 */
export const processPayment = async ({
  paymentMethod,
  formData,
  cartItems,
  deliveryOption,
  totalAmount
}: ProcessPaymentParams): Promise<PaymentResult> => {
  const orderId = Math.floor(Math.random() * 1000000).toString();
  
  console.log(`Processing ${paymentMethod} payment for amount: R${totalAmount.toFixed(2)}`);
  
  switch (paymentMethod) {
    case 'payfast':
      return processPayfastPayment({ 
        paymentMethod, 
        formData, 
        cartItems, 
        deliveryOption, 
        totalAmount, 
        orderId 
      });
      
    case 'eft':
      return processEftPayment(orderId);
      
    default:
      toast.error('Invalid payment method selected');
      return {
        success: false,
        error: 'Invalid payment method'
      };
  }
};