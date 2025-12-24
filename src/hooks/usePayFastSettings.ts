import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PayFastSettings {
  merchantId: string;
  merchantKey: string;
  passphrase: string;
  isTestMode: boolean;
  isEnabled: boolean;
  isLoading: boolean;
  error: string | null;
}

export const usePayFastSettings = () => {
  const [settings, setSettings] = useState<PayFastSettings>({
    merchantId: '',
    merchantKey: '',
    passphrase: '',
    isTestMode: true,
    isEnabled: false,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('payment_settings')
          .select('*')
          .eq('gateway_name', 'payfast')
          .maybeSingle();

        if (error) {
          console.error('[usePayFastSettings] Error fetching settings:', error);
          setSettings(prev => ({
            ...prev,
            isLoading: false,
            error: 'Failed to load payment settings'
          }));
          return;
        }

        if (data) {
          const settingsData = data.settings as Record<string, any>;
          setSettings({
            merchantId: settingsData?.merchant_id || '',
            merchantKey: settingsData?.merchant_key || '',
            passphrase: settingsData?.passphrase || '',
            isTestMode: data.is_test_mode ?? true,
            isEnabled: data.is_enabled ?? false,
            isLoading: false,
            error: null
          });
          console.log('[usePayFastSettings] Settings loaded:', {
            merchantId: settingsData?.merchant_id ? '[SET]' : '[EMPTY]',
            merchantKey: settingsData?.merchant_key ? '[SET]' : '[EMPTY]',
            isTestMode: data.is_test_mode,
            isEnabled: data.is_enabled
          });
        } else {
          console.log('[usePayFastSettings] No PayFast settings found in database');
          setSettings(prev => ({
            ...prev,
            isLoading: false,
            error: 'PayFast not configured. Please configure in Admin > Payments.'
          }));
        }
      } catch (err) {
        console.error('[usePayFastSettings] Unexpected error:', err);
        setSettings(prev => ({
          ...prev,
          isLoading: false,
          error: 'Unexpected error loading payment settings'
        }));
      }
    };

    fetchSettings();
  }, []);

  return settings;
};
