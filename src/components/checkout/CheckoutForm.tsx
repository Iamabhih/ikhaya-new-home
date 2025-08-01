
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCart } from "@/hooks/useCart";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useDeliveryFee } from "@/hooks/useDeliveryFee";
import { PayfastPayment } from "./PayfastPayment";

interface CheckoutFormProps {
  user: any | null;
  onComplete: (data: any) => void;
}

export const CheckoutForm = ({ user, onComplete }: CheckoutFormProps) => {
  const { items, clearCart, total: cartTotal } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState('billing'); // billing, payment, success
  const [orderId, setOrderId] = useState<string | null>(null);
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

  const { deliveryFee, deliveryZone } = useDeliveryFee(cartTotal);

  const handleBillingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      // Validate form data but don't create order yet - only proceed to payment
      if (!formData.email || !formData.firstName || !formData.lastName || 
          !formData.address || !formData.city || !formData.province || !formData.postalCode) {
        throw new Error("Please fill in all required fields");
      }

      // Generate a temporary order ID for payment processing
      const tempOrderId = `TEMP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      setOrderId(tempOrderId);
      setCurrentStep('payment');
      toast.success("Billing details saved! Please complete payment.");

    } catch (error) {
      console.error('Form validation error:', error);
      toast.error(error instanceof Error ? error.message : "Please fill in all required fields.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (currentStep === 'payment' && orderId) {
    return (
      <PayfastPayment
        orderData={{
          orderId,
          amount: cartTotal + deliveryFee,
          customerEmail: formData.email,
          customerName: `${formData.firstName} ${formData.lastName}`,
          customerPhone: formData.phone,
          items: items.map(item => ({
            name: item.product.name,
            description: item.product.short_description || '',
            quantity: item.quantity,
            amount: item.product.price * item.quantity
          }))
        }}
        formData={formData}
        cartItems={items}
        cartTotal={cartTotal}
        deliveryFee={deliveryFee}
        user={user}
      />
    );
  }

  if (currentStep === 'success') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Payment Successful!</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Your order has been processed successfully. You will receive a confirmation email shortly.</p>
        </CardContent>
      </Card>
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
              {isProcessing ? "Creating Order..." : "Continue to Payment"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
