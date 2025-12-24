import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DeliveryAddress {
  street_address: string;
  city: string;
  zone: string;
  country: string;
  code: string;
}

export interface Parcel {
  submitted_length_cm: number;
  submitted_width_cm: number;
  submitted_height_cm: number;
  submitted_weight_kg: number;
}

export interface ShippingRate {
  id?: string;
  service_level?: string;
  service_level_code?: string;
  service_level_name?: string;
  rate: number;
  original_rate?: number;
  markup_applied?: boolean;
  delivery_date_from?: string;
  delivery_date_to?: string;
  min_delivery_date?: string;
  max_delivery_date?: string;
  collection_cut_off?: string;
  carrier?: string;
}

export interface ShippingRatesResponse {
  success: boolean;
  rates: ShippingRate[];
  error?: string;
  collection_address?: any;
}

export const useShippingRates = (
  deliveryAddress: DeliveryAddress | null,
  parcels?: Parcel[],
  enabled: boolean = true
) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['shipping-rates', deliveryAddress, parcels],
    queryFn: async (): Promise<ShippingRatesResponse> => {
      if (!deliveryAddress || !deliveryAddress.street_address || !deliveryAddress.city) {
        return { success: false, rates: [], error: 'Invalid delivery address' };
      }

      console.log('[useShippingRates] Fetching rates for:', deliveryAddress);

      const response = await supabase.functions.invoke('get-shipping-rates', {
        body: {
          delivery_address: deliveryAddress,
          parcels: parcels || [],
        },
      });

      if (response.error) {
        console.error('[useShippingRates] Error:', response.error);
        return { success: false, rates: [], error: response.error.message };
      }

      console.log('[useShippingRates] Response:', response.data);
      return response.data as ShippingRatesResponse;
    },
    enabled: enabled && !!deliveryAddress?.street_address && !!deliveryAddress?.city,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  return {
    rates: data?.rates || [],
    isLoading,
    error: error || data?.error,
    success: data?.success || false,
    refetch,
  };
};

// Helper to format estimated delivery
export const formatDeliveryEstimate = (rate: ShippingRate): string => {
  const fromDate = rate.delivery_date_from || rate.min_delivery_date;
  const toDate = rate.delivery_date_to || rate.max_delivery_date;
  
  if (!fromDate && !toDate) return 'Estimate not available';
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-ZA', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  if (fromDate && toDate && fromDate !== toDate) {
    return `${formatDate(fromDate)} - ${formatDate(toDate)}`;
  }

  return formatDate(fromDate || toDate!);
};
