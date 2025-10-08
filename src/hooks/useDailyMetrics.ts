import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DailyMetric {
  date: string;
  pageViews: number;
  cartEvents: number;
  orders: number;
  revenue: number;
}

export const useDailyMetrics = (dateRange?: { from?: Date; to?: Date }) => {
  return useQuery({
    queryKey: ['daily-metrics', dateRange],
    queryFn: async () => {
      try {
        const startDate = dateRange?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = dateRange?.to || new Date();
        
        const { data, error } = await supabase.rpc('get_daily_metrics', {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        });

        if (error) {
          console.error('Error fetching daily metrics:', error);
          return [];
        }

        return (data || []).map((item: any) => ({
          date: item.date,
          pageViews: Number(item.page_views) || 0,
          cartEvents: Number(item.cart_events) || 0,
          orders: Number(item.orders) || 0,
          revenue: Number(item.revenue) || 0
        })) as DailyMetric[];
      } catch (error) {
        console.error('Error fetching daily metrics:', error);
        return [];
      }
    },
    refetchInterval: 300000, // Refetch every 5 minutes
    staleTime: 240000, // Consider stale after 4 minutes
  });
};
