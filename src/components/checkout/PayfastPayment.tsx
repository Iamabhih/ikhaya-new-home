import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CreditCard } from "lucide-react";
import { initializePayfastPayment } from "@/utils/payment/payfast";

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
      // Generate order ID
      const orderId = Math.floor(Math.random() * 1000000).toString();
      const totalAmount = cartTotal + deliveryFee;
      
      // Create cart summary for PayFast
      const cartSummary = cartItems.map(item => 
        `${item.product?.name || item.product_name || 'Product'}${item.size ? ` (${item.size})` : ''} x ${item.quantity}`
      ).join(", ");
      
      console.log('Processing PayFast payment for order:', orderId);
      console.log('Total amount:', totalAmount);
      console.log('Cart summary:', cartSummary);
      
      // Initialize PayFast payment
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
      
      // Create and submit form directly
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = formAction;
      form.target = '_top'; // Ensure form targets the whole window
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
      
      // Submit form after delay
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