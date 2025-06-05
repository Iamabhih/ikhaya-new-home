
import { useState } from "react";
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
      
      // Clear cart after successful order creation
      clearCart();
      
      // Handle different payment method responses
      if (method === 'bank_transfer' || method === 'eft') {
        setCurrentStep('success');
        toast.success("Order created! Banking details provided for payment.");
      } else if (method === 'cod') {
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
    <Card>
      <CardHeader>
        <CardTitle>Shipping & Billing Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleBillingSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={!!user?.email}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+27 12 345 6789"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Street Address *</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="123 Main Street"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="province">Province *</Label>
              <Input
                id="province"
                value={formData.province}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                placeholder="Gauteng"
                required
              />
            </div>
            <div>
              <Label htmlFor="postalCode">Postal Code *</Label>
              <Input
                id="postalCode"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                placeholder="0001"
                required
              />
            </div>
          </div>

          <div className="pt-4">
            <Button 
              type="submit" 
              className="w-full" 
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
