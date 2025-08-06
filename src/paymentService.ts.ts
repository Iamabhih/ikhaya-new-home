import { FormData, DeliveryOption } from '@/types/checkout';
import { CartItem } from '@/contexts/CartContext';
import { initializePayfastPayment } from '@/utils/payment/payfast';
import { PAYFAST_CONFIG } from '@/utils/payment/constants';
import { toast } from 'sonner';

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
 * Process PayFast payment (RnR-Live style)
 */
export const processPayfastPayment = async (
  { formData, cartItems, totalAmount, orderId, paymentMethod, deliveryOption }: ProcessPaymentParams & { orderId: string }
): Promise<PaymentResult> => {
  console.log('Processing PayFast payment for order:', orderId);
  console.log(`Environment: ${PAYFAST_CONFIG.useSandbox ? 'SANDBOX' : 'PRODUCTION'}`);
  
  try {
    // Create a cart summary for PayFast
    const cartSummary = cartItems.map(item => 
      `${item.product?.name || 'Product'}${item.size ? ` (${item.size})` : ''} x${item.quantity}`
    ).join(", ");
    
    // Initialize PayFast payment data (exactly like RnR-Live)
    const { formAction, formData: payfastFormData } = initializePayfastPayment(
      orderId,
      `${formData.firstName} ${formData.lastName}`,
      formData.email,
      totalAmount,
      cartSummary,
      formData
    );
    
    // Log payment details for debugging
    console.log(`PayFast payment initialization:
      Order ID: ${orderId}
      Amount: R${totalAmount.toFixed(2)}
      Customer: ${formData.firstName} ${formData.lastName} (${formData.email})
      Delivery: ${deliveryOption.name}
      Payment URL: ${formAction}
      Merchant ID: ${payfastFormData.merchant_id}
      Sandbox Mode: ${PAYFAST_CONFIG.useSandbox ? 'Yes' : 'No'}
    `);
    
    // Create a form element for submission (exactly like RnR-Live)
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = formAction;
    form.target = '_top'; // Ensure form targets the whole window, not an iframe
    form.style.display = 'none';
    
    // Add all parameters as input fields
    Object.entries(payfastFormData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = String(value);
        form.appendChild(input);
      }
    });
    
    // Append the form to the body 
    document.body.appendChild(form);
    
    // Log a console message immediately before submission for debugging
    console.log('Submitting PayFast form with signature');
    console.log('Form data:', JSON.stringify(payfastFormData, null, 2));
    
    // Add a small delay to ensure logs are visible before redirect
    toast.info(PAYFAST_CONFIG.useSandbox 
      ? 'Redirecting to PayFast sandbox payment gateway...' 
      : 'Redirecting to PayFast payment gateway...');
    
    // Submit form - this will redirect the user to PayFast
    setTimeout(() => {
      try {
        form.submit();
        console.log('Form submitted successfully');
      } catch (submitError) {
        console.error('Error submitting form:', submitError);
        toast.error('Failed to redirect to payment gateway. Please try again.');
        // Remove the form if submission fails
        document.body.removeChild(form);
      }
    }, 800);
    
    return {
      success: true,
      orderId
    };
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
    
    // Mock bank details for Ikhaya Homeware
    const bankDetails = {
      bankName: 'Standard Bank',
      accountHolder: 'Ikhaya Homeware',
      accountNumber: '123456789',
      branchCode: '051001',
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
 * Process payment based on the selected payment method (RnR-Live style)
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
    // Generate a random order ID (like RnR-Live)
    const orderId = Math.floor(Math.random() * 1000000).toString();
    console.log(`Generated order ID: ${orderId}`);
    
    // Handle different payment methods
    console.log(`Processing payment with method: ${paymentMethod}`);
    
    switch (paymentMethod) {
      case 'payfast':
        console.log('Sending to PayFast payment processor');
        toast.info('Redirecting to payment gateway...');
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
        // For any other payment methods
        console.log(`Unsupported payment method: ${paymentMethod}, treating as successful`);
        toast.success('Order placed successfully!');
        return {
          success: true,
          orderId
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