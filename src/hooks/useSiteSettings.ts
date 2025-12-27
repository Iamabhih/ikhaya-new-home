import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SiteSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  description?: string;
  created_at: string;
  updated_at: string;
}

// Helper to parse setting values with proper type conversion
const parseSettingValue = (value: any): any => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null' || value === null) return null;
  if (typeof value === 'string' && !isNaN(Number(value)) && value.trim() !== '') {
    return Number(value);
  }
  return value;
};

export const useSiteSettings = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*');

      if (error) throw error;

      // Convert to a more convenient format with proper type conversion
      const settingsMap: Record<string, any> = {};
      data?.forEach((setting: SiteSetting) => {
        settingsMap[setting.setting_key] = parseSettingValue(setting.setting_value);
      });

      return settingsMap;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await supabase
        .from('site_settings')
        .update({ 
          setting_value: value,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', key);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
      toast({
        title: "Settings updated",
        description: "Site settings have been successfully updated.",
      });
    },
    onError: (error) => {
      console.error('Error updating site setting:', error);
      toast({
        title: "Error",
        description: "Failed to update site settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateSetting = (key: string, value: any) => {
    updateSettingMutation.mutate({ key, value });
  };

  return {
    settings,
    isLoading,
    updateSetting,
    isUpdating: updateSettingMutation.isPending,
  };
};