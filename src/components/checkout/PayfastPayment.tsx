import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PayFastForm from "./PayFastForm";
import { getPayFastConfig, generatePaymentReference } from "@/utils/payment/PayFastConfig";
import { generatePayFastSignature, validatePayFastData } from "@/utils/payment/payfastSignature";
import { usePayFastSettings } from "@/hooks/usePayFastSettings";
import { usePaymentLogger } from "@/hooks/usePaymentLogger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, AlertCircle, Loader2 } from "lucide-react";

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
  const [showPayFastForm, setShowPayFastForm] = useState(false);
  const [payFastFormData, setPayFastFormData] = useState<any>(null);

  // Fetch PayFast settings from database
  const payFastSettings = usePayFastSettings();
  
  // Payment logger for tracking all payment events
  const { 
    logPaymentInitiated, 
    logPendingOrderCreated, 
    logPendingOrderFailed, 
    logFormPrepared,
    logClientError 
  } = usePaymentLogger();
  
  // Get config using database settings
  const config = getPayFastConfig({
    merchantId: payFastSettings.merchantId,
    merchantKey: payFastSettings.merchantKey,
    passphrase: payFastSettings.passphrase,
    isTestMode: payFastSettings.isTestMode
  });

  // Format product name for better display
  const formatProductName = (name: string): string => {
    return name
      .split(' ')
      .map(word => {
        if (word.length >= 2 && word.length <= 4 && word === word.toUpperCase()) {
          return word;
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  };

  // Create order description
  const createOrderDescription = (items: any[]): string => {
    if (items.length === 0) return 'Order';
    
    if (items.length === 1) {
      const item = items[0];
      const name = formatProductName(item.product?.name || 'Item');
      return `${name} (${item.quantity}x)`.substring(0, 100);
    }
    
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    return `${totalItems} items from OZZ Cash & Carry`.substring(0, 100);
  };

  const handlePayment = async () => {
    if (!cartItems.length) return;

    const startTime = Date.now();
    console.log('[PayfastPayment] Starting payment process:', { startTime });
    setIsProcessing(true);
    
    try {
      const paymentReference = generatePaymentReference();
      const returnUrls = config.getReturnUrls();
      const totalAmount = cartTotal + deliveryFee;
      
      // Log payment initiation
      await logPaymentInitiated({
        orderNumber: paymentReference,
        amount: totalAmount,
        userId: user?.id,
        email: formData.email,
        cartItems: cartItems.length,
        testMode: config.IS_TEST_MODE
      });
      
      console.log('[PayfastPayment] Payment config prepared:', {
        merchant_id: config.MERCHANT_ID,
        amount: totalAmount,
        reference: paymentReference,
        test_mode: config.IS_TEST_MODE,
        timing: Date.now() - startTime
      });

      // Create pending order record first
      const dbStartTime = Date.now();
      const { error: pendingOrderError } = await supabase
        .from('pending_orders')
        .insert({
          order_number: paymentReference,
          user_id: user?.id || null,
          cart_data: {
            items: cartItems,
            total: cartTotal
          },
          form_data: formData,
          delivery_data: {
            fee: deliveryFee,
            method: 'standard'
          },
          total_amount: totalAmount
        });

      console.log('[PayfastPayment] DB operation completed:', { duration: Date.now() - dbStartTime });

      if (pendingOrderError) {
        console.error('Pending order creation error:', pendingOrderError);
        
        // Log pending order failure
        await logPendingOrderFailed({
          orderNumber: paymentReference,
          amount: totalAmount,
          userId: user?.id,
          email: formData.email
        }, pendingOrderError.message);
        
        toast.error("Failed to initialize payment. Please try again.");
        setIsProcessing(false);
        return;
      }

      // Log pending order created
      await logPendingOrderCreated({
        orderNumber: paymentReference,
        amount: totalAmount,
        userId: user?.id,
        email: formData.email,
        cartItems: cartItems.length
      });

      // Store order reference for success page
      sessionStorage.setItem('currentOrderRef', paymentReference);

      // Prepare PayFast form data (without signature first)
      const payfastData = {
        merchant_id: config.MERCHANT_ID,
        merchant_key: config.MERCHANT_KEY,
        return_url: returnUrls.return_url,
        cancel_url: returnUrls.cancel_url,
        notify_url: returnUrls.notify_url,
        amount: totalAmount.toFixed(2),
        item_name: createOrderDescription(cartItems),
        item_description: `Order ${paymentReference} from OZZ Cash & Carry`,
        m_payment_id: paymentReference,
        name_first: formData.firstName || '',
        name_last: formData.lastName || '',
        email_address: formData.email || ''
      };

      // Validate form data
      if (!validatePayFastData(payfastData)) {
        throw new Error('Invalid PayFast form data');
      }

      // Generate signature using passphrase from settings
      const signature = generatePayFastSignature(payfastData, payFastSettings.passphrase || '');

      // Add signature to form data
      const payfastDataWithSignature = {
        ...payfastData,
        signature
      };

      console.log('[PayfastPayment] PayFast form data prepared:', {
        ...payfastDataWithSignature,
        merchant_key: '[HIDDEN]',
        signature: signature.substring(0, 8) + '...',
        totalDuration: Date.now() - startTime
      });

      // Log form prepared
      await logFormPrepared({
        orderNumber: paymentReference,
        amount: totalAmount,
        returnUrl: returnUrls.return_url,
        cancelUrl: returnUrls.cancel_url
      });

      setPayFastFormData(payfastDataWithSignature);
      setShowPayFastForm(true);
      
      console.log('[PayfastPayment] Payment process completed:', { 
        totalDuration: Date.now() - startTime,
        showForm: true 
      });
      
    } catch (error) {
      console.error('PayFast error:', error);
      
      // Log client error
      await logClientError({
        userId: user?.id,
        email: formData.email,
        cartItems: cartItems.length,
        amount: cartTotal + deliveryFee
      }, error instanceof Error ? error.message : 'Unknown error');
      
      toast.error("Payment initialization failed. Please try again.");
      setIsProcessing(false);
    }
  };

  if (showPayFastForm && payFastFormData) {
    return (
      <PayFastForm 
        formData={payFastFormData}
        isTestMode={config.IS_TEST_MODE}
        onSubmit={() => {
          toast.success("Redirecting to PayFast...");
          setIsProcessing(false);
        }}
      />
    );
  }

  // Show loading state while fetching settings
  if (payFastSettings.isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Loading payment settings...</span>
        </CardContent>
      </Card>
    );
  }

  // Show error if PayFast is not configured or not enabled
  if (payFastSettings.error || !payFastSettings.isEnabled || !config.MERCHANT_ID || !config.MERCHANT_KEY) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            Payment Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-sm text-destructive">
              {payFastSettings.error || 'PayFast payment is currently unavailable. Please contact support or try again later.'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          PayFast Secure Payment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Order Summary */}
        <div className="bg-secondary/10 p-4 rounded-lg">
          <h4 className="font-medium mb-3">Order Summary</h4>
          
          {/* Show individual items */}
          <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
            {cartItems.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {formatProductName(item.product?.name || 'Item')} x{item.quantity}
                </span>
                <span>R {(item.product?.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          
          {/* Totals */}
          <div className="border-t pt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>R {cartTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery:</span>
              <span>R {deliveryFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold pt-2 border-t text-base">
              <span>Total:</span>
              <span className="text-lg">R {(cartTotal + deliveryFee).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Test Mode Warning */}
        {config.IS_TEST_MODE && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">Test Mode Active</p>
                <p className="text-amber-700 mt-1">
                  This is a test transaction. No real payment will be processed.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Button */}
        <Button
          onClick={handlePayment}
          disabled={isProcessing}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            "Processing..."
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Pay R {(cartTotal + deliveryFee).toFixed(2)} with PayFast
            </>
          )}
        </Button>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>🔒 Secured by PayFast | PCI DSS Compliant</span>
        </div>
        
        {/* Debug info in test mode */}
        {config.IS_TEST_MODE && (
          <div className="text-xs text-muted-foreground p-2 bg-gray-50 rounded">
            <p><strong>Debug Info:</strong></p>
            <p>Merchant ID: {config.MERCHANT_ID}</p>
            <p>API URL: {config.IS_TEST_MODE ? config.SANDBOX_URL : config.PRODUCTION_URL}</p>
            <p>Test Mode: {config.IS_TEST_MODE ? 'Yes' : 'No'}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
