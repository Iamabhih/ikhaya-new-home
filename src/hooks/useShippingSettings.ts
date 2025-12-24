import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CollectionAddress {
  company?: string;
  street_address: string;
  local_area?: string;
  city: string;
  zone: string;
  country: string;
  code: string;
  contact_name?: string;
  phone?: string;
  email?: string;
}

export interface DefaultParcel {
  weight: number;
  length: number;
  width: number;
  height: number;
}

export interface ServiceLevels {
  economy: boolean;
  express: boolean;
  overnight: boolean;
}

export interface ShippingSettings {
  id: string;
  provider: string;
  is_enabled: boolean;
  is_test_mode: boolean;
  collection_address: CollectionAddress;
  default_parcel: DefaultParcel;
  service_levels: ServiceLevels;
  markup_percentage: number;
  created_at: string;
  updated_at: string;
}

export const useShippingSettings = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['shipping-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipping_settings')
        .select('*')
        .eq('provider', 'shiplogic')
        .single();

      if (error) {
        console.error('[useShippingSettings] Error fetching settings:', error);
        throw error;
      }

      return data as unknown as ShippingSettings;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<ShippingSettings>) => {
      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      
      if (updates.is_enabled !== undefined) updatePayload.is_enabled = updates.is_enabled;
      if (updates.is_test_mode !== undefined) updatePayload.is_test_mode = updates.is_test_mode;
      if (updates.markup_percentage !== undefined) updatePayload.markup_percentage = updates.markup_percentage;
      if (updates.collection_address) updatePayload.collection_address = updates.collection_address;
      if (updates.default_parcel) updatePayload.default_parcel = updates.default_parcel;
      if (updates.service_levels) updatePayload.service_levels = updates.service_levels;

      const { data, error } = await supabase
        .from('shipping_settings')
        .update(updatePayload)
        .eq('provider', 'shiplogic')
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-settings'] });
      toast.success('Shipping settings updated');
    },
    onError: (error: any) => {
      console.error('[useShippingSettings] Update error:', error);
      toast.error('Failed to update shipping settings');
    },
  });

  const testConnection = useMutation({
    mutationFn: async () => {
      // Test by requesting rates for a sample address
      const response = await supabase.functions.invoke('get-shipping-rates', {
        body: {
          delivery_address: {
            street_address: '1 Test Street',
            city: 'Cape Town',
            zone: 'Western Cape',
            country: 'ZA',
            code: '8001',
          },
          parcels: [{
            submitted_length_cm: 20,
            submitted_width_cm: 15,
            submitted_height_cm: 10,
            submitted_weight_kg: 1,
          }],
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      if (data.error) {
        toast.error(`Connection failed: ${data.error}`);
      } else if (data.rates?.length > 0) {
        toast.success(`Connection successful! Found ${data.rates.length} shipping rates`);
      } else {
        toast.warning('Connection successful but no rates returned');
      }
    },
    onError: (error: any) => {
      console.error('[useShippingSettings] Test connection error:', error);
      toast.error('Failed to test connection');
    },
  });

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    testConnection,
  };
};
