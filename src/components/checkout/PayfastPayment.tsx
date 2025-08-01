import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CreditCard } from "lucide-react";

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
}

export const PayfastPayment = ({ orderData }: PayfastPaymentProps) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    setIsProcessing(true);
    
    try {
      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error('Authentication required. Please sign in.');
      }
      
      if (!session) {
        throw new Error('You must be signed in to make a payment.');
      }
      
      console.log('Calling PayFast payment with order data:', {
        ...orderData,
        customerEmail: orderData.customerEmail.substring(0, 3) + '***' // Partially hide email in logs
      });
      
      const { data, error } = await supabase.functions.invoke('payfast-payment', {
        body: orderData,
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      console.log('PayFast function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Payment service error');
      }

      if (data?.success) {
        console.log('Payment initiation successful, redirecting to PayFast...');
        // Create form and submit to PayFast
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.payfast_url;
        form.style.display = 'none';

        // Add all PayFast parameters as hidden inputs
        Object.entries(data.payment_data).forEach(([key, value]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = value as string;
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
      } else {
        throw new Error(data?.error || 'Failed to initiate payment');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      const errorMessage = error.message || 'Failed to initiate payment. Please try again.';
      toast.error(errorMessage);
    } finally {
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
              <span>Order:</span>
              <span>{orderData.orderId}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount:</span>
              <span className="font-medium">R {orderData.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Email:</span>
              <span>{orderData.customerEmail}</span>
            </div>
          </div>
        </div>

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            You will be redirected to PayFast's secure payment page
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>🔒</span>
            <span>Secured by PayFast - South Africa's leading payment gateway</span>
          </div>
        </div>

        <Button
          onClick={handlePayment}
          disabled={isProcessing}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Pay with PayFast
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
            <span className="font-medium">EFT</span>
            <span>•</span>
            <span className="font-medium">Instant EFT</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};