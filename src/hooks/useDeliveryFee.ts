import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DeliveryZone {
  id: string;
  name: string;
  delivery_fee: number;
  free_delivery_threshold: number | null;
  min_order_value: number;
  is_active: boolean;
}

interface DeliveryCalculation {
  deliveryFee: number;
  isFreeDelivery: boolean;
  deliveryZone: DeliveryZone | null;
  amountForFreeDelivery: number;
}

export const useDeliveryFee = (subtotal: number, selectedZone?: string) => {
  const [calculatedDelivery, setCalculatedDelivery] = useState<DeliveryCalculation>({
    deliveryFee: 0,
    isFreeDelivery: true,
    deliveryZone: null,
    amountForFreeDelivery: 0
  });

  const { data: deliveryZones = [] } = useQuery({
    queryKey: ['delivery-zones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_zones')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data as DeliveryZone[];
    },
  });

  useEffect(() => {
    if (!deliveryZones.length || subtotal <= 0) {
      setCalculatedDelivery({
        deliveryFee: 0,
        isFreeDelivery: true,
        deliveryZone: null,
        amountForFreeDelivery: 0
      });
      return;
    }

    // If a specific zone is selected, use that zone
    let zone = selectedZone ? 
      deliveryZones.find(z => z.id === selectedZone) : 
      deliveryZones[0]; // Default to first active zone

    if (!zone) {
      zone = deliveryZones[0];
    }

    if (!zone) {
      setCalculatedDelivery({
        deliveryFee: 0,
        isFreeDelivery: true,
        deliveryZone: null,
        amountForFreeDelivery: 0
      });
      return;
    }

    // Check if order meets minimum value
    if (subtotal < zone.min_order_value) {
      setCalculatedDelivery({
        deliveryFee: zone.delivery_fee,
        isFreeDelivery: false,
        deliveryZone: zone,
        amountForFreeDelivery: zone.min_order_value - subtotal
      });
      return;
    }

    // Check if order qualifies for free delivery
    const isFreeDelivery = zone.free_delivery_threshold ? 
      subtotal >= zone.free_delivery_threshold : 
      false;

    const amountForFreeDelivery = zone.free_delivery_threshold && !isFreeDelivery ? 
      zone.free_delivery_threshold - subtotal : 
      0;

    setCalculatedDelivery({
      deliveryFee: isFreeDelivery ? 0 : zone.delivery_fee,
      isFreeDelivery,
      deliveryZone: zone,
      amountForFreeDelivery
    });
  }, [deliveryZones, subtotal, selectedZone]);

  return {
    ...calculatedDelivery,
    deliveryZones,
    isLoading: !deliveryZones
  };
};