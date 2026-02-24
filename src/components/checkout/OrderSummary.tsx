import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDeliveryFee } from "@/hooks/useDeliveryFee";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DiscountCodeInput, DiscountInfo } from "./DiscountCodeInput";
import { ShippingRate } from "@/hooks/useShippingRates";

interface OrderSummaryProps {
  items: any[];
  total: number;
  selectedDeliveryZone?: string;
  selectedShippingRate?: ShippingRate | null;
  appliedDiscount?: DiscountInfo | null;
  onDiscountApplied?: (discount: DiscountInfo | null) => void;
}

export const OrderSummary = ({ 
  items, 
  total, 
  selectedDeliveryZone,
  selectedShippingRate,
  appliedDiscount,
  onDiscountApplied
}: OrderSummaryProps) => {
  const { deliveryFee: staticDeliveryFee, isFreeDelivery, deliveryZone, amountForFreeDelivery } = useDeliveryFee(total, selectedDeliveryZone);
  
  // Use ShipLogic rate if available, otherwise use static delivery fee
  const deliveryFee = selectedShippingRate?.rate ?? staticDeliveryFee;
  const shippingLabel = selectedShippingRate 
    ? (selectedShippingRate.service_level_name || selectedShippingRate.service_level || 'Shipping')
    : deliveryZone?.name;
  
  // Calculate discount
  let discountAmount = 0;
  let effectiveDeliveryFee = deliveryFee;
  
  if (appliedDiscount) {
    if (appliedDiscount.type === 'percentage') {
      discountAmount = (total * appliedDiscount.value) / 100;
    } else if (appliedDiscount.type === 'fixed_amount') {
      discountAmount = Math.min(appliedDiscount.value, total);
    } else if (appliedDiscount.type === 'free_shipping') {
      effectiveDeliveryFee = 0;
    }
  }
  
  const finalTotal = total - discountAmount + effectiveDeliveryFee;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cart Items */}
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between">
              <div>
                <div className="font-medium text-sm">{item.product.name}</div>
                <div className="text-xs text-muted-foreground">Qty: {item.quantity}</div>
              </div>
              <div className="text-sm">R{(item.product.price * item.quantity).toFixed(2)}</div>
            </div>
          ))}
        </div>
        
        <Separator />

        {/* Discount Code Input */}
        {onDiscountApplied && (
          <>
            <DiscountCodeInput 
              subtotal={total}
              onDiscountApplied={onDiscountApplied}
              appliedDiscount={appliedDiscount || null}
            />
            <Separator />
          </>
        )}
        
        {/* Totals */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>R{total.toFixed(2)}</span>
          </div>
          
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm text-primary">
              <span>Discount</span>
              <span>-R{discountAmount.toFixed(2)}</span>
            </div>
          )}
          
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              <span>Delivery</span>
              {shippingLabel && (
                <Badge variant="outline" className="text-xs">
                  {shippingLabel}
                </Badge>
              )}
            </div>
            <div className="text-right">
              {(isFreeDelivery && !selectedShippingRate) || effectiveDeliveryFee === 0 ? (
                <span className="text-primary font-medium">Free</span>
              ) : (
                <span>R{effectiveDeliveryFee.toFixed(2)}</span>
              )}
            </div>
          </div>
          
          {amountForFreeDelivery > 0 && effectiveDeliveryFee > 0 && !selectedShippingRate && (
            <div className="text-xs text-muted-foreground">
              Add R{amountForFreeDelivery.toFixed(2)} more for free delivery
            </div>
          )}
          
          <Separator />
          
          <div className="flex justify-between font-semibold text-base sm:text-lg">
            <span>Total</span>
            <span>R{finalTotal.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
