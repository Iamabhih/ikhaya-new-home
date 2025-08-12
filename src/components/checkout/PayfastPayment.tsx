import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CreditCard, ShieldCheck, AlertCircle } from "lucide-react";
import { initializePayfastPayment, submitPayfastForm } from "@/utils/payment/payfast";
import { PAYFAST_CONFIG } from "@/utils/payment/constants";

interface PayfastPaymentProps {
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
  user?: any | null;
}

export const PayfastPayment = ({ 
  formData, 
  cartItems, 
  cartTotal, 
  deliveryFee,
  user
}: PayfastPaymentProps) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    setIsProcessing(true);
    
    try {
      // Generate order ID
      const orderId = `IKH-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const totalAmount = cartTotal + deliveryFee;
      
      // Create item name
      const itemName = cartItems
        .map(item => `${item.product?.name || 'Item'} x${item.quantity}`)
        .join(', ')
        .substring(0, 100);
      
      console.log('Processing PayFast payment:', {
        orderId,
        amount: totalAmount,
        customer: `${formData.firstName} ${formData.lastName}`,
        environment: PAYFAST_CONFIG.useSandbox ? 'SANDBOX' : 'PRODUCTION'
      });
      
      // Store order data for success page
      const orderData = {
        orderId,
        formData,
        cartItems,
        cartTotal,
        deliveryFee,
        totalAmount,
        userId: user?.id,
        timestamp: new Date().toISOString()
      };
      sessionStorage.setItem(`pending_order_${orderId}`, JSON.stringify(orderData));
      
      // Get PayFast form data (NO SIGNATURE)
      const paymentDetails = initializePayfastPayment(
        orderId,
        `${formData.firstName} ${formData.lastName}`,
        formData.email,
        totalAmount,
        itemName,
        {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone
        }
      );
      
      // Show user feedback
      toast.info('Redirecting to PayFast secure payment...');
      
      // Submit form (PayFast will handle signature)
      setTimeout(() => {
        submitPayfastForm(paymentDetails.formAction, paymentDetails.formData);
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
            <div className="flex justify-between font-bold pt-2 border-t">
              <span>Total:</span>
              <span className="text-lg">R {(cartTotal + deliveryFee).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {PAYFAST_CONFIG.useSandbox && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">Test Mode Active</p>
                <p className="text-amber-700 mt-1">
                  Use test card: 4000 0000 0000 0002, CVV: 123
                </p>
              </div>
            </div>
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
          <span>Secured by PayFast | PCI DSS Compliant</span>
        </div>
      </CardContent>
    </Card>
  );
};