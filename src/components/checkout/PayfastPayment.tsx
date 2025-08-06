import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CreditCard, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PAYFAST_CONFIG } from "@/utils/payment/constants";

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

export const PayfastPayment = ({ 
  formData, 
  cartItems, 
  cartTotal, 
  deliveryFee 
}: PayfastPaymentProps) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    setIsProcessing(true);
    
    try {
      // Generate order ID
      const orderId = Math.floor(Math.random() * 1000000).toString();
      const totalAmount = cartTotal + deliveryFee;
      
      console.log('Processing PayFast payment for order:', orderId);
      console.log('Total amount: R', totalAmount.toFixed(2));
      console.log('Environment:', PAYFAST_CONFIG.useSandbox ? 'SANDBOX' : 'PRODUCTION');
      
      // Call the Supabase Edge Function to create PayFast payment session
      const { data, error } = await supabase.functions.invoke('payfast-payment', {
        body: {
          orderId,
          amount: totalAmount,
          customerEmail: formData.email,
          customerName: `${formData.firstName} ${formData.lastName}`,
          customerPhone: formData.phone || '',
          items: cartItems.map(item => ({
            name: item.product?.name || item.product_name || 'Product',
            description: item.size || '',
            quantity: item.quantity,
            amount: item.product?.price || item.price || 0
          }))
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to initialize payment');
      }

      if (data?.success && data?.redirectUrl) {
        console.log('Got PayFast redirect URL:', data.redirectUrl);
        toast.success('Redirecting to PayFast payment gateway...');
        
        // Small delay for user to see the message
        setTimeout(() => {
          window.location.href = data.redirectUrl;
        }, 1000);
      } else {
        console.error('Invalid response from payment API:', data);
        throw new Error(data?.error || 'Failed to get payment URL from PayFast');
      }
      
    } catch (error: any) {
      console.error('Payment error:', error);
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
              <span>Subtotal:</span>
              <span>R {cartTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery:</span>
              <span>R {deliveryFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Total Amount:</span>
              <span className="text-lg">R {(cartTotal + deliveryFee).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            You will be securely redirected to PayFast to complete your payment
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4" />
            <span>Secured by PayFast - South Africa's leading payment gateway</span>
          </div>
        </div>

        {PAYFAST_CONFIG.useSandbox && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800 font-medium">
              ⚠️ Test Mode Active - No real payments will be processed
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
              Processing Payment...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Pay Now with PayFast
            </>
          )}
        </Button>

        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <span>Accepts:</span>
            <span className="font-medium">VISA</span>
            <span>•</span>
            <span className="font-medium">MasterCard</span>
            <span>•</span>
            <span className="font-medium">Instant EFT</span>
            <span>•</span>
            <span className="font-medium">Bank EFT</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};