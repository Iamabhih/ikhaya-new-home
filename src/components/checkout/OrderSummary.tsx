
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDeliveryFee } from "@/hooks/useDeliveryFee";
import { Badge } from "@/components/ui/badge";

interface OrderSummaryProps {
  items: any[];
  total: number;
  selectedDeliveryZone?: string;
}

export const OrderSummary = ({ items, total, selectedDeliveryZone }: OrderSummaryProps) => {
  const { deliveryFee, isFreeDelivery, deliveryZone, amountForFreeDelivery } = useDeliveryFee(total, selectedDeliveryZone);
  const finalTotal = total + deliveryFee;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between">
              <div>
                <div className="font-medium">{item.product.name}</div>
                <div className="text-sm text-muted-foreground">Qty: {item.quantity}</div>
              </div>
              <div>R{(item.product.price * item.quantity).toFixed(2)}</div>
            </div>
          ))}
          
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>R{total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span>Delivery</span>
                {deliveryZone && (
                  <Badge variant="outline" className="text-xs">
                    {deliveryZone.name}
                  </Badge>
                )}
              </div>
              <div className="text-right">
                {isFreeDelivery ? (
                  <span className="text-green-600 font-medium">Free</span>
                ) : (
                  <span>R{deliveryFee.toFixed(2)}</span>
                )}
              </div>
            </div>
            {amountForFreeDelivery > 0 && (
              <div className="text-sm text-muted-foreground">
                Add R{amountForFreeDelivery.toFixed(2)} more for free delivery
              </div>
            )}
            <div className="flex justify-between font-semibold text-lg border-t pt-2">
              <span>Total</span>
              <span>R{finalTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
