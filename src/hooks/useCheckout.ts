import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/hooks/useCart';
import { useCheckoutForm } from '@/hooks/useCheckoutForm';
import { useCheckoutOptions } from '@/hooks/useCheckoutOptions';
import { FormData, DeliveryOption, PaymentMethod } from '@/types/checkout';
import { processPayment } from '@/services/paymentService';
import { getPayFastConfig } from '@/utils/payment/PayFastConfig';
import { toast } from 'sonner';

export function useCheckout() {
    const { cartItems, clearCart } = useCart();
    const { formData, formErrors, handleChange, validateForm } = useCheckoutForm();
    const { 
        deliveryOptions, 
        selectedDeliveryOption, 
        setSelectedDeliveryOption,
        paymentMethods, 
        selectedPaymentMethod, 
        setSelectedPaymentMethod 
    } = useCheckoutOptions();
    
    const [processing, setProcessing] = useState(false);
    const [orderId, setOrderId] = useState<string | null>(null);
    const [bankDetails, setBankDetails] = useState(null);
    const [showBankDetails, setShowBankDetails] = useState(false);
    
    const navigate = useNavigate();
    
    // Calculate cart total
    const subtotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    
    // Apply free delivery for orders over R400
    const deliveryFee = selectedDeliveryOption ? 
        (subtotal >= 400 ? 0 : selectedDeliveryOption.price) : 0;
    
    const totalAmount = subtotal + deliveryFee;
    
    // Map selectedDeliveryOption and selectedPaymentMethod to user-friendly versions
    const selectedDelivery = selectedDeliveryOption ? selectedDeliveryOption.id : '';
    const selectedPayment = selectedPaymentMethod || '';

    // Complete order function
    const completeOrder = () => {
        clearCart();
        navigate('/order-success');
    };

    // Complete bank transfer function
    const completeBankTransfer = () => {
        setShowBankDetails(false);
        completeOrder();
    };

    const handlePayment = async (
        formData: FormData,
        paymentMethod: PaymentMethod,
        deliveryOption: DeliveryOption
    ) => {
        if (cartItems.length === 0) {
            toast.error('Your cart is empty. Please add items before checkout.');
            return undefined;
        }

        try {
            setProcessing(true);
            console.log('Starting payment process...');

            if (paymentMethod.id === 'payfast') {
                // Generate order ID
                const tempOrderId = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                setOrderId(tempOrderId);
                
                // Create cart summary
                const cartSummary = cartItems.map(item => 
                    `${item.product.name} x${item.quantity}`
                ).join(", ");
                
                const config = getPayFastConfig();
                const returnUrls = config.getReturnUrls();
                
                // Prepare PayFast form data (simplified approach)
                const payfastFormData = {
                    merchant_id: config.MERCHANT_ID,
                    merchant_key: config.MERCHANT_KEY,
                    return_url: returnUrls.return_url,
                    cancel_url: returnUrls.cancel_url,
                    notify_url: returnUrls.notify_url,
                    amount: totalAmount.toFixed(2),
                    item_name: `OZZ Order ${tempOrderId}`,
                    item_description: cartSummary.substring(0, 100),
                    m_payment_id: tempOrderId,
                    name_first: formData.firstName || '',
                    name_last: formData.lastName || '',
                    email_address: formData.email || ''
                };

                // Return form data for PayFastForm component
                return {
                    redirect: true,
                    formData: payfastFormData,
                    isTestMode: config.IS_TEST_MODE
                };
            } else if (paymentMethod.id === 'eft') {
                // Handle EFT logic (show bank details etc.)
                const result = await processPayment({
                    paymentMethod: paymentMethod.id,
                    formData,
                    cartItems,
                    deliveryOption,
                    totalAmount
                });

                if (result.bankDetails) {
                    setBankDetails(result.bankDetails);
                    setShowBankDetails(true);
                } else {
                    completeOrder();
                }
                return undefined;
            } else {
                // Handle other payment methods (e.g., COD)
                completeOrder();
                return undefined;
            }

        } catch (error) {
            console.error('Payment error:', error);
            toast.error('There was an error processing your payment. Please try again.');
            return undefined;
        } finally {
            setProcessing(false);
        }
    };

    // Here we handle the form submission (RnR-Live style)
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error('Please complete all required fields');
            return undefined;
        }

        if (!selectedDeliveryOption || !selectedPaymentMethod) {
            toast.error('Please select delivery and payment options');
            return undefined;
        }

        // Get the selected payment method object
        const paymentMethodObj = paymentMethods.find(m => m.id === (typeof selectedPaymentMethod === 'string' ? selectedPaymentMethod : selectedPaymentMethod.id));
        
        if (!paymentMethodObj) {
            toast.error('Invalid payment method selected');
            return undefined;
        }

        const paymentResult = await handlePayment(formData, paymentMethodObj, selectedDeliveryOption);

        if (paymentResult?.redirect) {
            // PayFast form data is ready for PayFastForm component
            toast.info('Preparing PayFast payment...');
            return paymentResult;
        }
        return undefined;
    };

    return {
        formData,
        formErrors,
        handleChange,
        selectedPaymentMethod,
        setSelectedPaymentMethod,
        paymentMethods,
        selectedDeliveryOption,
        selectedDelivery,
        selectedPayment,
        setSelectedDelivery: (id: string) => {
            const option = deliveryOptions.find(opt => opt.id === id);
            if (option) setSelectedDeliveryOption(option);
        },
        setSelectedPayment: setSelectedPaymentMethod,
        currentDelivery: selectedDeliveryOption,
        deliveryOptions,
        subtotal,
        deliveryFee,
        totalAmount,
        processing,
        isSubmitting: processing,
        handleSubmit,
        handlePayment,
        bankDetails,
        showBankDetails,
        setShowBankDetails,
        completeBankTransfer
    };
}
