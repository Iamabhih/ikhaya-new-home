import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Truck, Clock, MapPin } from "lucide-react";
import { useDeliveryFee } from "@/hooks/useDeliveryFee";

interface DeliveryZone {
  id: string;
  name: string;
  description: string;
  delivery_fee: number;
  free_delivery_threshold: number | null;
  min_order_value: number;
  estimated_days_min: number;
  estimated_days_max: number;
  is_active: boolean;
}

interface DeliveryOptionsProps {
  subtotal: number;
  selectedZone: string | undefined;
  onZoneChange: (zoneId: string) => void;
}

export const DeliveryOptions = ({ subtotal, selectedZone, onZoneChange }: DeliveryOptionsProps) => {
  const { deliveryZones, isLoading } = useDeliveryFee(subtotal);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Delivery Options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-secondary/20 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getDeliveryFee = (zone: DeliveryZone) => {
    // Check minimum order value
    if (subtotal < zone.min_order_value) {
      return { fee: zone.delivery_fee, eligible: false, reason: `Minimum order: R${zone.min_order_value}` };
    }
    
    // Check free delivery threshold
    if (zone.free_delivery_threshold && subtotal >= zone.free_delivery_threshold) {
      return { fee: 0, eligible: true, reason: 'Free delivery!' };
    }
    
    return { fee: zone.delivery_fee, eligible: true, reason: null };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="w-5 h-5" />
          Delivery Options
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={selectedZone}
          onValueChange={onZoneChange}
          className="space-y-3"
        >
          {deliveryZones.map((zone) => {
            const delivery = getDeliveryFee(zone);
            const isSelected = selectedZone === zone.id;
            
            return (
              <div
                key={zone.id}
                className={`relative rounded-lg border p-4 transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : delivery.eligible
                    ? 'border-border hover:border-primary/50 cursor-pointer'
                    : 'border-border/50 bg-secondary/20 cursor-not-allowed opacity-60'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <RadioGroupItem
                    value={zone.id}
                    id={zone.id}
                    disabled={!delivery.eligible}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-2">
                    <Label
                      htmlFor={zone.id}
                      className={`text-base font-medium ${
                        delivery.eligible ? 'cursor-pointer' : 'cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{zone.name}</span>
                        <div className="text-right">
                          {delivery.fee === 0 ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Free
                            </Badge>
                          ) : (
                            <span className="font-semibold">R{delivery.fee.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                    </Label>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>
                          {zone.estimated_days_min === zone.estimated_days_max
                            ? `${zone.estimated_days_min} day${zone.estimated_days_min > 1 ? 's' : ''}`
                            : `${zone.estimated_days_min}-${zone.estimated_days_max} days`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{zone.description}</span>
                      </div>
                    </div>
                    
                    {delivery.reason && (
                      <div className="text-sm">
                        {delivery.eligible ? (
                          <span className="text-green-600 font-medium">{delivery.reason}</span>
                        ) : (
                          <span className="text-amber-600 font-medium">{delivery.reason}</span>
                        )}
                      </div>
                    )}
                    
                    {zone.free_delivery_threshold && delivery.eligible && delivery.fee > 0 && (
                      <div className="text-sm text-muted-foreground">
                        Add R{(zone.free_delivery_threshold - subtotal).toFixed(2)} more for free delivery
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </RadioGroup>
        
        {deliveryZones.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Truck className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No delivery options available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};