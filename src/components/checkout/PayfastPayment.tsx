// ================================================
// IMPROVED PAYFAST PAYMENT COMPONENT
// Better formatted order descriptions
// ================================================

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

  // Format product name for better display
  const formatProductName = (name: string): string => {
    // Remove excessive caps and clean up
    return name
      .split(' ')
      .map(word => {
        // Keep acronyms in caps (2-4 letter words)
        if (word.length >= 2 && word.length <= 4 && word === word.toUpperCase()) {
          return word;
        }
        // Capitalize first letter of other words
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  };

  // Create a clean order description
  const createOrderDescription = (items: any[]): string => {
    if (items.length === 0) return 'Order';
    
    if (items.length === 1) {
      const item = items[0];
      const name = formatProductName(item.product?.name || 'Item');
      return `${name} (${item.quantity}x)`.substring(0, 100);
    }
    
    if (items.length <= 3) {
      // Show all items if 3 or fewer
      return items
        .map(item => {
          const name = formatProductName(item.product?.name || 'Item');
          return `${name} (${item.quantity}x)`;
        })
        .join(', ')
        .substring(0, 100);
    }
    
    // For many items, show count
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    return `${totalItems} items from Ikhaya Homeware`.substring(0, 100);
  };

  const handlePayment = async () => {
    setIsProcessing(true);
    
    try {
      // Generate order ID with better format
      const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const random = Math.random().toString(36).substr(2, 6).toUpperCase();
      const orderId = `IKH${timestamp}-${random}`;
      
      const totalAmount = cartTotal + deliveryFee;
      
      // Create clean item description
      const itemName = createOrderDescription(cartItems);
      
      console.log('Processing PayFast payment:', {
        orderId,
        amount: totalAmount,
        customer: `${formData.firstName} ${formData.lastName}`,
        itemDescription: itemName,
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
      
      // Get PayFast form data
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
      
      // Submit form
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
        {/* Order Summary with Better Formatting */}
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

        {/* Payment Button */}
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
              Pay Now - R {(cartTotal + deliveryFee).toFixed(2)}
            </>
          )}
        </Button>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="w-4 h-4" />
          <span>Secured by PayFast | PCI DSS Compliant</span>
        </div>
      </CardContent>
    </Card>
  );
};

// ================================================
// IMPROVED PAYFAST INITIALIZATION
// Better order formatting
// ================================================

export const initializePayfastPayment = (
  orderId: string,
  customerName: string,
  customerEmail: string,
  amount: number,
  itemName: string,
  formData?: FormData
) => {
  const config = getCurrentPayfastConfig();
  const formAction = config.host;
  const formattedAmount = amount.toFixed(2);
  
  // Build PayFast data with better descriptions
  const pfData: Record<string, string> = {
    // Merchant details
    merchant_id: config.merchant_id,
    merchant_key: config.merchant_key,
    
    // URLs
    return_url: `${PAYFAST_CONFIG.siteUrl}/checkout/success`,
    cancel_url: `${PAYFAST_CONFIG.siteUrl}/checkout?cancelled=true`,
    notify_url: `https://kauostzhxqoxggwqgtym.supabase.co/functions/v1/payfast-webhook`,
    
    // Customer details
    name_first: formData?.firstName || customerName.split(' ')[0] || '',
    name_last: formData?.lastName || customerName.split(' ').slice(1).join(' ') || '',
    email_address: customerEmail,
    
    // Transaction details with better formatting
    m_payment_id: orderId,
    amount: formattedAmount,
    item_name: itemName, // This will now be better formatted
    item_description: `Ikhaya Homeware Order ${orderId}`
  };
  
  // Add phone if provided
  if (formData?.phone) {
    const digitsOnly = formData.phone.replace(/\D/g, '');
    if (digitsOnly.length >= 10) {
      pfData.cell_number = digitsOnly.substring(0, 10);
    }
  }
  
  console.log('PayFast payment initialized:', {
    environment: PAYFAST_CONFIG.useSandbox ? 'SANDBOX' : 'PRODUCTION',
    orderId,
    amount: formattedAmount,
    merchantId: config.merchant_id,
    itemDescription: itemName
  });
  
  return {
    formAction,
    formData: pfData
  };
};