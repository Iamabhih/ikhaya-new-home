import { FormData, DeliveryOption } from '@/types/checkout';
import { CartItem } from '@/contexts/CartContext';
import { initializePayfastPayment } from '@/utils/payment/payfast';
import { PAYFAST_CONFIG } from '@/utils/payment/constants';
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
 * Process PayFast payment (direct form submission)
 */
export const processPayfastPayment = async (
  { formData, cartItems, totalAmount, orderId }: ProcessPaymentParams & { orderId: string }
): Promise<PaymentResult> => {
  console.log('Processing PayFast payment for order:', orderId);
  console.log(`Environment: ${PAYFAST_CONFIG.useSandbox ? 'SANDBOX' : 'PRODUCTION'}`);
  
  try {
    // Create cart summary - handle both 'size' property and without
    const cartSummary = cartItems.map(item => {
      const productName = item.product?.name || 'Product';
      const sizeInfo = (item as any).size ? ` (${(item as any).size})` : '';
      return `${productName}${sizeInfo} x${item.quantity}`;
    }).join(", ");
    
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
    form.target = '_blank';
    form.acceptCharset = 'UTF-8';
    form.style.display = 'none';
    
    // Add all parameters
    Object.entries(payfastFormData).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
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