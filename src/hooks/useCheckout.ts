import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/hooks/useCart';
import { useCheckoutForm } from '@/hooks/useCheckoutForm';
import { useCheckoutOptions } from '@/hooks/useCheckoutOptions';
import { FormData, DeliveryOption, PaymentMethod } from '@/types/checkout';
import { processPayment } from '@/services/paymentService';
import { initializePayfastPayment, submitPayfastForm } from '@/utils/payment/payfast';
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
            return;
        }

        try {
            setProcessing(true);
            console.log('Starting payment process...');

            if (paymentMethod.id === 'payfast') {
                // Generate order ID (like RnR-Live)
                const tempOrderId = Math.floor(Math.random() * 1000000).toString();
                setOrderId(tempOrderId);
                
                // Create cart summary
                const cartSummary = cartItems.map(item => 
                    `${item.product.name} x${item.quantity}`
                ).join(", ");
                
                // Call initializePayfastPayment to get the form details (like RnR-Live)
                const paymentDetails = initializePayfastPayment(
                    tempOrderId,
                    `${formData.firstName} ${formData.lastName}`,
                    formData.email,
                    totalAmount,
                    cartSummary,
                    formData
                );

                console.log('PayFast Form Action:', paymentDetails.formAction);
                console.log('PayFast Form Data:', paymentDetails.formData);

                // Return these details so the frontend can submit the form
                return {
                    redirect: true,
                    formAction: paymentDetails.formAction,
                    formData: paymentDetails.formData,
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
            } else {
                // Handle other payment methods (e.g., COD)
                completeOrder();
            }

        } catch (error) {
            console.error('Payment error:', error);
            toast.error('There was an error processing your payment. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    // Here we handle the form submission (RnR-Live style)
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error('Please complete all required fields');
            return;
        }

        if (!selectedDeliveryOption || !selectedPaymentMethod) {
            toast.error('Please select delivery and payment options');
            return;
        }

        // Get the selected payment method object
        const paymentMethodObj = paymentMethods.find(m => m.id === (typeof selectedPaymentMethod === 'string' ? selectedPaymentMethod : selectedPaymentMethod.id));
        
        if (!paymentMethodObj) {
            toast.error('Invalid payment method selected');
            return;
        }

        const paymentResult = await handlePayment(formData, paymentMethodObj, selectedDeliveryOption);

        if (paymentResult?.redirect) {
            // Submit using shared helper to ensure consistency
            submitPayfastForm(paymentResult.formAction, paymentResult.formData);

            // Show feedback to user
            toast.info('Redirecting to PayFast payment gateway...');
        }
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
