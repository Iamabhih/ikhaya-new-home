import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PayFastForm from "./PayFastForm";
import { getPayFastConfig, generatePaymentReference } from "@/utils/payment/PayFastConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, AlertCircle } from "lucide-react";

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

  // Get current config
  const config = getPayFastConfig();

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
    return `${totalItems} items from Ikhaya Homeware`.substring(0, 100);
  };

  const handlePayment = async () => {
    if (!cartItems.length) return;

    setIsProcessing(true);
    
    try {
      const paymentReference = generatePaymentReference();
      const returnUrls = config.getReturnUrls();
      const totalAmount = cartTotal + deliveryFee;
      
      console.log('Creating payment with config:', {
        merchant_id: config.MERCHANT_ID,
        amount: totalAmount,
        reference: paymentReference,
        test_mode: config.IS_TEST_MODE
      });

      // Create pending order record first
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

      if (pendingOrderError) {
        console.error('Pending order creation error:', pendingOrderError);
        toast.error("Failed to initialize payment. Please try again.");
        setIsProcessing(false);
        return;
      }

      // Store order reference for success page
      sessionStorage.setItem('currentOrderRef', paymentReference);

      // Prepare PayFast form data
      const payfastData = {
        merchant_id: config.MERCHANT_ID,
        merchant_key: config.MERCHANT_KEY,
        return_url: returnUrls.return_url,
        cancel_url: returnUrls.cancel_url,
        notify_url: returnUrls.notify_url,
        amount: totalAmount.toFixed(2),
        item_name: createOrderDescription(cartItems),
        item_description: `Order ${paymentReference} from Ikhaya Homeware`,
        m_payment_id: paymentReference,
        name_first: formData.firstName || '',
        name_last: formData.lastName || '',
        email_address: formData.email || ''
      };

      console.log('PayFast form data prepared:', {
        ...payfastData,
        merchant_key: '[HIDDEN]' // Don't log sensitive data
      });

      setPayFastFormData(payfastData);
      setShowPayFastForm(true);
      
    } catch (error) {
      console.error('PayFast error:', error);
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
