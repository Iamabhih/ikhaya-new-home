import { FormData, DeliveryOption } from '@/types/checkout';
import { CartItem } from '@/contexts/CartContext';
import { PAYFAST_CONFIG } from '@/utils/payment/constants';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface PaymentResult {
  success: boolean;
  orderId?: string;
  redirectUrl?: string;
  bankDetails?: any;
  error?: string;
}

export interface ProcessPaymentParams {
  paymentMethod: string;
  formData: FormData;
  cartItems: CartItem[];
  deliveryOption: DeliveryOption;
  totalAmount: number;
}

/**
 * Process PayFast payment using the new API approach
 */
export const processPayfastPayment = async (
  { formData, cartItems, totalAmount, orderId, deliveryOption }: ProcessPaymentParams & { orderId: string }
): Promise<PaymentResult> => {
  console.log('Processing PayFast payment for order:', orderId);
  console.log(`Environment: ${PAYFAST_CONFIG.useSandbox ? 'SANDBOX' : 'PRODUCTION'}`);
  
  try {
    // Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('payfast-payment', {
      body: {
        orderId,
        amount: totalAmount,
        customerEmail: formData.email,
        customerName: `${formData.firstName} ${formData.lastName}`,
        customerPhone: formData.phone || '',
        items: cartItems.map(item => ({
          name: item.product?.name || 'Product',
          description: item.size || '',
          quantity: item.quantity,
          amount: item.product?.price || 0
        }))
      }
    });

    if (error) throw error;

    if (data?.success && data?.redirectUrl) {
      // Redirect to PayFast
      window.location.href = data.redirectUrl;
      return {
        success: true,
        orderId,
        redirectUrl: data.redirectUrl
      };
    } else {
      throw new Error(data?.error || 'Failed to initialize payment');
    }
  } catch (error) {
    console.error('Error in PayFast payment processing:', error);
    toast.error('There was an issue connecting to the payment gateway. Please try again.');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'PayFast payment processing failed'
    };
  }
};

/**
 * Process EFT payment
 */
export const processEftPayment = async (orderId: string): Promise<PaymentResult> => {
  try {
    console.log('Processing EFT payment for order:', orderId);
    
    // Your bank details for Ikhaya Homeware
    const bankDetails = {
      bankName: 'Standard Bank',
      accountHolder: 'Ikhaya Homeware',
      accountNumber: '123456789', // Replace with actual
      branchCode: '051001', // Replace with actual
      accountType: 'Current'
    };
    
    return {
      success: true,
      orderId,
      bankDetails
    };
  } catch (error) {
    console.error('Error in EFT payment processing:', error);
    toast.error('There was an issue retrieving bank details. Please try again.');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process EFT payment'
    };
  }
};

/**
 * Main payment processing function
 */
export const processPayment = async ({
  paymentMethod,
  formData,
  cartItems,
  deliveryOption,
  totalAmount
}: ProcessPaymentParams): Promise<PaymentResult> => {
  console.log(`Processing ${paymentMethod} payment for amount: R${totalAmount.toFixed(2)}`);
  console.log(`PayFast environment: ${PAYFAST_CONFIG.useSandbox ? 'SANDBOX' : 'PRODUCTION'}`);
  
  try {
    // Generate order ID
    const orderId = Math.floor(Math.random() * 1000000).toString();
    console.log(`Generated order ID: ${orderId}`);
    
    switch (paymentMethod) {
      case 'payfast':
        console.log('Processing PayFast payment');
        toast.info('Initializing secure payment...');
        return processPayfastPayment({ 
          paymentMethod, 
          formData, 
          cartItems, 
          deliveryOption, 
          totalAmount, 
          orderId 
        });
        
      case 'eft':
        console.log('Processing EFT payment');
        return processEftPayment(orderId);
        
      default:
        console.log(`Unsupported payment method: ${paymentMethod}`);
        toast.error('Selected payment method is not available');
        return {
          success: false,
          error: 'Payment method not supported'
        };
    }
  } catch (error) {
    console.error('Error in payment processing:', error);
    toast.error('Payment processing failed. Please try again.');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment processing failed'
    };
  }
};