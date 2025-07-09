
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCart } from "@/hooks/useCart";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PaymentMethods } from "./PaymentMethods";
import { PaymentSuccess } from "./PaymentSuccess";

interface CheckoutFormProps {
  user: any;
  onComplete: (data: any) => void;
}

export const CheckoutForm = ({ user, onComplete }: CheckoutFormProps) => {
  const { items, clearCart } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState('billing'); // billing, payment, success
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [paymentResult, setPaymentResult] = useState(null);
  const [formData, setFormData] = useState({
    email: user?.email || "",
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    province: "",
  });

  const handleBillingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentStep('payment');
  };

  const handlePaymentMethodSelect = async (method: string) => {
    // Prevent multiple submissions
    if (isProcessing) return;
    
    setSelectedPaymentMethod(method);
    
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setIsProcessing(true);
    
    try {
      // Transform cart items for the payment function
      const paymentItems = items.map(item => ({
        productId: item.product_id,
        name: item.product?.name || `Product ${item.product_id}`,
        description: item.product?.short_description || item.product?.name || "",
        price: item.product?.price || 0,
        quantity: item.quantity,
        sku: item.product?.sku || item.product_id,
      }));

      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          items: paymentItems,
          customerInfo: formData,
          shippingAddress: formData,
          paymentMethod: method,
        },
      });

      if (error) throw error;

      setPaymentResult(data);
      
      // Don't clear cart here - wait for payment confirmation
      
      // Handle different payment method responses
      if (method === 'payfast') {
        // Redirect to PayFast
        if (data.url && data.formData) {
          // Create and submit form for PayFast - ensure single submission
          const existingForm = document.querySelector('form[action*="payfast"]');
          if (existingForm) {
            existingForm.remove();
          }
          
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = data.url;
          form.style.display = 'none';
          
          Object.keys(data.formData).forEach(key => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = data.formData[key];
            form.appendChild(input);
          });
          
          document.body.appendChild(form);
          form.submit();
          return;
        }
      } else if (method === 'payflex') {
        // Redirect to PayFlex
        if (data.url && data.paymentData) {
          // For PayFlex, we'd typically make an API call to create a checkout session
          // For now, redirect with payment data
          const queryParams = new URLSearchParams({
            orderId: data.orderId,
            amount: data.amount.toString(),
            orderNumber: data.orderNumber
          });
          window.location.href = `${data.url}?${queryParams.toString()}`;
          return;
        }
      } else if (method === 'bank_transfer' || method === 'eft') {
        // Don't clear cart for manual payment methods
        setCurrentStep('success');
        toast.success("Order created! Banking details provided for payment.");
      } else if (method === 'cod') {
        // Clear cart only for COD as it's immediately confirmed
        clearCart();
        setCurrentStep('success');
        toast.success("Order confirmed! Payment will be collected on delivery.");
      } else {
        setCurrentStep('success');
        toast.success("Order created successfully!");
      }
      
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to process checkout. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (currentStep === 'success' && paymentResult) {
    return <PaymentSuccess paymentResult={paymentResult} />;
  }

  if (currentStep === 'payment') {
    return (
      <PaymentMethods
        onSelect={handlePaymentMethodSelect}
        onBack={() => setCurrentStep('billing')}
      />
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-lg sm:text-xl">Shipping & Billing Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        <form onSubmit={handleBillingSubmit} className="space-y-4 sm:space-y-6">
          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-foreground border-b pb-2">
              Contact Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your@email.com"
                  required
                  disabled={!!user?.email}
                  className="mt-1 h-10 sm:h-11"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  Phone Number *
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+27 12 345 6789"
                  required
                  className="mt-1 h-10 sm:h-11"
                />
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-foreground border-b pb-2">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label htmlFor="firstName" className="text-sm font-medium">
                  First Name *
                </Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="John"
                  required
                  className="mt-1 h-10 sm:h-11"
                />
              </div>
              <div>
                <Label htmlFor="lastName" className="text-sm font-medium">
                  Last Name *
                </Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Doe"
                  required
                  className="mt-1 h-10 sm:h-11"
                />
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-foreground border-b pb-2">
              Shipping Address
            </h3>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <Label htmlFor="address" className="text-sm font-medium">
                  Street Address *
                </Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Main Street"
                  required
                  className="mt-1 h-10 sm:h-11"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="city" className="text-sm font-medium">
                    City *
                  </Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Cape Town"
                    required
                    className="mt-1 h-10 sm:h-11"
                  />
                </div>
                <div>
                  <Label htmlFor="province" className="text-sm font-medium">
                    Province *
                  </Label>
                  <Input
                    id="province"
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    placeholder="Western Cape"
                    required
                    className="mt-1 h-10 sm:h-11"
                  />
                </div>
                <div>
                  <Label htmlFor="postalCode" className="text-sm font-medium">
                    Postal Code *
                  </Label>
                  <Input
                    id="postalCode"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    placeholder="8001"
                    required
                    className="mt-1 h-10 sm:h-11"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 sm:pt-6">
            <Button 
              type="submit" 
              className="w-full h-11 sm:h-12 text-sm sm:text-base font-medium" 
              size="lg"
              disabled={isProcessing}
            >
              Continue to Payment
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
