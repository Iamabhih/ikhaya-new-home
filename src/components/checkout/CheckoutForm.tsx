
import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import { PayfastPayment } from "./PayfastPayment";
import { DeliveryOptions } from "./DeliveryOptions";
import { LiveShippingRates } from "./LiveShippingRates";
import { generateOrderId } from "@/utils/payment/PayFastConfig";
import { ShippingRate, DeliveryAddress } from "@/hooks/useShippingRates";
import { useShippingSettings } from "@/hooks/useShippingSettings";
import { useCart } from "@/hooks/useCart";

interface CheckoutFormProps {
  user: any | null;
  onComplete: (data: any) => void;
  selectedDeliveryZone: string;
  onDeliveryZoneChange: (zone: string) => void;
}

export const CheckoutForm = ({ user, onComplete, selectedDeliveryZone, onDeliveryZoneChange }: CheckoutFormProps) => {
  const { items, clearCart, total: cartTotal } = useCart();
  const { captureEmailForRecovery, trackCheckoutInitiated } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState('billing');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [emailCaptured, setEmailCaptured] = useState(false);
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

  // ShipLogic integration state
  const [selectedShippingRate, setSelectedShippingRate] = useState<ShippingRate | null>(null);
  const [useLiveRates, setUseLiveRates] = useState(true);
  const [liveRatesError, setLiveRatesError] = useState(false);
  
  const { settings: shippingSettings, isLoading: settingsLoading } = useShippingSettings();

  // Build delivery address for ShipLogic API
  const deliveryAddress: DeliveryAddress | null = useMemo(() => {
    if (!formData.address || !formData.city || !formData.province || !formData.postalCode) {
      return null;
    }
    return {
      street_address: formData.address,
      city: formData.city,
      zone: formData.province,
      country: 'ZA',
      code: formData.postalCode,
    };
  }, [formData.address, formData.city, formData.province, formData.postalCode]);

  // Check if ShipLogic is enabled
  const isShipLogicEnabled = shippingSettings?.is_enabled ?? false;

  // Handle email capture for abandoned cart recovery
  const handleEmailBlur = useCallback(() => {
    const email = formData.email.trim();
    if (email && email.includes('@') && !emailCaptured && items.length > 0) {
      captureEmailForRecovery(email);
      setEmailCaptured(true);
      console.log('[Cart Recovery] Email captured for recovery:', email);
    }
  }, [formData.email, emailCaptured, items.length, captureEmailForRecovery]);

  // Track checkout initiated when user reaches this form
  useEffect(() => {
    if (items.length > 0) {
      trackCheckoutInitiated();
    }
  }, []); // Only on mount

  // Calculate delivery fee based on selected option
  const deliveryFee = useMemo(() => {
    if (useLiveRates && selectedShippingRate) {
      return selectedShippingRate.rate;
    }
    return 0; // Will be calculated by DeliveryOptions via useDeliveryFee
  }, [useLiveRates, selectedShippingRate]);

  const handleShippingRateSelect = (rate: ShippingRate) => {
    setSelectedShippingRate(rate);
    setLiveRatesError(false);
  };

  const handleBillingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      // Validate form data
      if (!formData.email || !formData.firstName || !formData.lastName || 
          !formData.address || !formData.city || !formData.province || !formData.postalCode) {
        throw new Error("Please fill in all required fields");
      }

      // Validate shipping selection
      if (useLiveRates && isShipLogicEnabled) {
        if (!selectedShippingRate) {
          throw new Error("Please select a shipping option");
        }
      } else {
        if (!selectedDeliveryZone) {
          throw new Error("Please select a delivery option");
        }
      }

      // Generate order ID
      const tempOrderId = generateOrderId();
      setOrderId(tempOrderId);
      setCurrentStep('payment');
      toast.success("Details confirmed! Please complete payment.");

    } catch (error) {
      console.error('Form validation error:', error);
      toast.error(error instanceof Error ? error.message : "Please fill in all required fields.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle fallback to static delivery options
  const handleLiveRatesError = () => {
    setLiveRatesError(true);
    setUseLiveRates(false);
  };

  if (currentStep === 'payment' && orderId) {
    // Determine final delivery fee
    const finalDeliveryFee = useLiveRates && selectedShippingRate 
      ? selectedShippingRate.rate 
      : deliveryFee;

    return (
      <PayfastPayment
        formData={formData}
        cartItems={items}
        cartTotal={cartTotal}
        deliveryFee={finalDeliveryFee}
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
      <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
        <form onSubmit={handleBillingSubmit} className="space-y-5 sm:space-y-6">
          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-foreground border-b pb-2">
              Contact Information
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  onBlur={handleEmailBlur}
                  placeholder="your@email.com"
                  required
                  disabled={!!user?.email}
                  className="mt-1.5 h-11 sm:h-12"
                />
              </div>
              <div>
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
                  className="mt-1.5 h-11 sm:h-12"
                />
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-foreground border-b pb-2">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  className="mt-1.5 h-11 sm:h-12"
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
                  className="mt-1.5 h-11 sm:h-12"
                />
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-foreground border-b pb-2">
              Shipping Address
            </h3>
            <div className="space-y-4">
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
                  className="mt-1.5 h-11 sm:h-12"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    className="mt-1.5 h-11 sm:h-12"
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
                    className="mt-1.5 h-11 sm:h-12"
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
                    className="mt-1.5 h-11 sm:h-12"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Shipping Options - ShipLogic or Static */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-foreground border-b pb-2">
              Shipping Options
            </h3>
            
            {isShipLogicEnabled && useLiveRates && !liveRatesError ? (
              <LiveShippingRates
                deliveryAddress={deliveryAddress}
                selectedRate={selectedShippingRate}
                onRateSelect={handleShippingRateSelect}
              />
            ) : (
              <DeliveryOptions
                subtotal={cartTotal}
                selectedZone={selectedDeliveryZone}
                onZoneChange={onDeliveryZoneChange}
              />
            )}
            
            {/* Option to switch between live and static rates */}
            {isShipLogicEnabled && liveRatesError && (
              <div className="text-sm text-muted-foreground mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setLiveRatesError(false);
                    setUseLiveRates(true);
                  }}
                  className="text-primary hover:underline"
                >
                  Try live shipping rates again
                </button>
              </div>
            )}
          </div>

          <div className="pt-6">
            <Button
              type="submit" 
              className="w-full h-12 sm:h-13 text-base font-medium touch-target" 
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
