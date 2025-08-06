import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CreditCard } from "lucide-react";
import { initializePayfastPayment } from "@/utils/payment/payfast";

// Extend window object to include PayFast function
declare global {
  interface Window {
    payfast_do_onsite_payment?: (params: { uuid: string; return_url?: string; cancel_url?: string }, callback?: (result: boolean) => void) => void;
  }
}

interface PayfastPaymentProps {
  orderData: {
    orderId: string;
    amount: number;
    customerEmail: string;
    customerName: string;
    customerPhone: string;
    items: Array<{
      name: string;
      description?: string;
      quantity: number;
      amount: number;
    }>;
  };
  formData: {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    address: string;
    city: string;
    postalCode: string;
    province: string;
  };
  cartItems: any[];
  cartTotal: number;
  deliveryFee: number;
  selectedDeliveryZone: string;
  user: any | null;
}

export const PayfastPayment = ({ orderData, formData, cartItems, cartTotal, deliveryFee, selectedDeliveryZone, user }: PayfastPaymentProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [payfastScriptLoaded, setPayfastScriptLoaded] = useState(false);

  // Load PayFast onsite script
  useEffect(() => {
    const loadPayfastScript = () => {
      if (window.payfast_do_onsite_payment) {
        setPayfastScriptLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://www.payfast.co.za/onsite/engine.js';
      script.async = true;
      script.onload = () => {
        console.log('PayFast onsite script loaded');
        setPayfastScriptLoaded(true);
      };
      script.onerror = () => {
        console.error('Failed to load PayFast onsite script');
        toast.error('Failed to load payment script. Please refresh and try again.');
      };
      document.head.appendChild(script);
    };

    loadPayfastScript();
  }, []);

  const handlePayment = async () => {
    if (!payfastScriptLoaded) {
      toast.error('Payment system is still loading. Please wait a moment and try again.');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Generate order ID like RnR-Live
      const orderId = Math.floor(Math.random() * 1000000).toString();
      const totalAmount = cartTotal + deliveryFee;
      
      // Create cart summary for PayFast
      const cartSummary = cartItems.map(item => 
        `${item.product?.name || item.product_name || 'Product'}${item.size ? ` (${item.size})` : ''} x ${item.quantity}`
      ).join(", ");
      
      console.log('Processing PayFast payment for order:', orderId);
      console.log('Total amount:', totalAmount);
      console.log('Cart summary:', cartSummary);
      
      // Use the exact RnR-Live approach
      const { formAction, formData: payfastFormData } = initializePayfastPayment(
        orderId,
        `${formData.firstName} ${formData.lastName}`,
        formData.email,
        totalAmount,
        cartSummary,
        formData
      );
      
      console.log('PayFast form action:', formAction);
      console.log('PayFast form data:', payfastFormData);
      
      // Create and submit form directly (exactly like RnR-Live)
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
      
      // Show user feedback
      toast.info('Redirecting to PayFast payment gateway...');
      
      // Submit form after delay (like RnR-Live)
      setTimeout(() => {
        try {
          form.submit();
          console.log('PayFast form submitted successfully');
        } catch (submitError) {
          console.error('Error submitting form:', submitError);
          toast.error('Failed to redirect to payment gateway. Please try again.');
          document.body.removeChild(form);
          setIsProcessing(false);
        }
      }, 800);
      
    } catch (error: any) {
      console.error('💥 Payment error:', error);
      const errorMessage = error.message || 'Failed to initiate payment. Please try again.';
      toast.error(errorMessage);
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          PayFast Secure Payment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-secondary/10 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Payment Summary</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Amount:</span>
              <span className="font-medium">R {(cartTotal + deliveryFee).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Email:</span>
              <span>{formData.email}</span>
            </div>
          </div>
        </div>

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            You will be redirected to PayFast to complete your payment
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>🔒</span>
            <span>Secured by PayFast - South Africa's leading payment gateway</span>
          </div>
        </div>

        <Button
          onClick={handlePayment}
          disabled={isProcessing || !payfastScriptLoaded}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Redirecting to PayFast...
            </>
          ) : !payfastScriptLoaded ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading Payment System...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Pay with PayFast
            </>
          )}
        </Button>

        {!payfastScriptLoaded && (
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Loading secure payment system...
            </p>
          </div>
        )}

        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <span>Accepts:</span>
            <span className="font-medium">VISA</span>
            <span>•</span>
            <span className="font-medium">MasterCard</span>
            <span>•</span>
            <span className="font-medium">EFT</span>
            <span>•</span>
            <span className="font-medium">Instant EFT</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};