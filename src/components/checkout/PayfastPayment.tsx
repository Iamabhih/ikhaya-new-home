import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CreditCard } from "lucide-react";

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

    if (!window.payfast_do_onsite_payment) {
      toast.error('Payment system not available. Please refresh the page.');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Generate temporary order ID for PayFast tracking
      const tempOrderId = `TEMP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      // Store order data in sessionStorage for webhook processing
      const pendingOrderData = {
        tempOrderId,
        user_id: user?.id || null,
        email: formData.email,
        billing_address: {
          address: formData.address,
          city: formData.city,
          province: formData.province,
          postal_code: formData.postalCode
        },
        shipping_address: {
          address: formData.address,
          city: formData.city,
          province: formData.province,
          postal_code: formData.postalCode
        },
        subtotal: cartTotal,
        shipping_amount: deliveryFee,
        total_amount: cartTotal + deliveryFee,
        delivery_zone_id: selectedDeliveryZone,
        cartItems: cartItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.product.price,
          total_price: item.product.price * item.quantity,
          product_name: item.product.name,
          product_sku: item.product.sku
        }))
      };

      // Store pending order data for webhook processing
      sessionStorage.setItem(`pending_order_${tempOrderId}`, JSON.stringify(pendingOrderData));

      // Process payment with temporary order ID
      const paymentOrderData = {
        ...orderData,
        orderId: tempOrderId
      };

      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error('Authentication required. Please sign in.');
      }
      
      console.log('🔄 Calling PayFast onsite payment with order data:', {
        ...paymentOrderData,
        customerEmail: paymentOrderData.customerEmail.substring(0, 3) + '***'
      });
      
      const { data, error } = await supabase.functions.invoke('payfast-payment', {
        body: paymentOrderData,
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      console.log('✅ PayFast function response:', { success: data?.success, hasUuid: !!data?.uuid });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw new Error(error.message || 'Payment service error');
      }

      if (data?.success && data?.uuid) {
        console.log('🎯 PayFast UUID received, launching onsite payment...');
        
        // Use PayFast onsite payment with callback
        window.payfast_do_onsite_payment(
          {
            uuid: data.uuid,
            return_url: data.return_url,
            cancel_url: data.cancel_url
          },
          (result: boolean) => {
            console.log('PayFast onsite payment result:', result);
            if (result) {
              // Payment completed
              toast.success('Payment completed successfully!');
              // Redirect to success page
              window.location.href = data.return_url || '/checkout/success';
            } else {
              // Payment window closed or cancelled
              toast.error('Payment was cancelled or failed. Please try again.');
              setIsProcessing(false);
            }
          }
        );
      } else {
        throw new Error(data?.error || 'Failed to initiate payment');
      }
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
            Secure payment will open on this page - no redirects needed
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
              Processing...
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