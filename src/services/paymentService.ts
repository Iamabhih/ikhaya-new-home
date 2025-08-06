import { FormData, DeliveryOption } from '@/types/checkout';
import { CartItem } from '@/contexts/CartContext';
import { initializePayfastPayment } from '@/utils/payment/payfast';
import { PAYFAST_CONFIG } from '@/utils/payment/constants';
import { toast } from 'sonner';

export interface PaymentResult {
  success: boolean;
  orderId?: string;
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
 * Process PayFast payment (RnR-Live style - direct form submission)
 */
export const processPayfastPayment = async (
  { formData, cartItems, totalAmount, orderId }: ProcessPaymentParams & { orderId: string }
): Promise<PaymentResult> => {
  console.log('Processing PayFast payment for order:', orderId);
  console.log(`Environment: ${PAYFAST_CONFIG.useSandbox ? 'SANDBOX' : 'PRODUCTION'}`);
  
  try {
    // Create cart summary
    const cartSummary = cartItems.map(item => 
      `${item.product?.name || 'Product'}${item.size ? ` (${item.size})` : ''} x${item.quantity}`
    ).join(", ");
    
    // Get PayFast form data
    const { formAction, formData: payfastFormData } = initializePayfastPayment(
      orderId,
      `${formData.firstName} ${formData.lastName}`,
      formData.email,
      totalAmount,
      cartSummary,
      formData
    );
    
    // Create form element
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = formAction;
    form.target = '_top';
    form.style.display = 'none';
    
    // Add all parameters
    Object.entries(payfastFormData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = String(value);
        form.appendChild(input);
      }
    });
    
    // Append and submit
    document.body.appendChild(form);
    
    toast.info('Redirecting to PayFast...');
    
    setTimeout(() => {
      try {
        form.submit();
        // PayFast handles the redirect to payment.payfast.io
      } catch (error) {
        console.error('Form submission error:', error);
        document.body.removeChild(form);
        throw error;
      }
    }, 500);
    
    return {
      success: true,
      orderId
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
      // Handle EFT payment
      toast.success('EFT payment instructions will be sent to your email.');
      return {
        success: true,
        orderId
      };
      
    default:
      return {
        success: false,
        error: 'Invalid payment method'
      };
  }
};