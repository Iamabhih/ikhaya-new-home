import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AnalyticsOverview {
  totalCustomers: number;
  totalOrders: number;
  totalRevenue: number;
  conversionRate: number;
  recentOrdersCount: number;
}

export interface CustomerAnalytic {
  id: string;
  email: string;
  display_name: string;
  total_orders: number;
  total_spent: number;
  avg_order_value: number;
  last_order_date: string | null;
  customer_segment: string;
  registration_date: string;
}

export interface ProductPerformance {
  product_id: string;
  product_name: string;
  total_sold: number;
  total_revenue: number;
  total_views: number;
  conversion_rate: number;
}

export const useImprovedAnalytics = (dateRange?: { from?: Date; to?: Date }) => {
  // Overview Stats using RPC function (no N+1 queries!)
  const { data: overviewStats, isLoading: overviewLoading, error: overviewError } = useQuery({
    queryKey: ['improved-analytics-overview', dateRange],
    queryFn: async (): Promise<AnalyticsOverview> => {
      const startDate = dateRange?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = dateRange?.to || new Date();
      try {
        // Use RPC function for real-time metrics with date range
        const { data: metrics } = await supabase.rpc('get_realtime_metrics_with_date_range', { 
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        });

        const metricsData = metrics as any;

        // Get total customers count
        const { count: totalCustomers } = await supabase
          .from('clean_customer_analytics')
          .select('*', { count: 'exact', head: true });

        return {
          totalCustomers: totalCustomers || 0,
          totalOrders: metricsData?.orders_count || 0,
          totalRevenue: metricsData?.revenue || 0,
          conversionRate: metricsData?.conversion_rate || 0,
          recentOrdersCount: metricsData?.orders_count || 0,
        };
      } catch (error) {
        console.error('Error fetching overview stats:', error);
        return {
          totalCustomers: 0,
          totalOrders: 0,
          totalRevenue: 0,
          conversionRate: 0,
          recentOrdersCount: 0,
        };
      }
    },
    refetchInterval: 30000,
    retry: 3,
  });

  // Customer Analytics from materialized view (no N+1 queries!)
  const { data: customerAnalytics, isLoading: customersLoading } = useQuery({
    queryKey: ['improved-customer-analytics', dateRange],
    queryFn: async (): Promise<CustomerAnalytic[]> => {
      try {
        const { data } = await supabase
          .from('clean_customer_analytics')
          .select('*')
          .order('total_spent', { ascending: false })
          .limit(50);

        if (!data) return [];

        return data as CustomerAnalytic[];
      } catch (error) {
        console.error('Error fetching customer analytics:', error);
        return [];
      }
    },
    refetchInterval: 60000,
  });

  // Product Performance from materialized view (includes products without orders!)
  const { data: productPerformance, isLoading: productsLoading } = useQuery({
    queryKey: ['improved-product-performance', dateRange],
    queryFn: async (): Promise<ProductPerformance[]> => {
      try {
        const { data } = await supabase
          .from('clean_product_performance')
          .select('*')
          .order('total_revenue', { ascending: false })
          .limit(20);

        if (!data) return [];

        return data as ProductPerformance[];
      } catch (error) {
        console.error('Error fetching product performance:', error);
        return [];
      }
    },
    refetchInterval: 60000,
  });

  return {
    overviewStats,
    customerAnalytics,
    productPerformance,
    isLoading: overviewLoading || customersLoading || productsLoading,
    error: overviewError,
  };
};