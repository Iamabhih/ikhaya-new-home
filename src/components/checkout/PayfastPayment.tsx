import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CreditCard, ShieldCheck } from "lucide-react";
import { initializePayfastPayment } from "@/utils/payment/payfast";
import { PAYFAST_CONFIG } from "@/utils/payment/constants";

interface PayfastPaymentProps {
  orderData?: {
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
  selectedDeliveryZone?: string;
  user?: any | null;
}

export const PayfastPayment = ({ 
  orderData,
  formData, 
  cartItems, 
  cartTotal, 
  deliveryFee,
  selectedDeliveryZone,
  user
}: PayfastPaymentProps) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    setIsProcessing(true);
    
    try {
      // Generate order ID (use orderData if provided, otherwise generate new)
      const orderId = orderData?.orderId || Math.floor(Math.random() * 1000000).toString();
      const totalAmount = orderData?.amount || (cartTotal + deliveryFee);
      
      // Create cart summary
      const cartSummary = cartItems.map(item => 
        `${item.product?.name || item.product_name || 'Product'}${item.size ? ` (${item.size})` : ''} x ${item.quantity}`
      ).join(", ");
      
      console.log('Processing PayFast payment:', {
        orderId,
        amount: totalAmount,
        environment: PAYFAST_CONFIG.useSandbox ? 'SANDBOX' : 'PRODUCTION'
      });
      
      // Get PayFast form data
      const { formAction, formData: payfastFormData } = initializePayfastPayment(
        orderId,
        `${formData.firstName} ${formData.lastName}`,
        formData.email,
        totalAmount,
        cartSummary,
        formData
      );
      
      // Create and submit form
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = formAction;
      form.target = '_top';
      form.acceptCharset = 'UTF-8';
      form.style.display = 'none';
      
      // Add all parameters as input fields
      Object.entries(payfastFormData).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value).trim() !== '') {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = String(value);
          form.appendChild(input);
        }
      });
      
      // Append form to body
      document.body.appendChild(form);
      
      // Show user feedback
      toast.info('Redirecting to PayFast payment gateway...');
      
      // Submit form after short delay
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
      }, 500);
      
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error('Failed to initiate payment. Please try again.');
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
              <span>Subtotal:</span>
              <span>R {cartTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery:</span>
              <span>R {deliveryFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Total:</span>
              <span className="text-lg">R {(cartTotal + deliveryFee).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {PAYFAST_CONFIG.useSandbox && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800 font-medium">
              ⚠️ Test Mode - No real payments will be processed
            </p>
          </div>
        )}

        <Button
          onClick={handlePayment}
          disabled={isProcessing}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Redirecting to PayFast...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Pay Now with PayFast
            </>
          )}
        </Button>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="w-4 h-4" />
          <span>Secured by PayFast</span>
        </div>
      </CardContent>
    </Card>
  );
};