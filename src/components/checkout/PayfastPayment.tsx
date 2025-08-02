import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CreditCard, ExternalLink } from "lucide-react";

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
  const [showManualRedirect, setShowManualRedirect] = useState(false);
  const [payfastUrl, setPayfastUrl] = useState<string>('');
  const [paymentData, setPaymentData] = useState<Record<string, string>>({});

  const handlePayment = async () => {
    setIsProcessing(true);
    setShowManualRedirect(false);
    
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
      
      console.log('🔄 Calling PayFast payment with order data:', {
        ...paymentOrderData,
        customerEmail: paymentOrderData.customerEmail.substring(0, 3) + '***'
      });
      
      const { data, error } = await supabase.functions.invoke('payfast-payment', {
        body: paymentOrderData,
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      console.log('✅ PayFast function response:', { success: data?.success, hasUrl: !!data?.payfast_url });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw new Error(error.message || 'Payment service error');
      }

      if (data?.success) {
        console.log('🎯 Payment initiation successful, attempting redirect...');
        
        // Store PayFast data for fallback
        setPayfastUrl(data.payfast_url);
        setPaymentData(data.payment_data);
        
        // Detect environment
        const isLovablePreview = window.location.hostname.includes('lovableproject.com');
        console.log('🌍 Environment:', isLovablePreview ? 'Lovable Preview' : 'Production');
        
        if (isLovablePreview) {
          // In Lovable preview, show manual redirect immediately
          console.log('📱 Lovable preview detected - showing manual redirect');
          setShowManualRedirect(true);
          setIsProcessing(false);
          return;
        }

        // Try automatic form submission with timeout
        console.log('🚀 Attempting automatic form submission...');
        const success = await attemptFormSubmission(data.payfast_url, data.payment_data);
        
        if (!success) {
          console.log('⚠️ Form submission failed - showing manual redirect');
          setShowManualRedirect(true);
        }
      } else {
        throw new Error(data?.error || 'Failed to initiate payment');
      }
    } catch (error: any) {
      console.error('💥 Payment error:', error);
      const errorMessage = error.message || 'Failed to initiate payment. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const attemptFormSubmission = (url: string, paymentData: Record<string, string>): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        console.log('📝 Creating form for PayFast submission...');
        console.log('🎯 PayFast URL:', url);
        console.log('📋 Payment data keys:', Object.keys(paymentData));
        
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = url;
        form.style.display = 'none';
        form.target = '_self';
        form.acceptCharset = 'UTF-8';
        form.enctype = 'application/x-www-form-urlencoded';

        // Add all PayFast parameters
        Object.entries(paymentData).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = String(value);
            form.appendChild(input);
            console.log(`🔹 Added field: ${key} = ${key === 'signature' ? '***' : value}`);
          }
        });

        document.body.appendChild(form);
        console.log('📋 Form created and appended to DOM with', form.elements.length, 'fields');
        
        // Set timeout to detect if submission freezes
        const timeout = setTimeout(() => {
          console.log('⏰ Form submission timeout - likely blocked by browser security');
          try {
            if (document.body.contains(form)) {
              document.body.removeChild(form);
            }
          } catch (e) {
            console.log('Form cleanup error:', e);
          }
          resolve(false);
        }, 2000);
        
        // Try to submit the form immediately
        console.log('🎯 Submitting form to PayFast...');
        try {
          form.submit();
          console.log('✅ Form submission initiated');
          // Clear timeout and resolve true - form submitted successfully
          clearTimeout(timeout);
          resolve(true);
        } catch (error) {
          console.log('❌ Form submission error:', error);
          clearTimeout(timeout);
          try {
            if (document.body.contains(form)) {
              document.body.removeChild(form);
            }
          } catch (e) {
            console.log('Form cleanup error:', e);
          }
          resolve(false);
        }
        
      } catch (error) {
        console.log('🚫 Form creation error:', error);
        resolve(false);
      }
    });
  };

  const handleManualRedirect = () => {
    if (!payfastUrl || !paymentData) {
      toast.error('Payment data not available. Please try again.');
      return;
    }

    console.log('🔗 Opening PayFast in new tab...');
    
    // Create form for new tab
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = payfastUrl;
    form.target = '_blank';
    form.style.display = 'none';

    Object.entries(paymentData).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value as string;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
    
    toast.success('PayFast payment page opened in new tab');
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

        {showManualRedirect && (
          <div className="border border-warning/20 bg-warning/5 p-4 rounded-lg space-y-3">
            <div className="text-center">
              <p className="text-sm font-medium text-warning-foreground">
                Automatic redirect blocked
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Click below to continue to PayFast in a new tab
              </p>
            </div>
            <Button
              onClick={handleManualRedirect}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Continue to PayFast
            </Button>
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