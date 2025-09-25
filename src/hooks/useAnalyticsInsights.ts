import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AnalyticsInsights {
  peakDay: string;
  peakHour: string;
  avgSessionDuration: string;
  conversionRate: number;
  totalSessions: number;
  totalOrders: number;
}

export const useAnalyticsInsights = (dateRange?: { from?: Date; to?: Date }) => {
  return useQuery({
    queryKey: ['analytics-insights', dateRange],
    queryFn: async () => {
      const startDate = dateRange?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = dateRange?.to || new Date();
      
      const { data } = await supabase.rpc('get_analytics_insights', {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      });
      
      const insights = data as any;
      return insights ? {
        peakDay: insights.peak_day || 'No Data',
        peakHour: insights.peak_hour || 'No Data',
        avgSessionDuration: insights.avg_session_duration || 'No Data',
        conversionRate: insights.conversion_rate || 0,
        totalSessions: insights.total_sessions || 0,
        totalOrders: insights.total_orders || 0
      } as AnalyticsInsights : null;
    },
    refetchInterval: 60000,
    staleTime: 50000
  });
};