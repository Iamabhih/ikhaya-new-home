import { useEffect } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Truck, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useShippingRates, ShippingRate, formatDeliveryEstimate, DeliveryAddress } from '@/hooks/useShippingRates';
import { cn } from '@/lib/utils';

interface LiveShippingRatesProps {
  deliveryAddress: DeliveryAddress | null;
  selectedRate: ShippingRate | null;
  onRateSelect: (rate: ShippingRate) => void;
  onRateChange?: (amount: number) => void;
}

export const LiveShippingRates = ({
  deliveryAddress,
  selectedRate,
  onRateSelect,
  onRateChange,
}: LiveShippingRatesProps) => {
  const { rates, isLoading, error, success, refetch } = useShippingRates(deliveryAddress);

  // Notify parent of rate change
  useEffect(() => {
    if (selectedRate && onRateChange) {
      onRateChange(selectedRate.rate);
    }
  }, [selectedRate, onRateChange]);

  // Auto-select first rate if none selected
  useEffect(() => {
    if (rates.length > 0 && !selectedRate) {
      onRateSelect(rates[0]);
    }
  }, [rates, selectedRate, onRateSelect]);

  if (!deliveryAddress?.street_address) {
    return (
      <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg">
        <p>Enter your delivery address to see available shipping options</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Fetching shipping rates...</span>
        </div>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4">
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
          <div className="space-y-2">
            <p className="text-sm font-medium text-destructive">
              Unable to fetch shipping rates
            </p>
            <p className="text-sm text-muted-foreground">
              {typeof error === 'string' ? error : 'Please check your address and try again'}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (rates.length === 0) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Truck className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              No shipping options available
            </p>
            <p className="text-sm text-amber-700 mt-1">
              We couldn't find shipping options for your address. Please verify your address details.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Available Shipping Options</p>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-8">
          <RefreshCw className="h-3 w-3 mr-1" />
          Refresh
        </Button>
      </div>

      <RadioGroup
        value={selectedRate?.service_level_code || selectedRate?.service_level || ''}
        onValueChange={(value) => {
          const rate = rates.find(
            (r) => (r.service_level_code || r.service_level) === value
          );
          if (rate) onRateSelect(rate);
        }}
      >
        {rates.map((rate) => {
          const rateId = rate.service_level_code || rate.service_level || rate.id || '';
          const isSelected = (selectedRate?.service_level_code || selectedRate?.service_level) === rateId;

          return (
            <Card
              key={rateId}
              className={cn(
                "relative cursor-pointer transition-all",
                isSelected 
                  ? "border-primary ring-1 ring-primary" 
                  : "hover:border-primary/50"
              )}
              onClick={() => onRateSelect(rate)}
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value={rateId} id={rateId} className="mt-1" />
                    <div className="space-y-1">
                      <label
                        htmlFor={rateId}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {rate.service_level_name || rate.service_level || 'Standard Shipping'}
                      </label>
                      {rate.carrier && (
                        <p className="text-xs text-muted-foreground">
                          via {rate.carrier}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{formatDeliveryEstimate(rate)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold text-lg">
                      R{rate.rate.toFixed(2)}
                    </p>
                    {rate.markup_applied && rate.original_rate && (
                      <p className="text-xs text-muted-foreground line-through">
                        R{rate.original_rate.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {isSelected && (
                <Badge 
                  className="absolute -top-2 -right-2 bg-primary"
                >
                  Selected
                </Badge>
              )}
            </Card>
          );
        })}
      </RadioGroup>
    </div>
  );
};
