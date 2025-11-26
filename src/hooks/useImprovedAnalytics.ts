import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RealTimeMetrics {
  activeUsers: number;
  pageViews: number;
  cartEvents: number;
  ordersCount: number;
  revenue: number;
  conversionRate: number;
}

export interface CustomerSegment {
  segment: string;
  count: number;
  percentage: number;
  avgOrderValue: number;
  color: string;
}

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
  // Real-time metrics (5 second refresh) - polling-based, more reliable than WebSocket
  const { data: realTimeMetrics, refetch: refetchMetrics } = useQuery({
    queryKey: ['improved-realtime-metrics', dateRange],
    queryFn: async (): Promise<RealTimeMetrics> => {
      const startDate = dateRange?.from || new Date(Date.now() - 60 * 60 * 1000);
      const endDate = dateRange?.to || new Date();

      try {
        const { data } = await supabase.rpc('get_realtime_metrics_with_date_range', {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        });
        const result = data as Record<string, number> | null;
        return {
          activeUsers: result?.active_users || 0,
          pageViews: result?.page_views || 0,
          cartEvents: result?.cart_events || 0,
          ordersCount: result?.orders_count || 0,
          revenue: result?.revenue || 0,
          conversionRate: result?.conversion_rate || 0
        };
      } catch {
        return { activeUsers: 0, pageViews: 0, cartEvents: 0, ordersCount: 0, revenue: 0, conversionRate: 0 };
      }
    },
    refetchInterval: 5000,
    staleTime: 3000
  });

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

  // Calculate customer segments from analytics data
  const customerSegments: CustomerSegment[] = customerAnalytics ? [
    {
      segment: "VIP Customers",
      count: customerAnalytics.filter(c => c.total_spent > 5000).length,
      percentage: Math.round((customerAnalytics.filter(c => c.total_spent > 5000).length / Math.max(customerAnalytics.length, 1)) * 100),
      avgOrderValue: 0,
      color: "bg-purple-100 text-purple-800"
    },
    {
      segment: "Loyal Customers",
      count: customerAnalytics.filter(c => c.total_orders >= 5 && c.total_spent <= 5000).length,
      percentage: Math.round((customerAnalytics.filter(c => c.total_orders >= 5 && c.total_spent <= 5000).length / Math.max(customerAnalytics.length, 1)) * 100),
      avgOrderValue: 0,
      color: "bg-blue-100 text-blue-800"
    },
    {
      segment: "Regular Customers",
      count: customerAnalytics.filter(c => c.total_orders >= 2 && c.total_orders < 5).length,
      percentage: Math.round((customerAnalytics.filter(c => c.total_orders >= 2 && c.total_orders < 5).length / Math.max(customerAnalytics.length, 1)) * 100),
      avgOrderValue: 0,
      color: "bg-green-100 text-green-800"
    },
    {
      segment: "New Customers",
      count: customerAnalytics.filter(c => c.total_orders === 1).length,
      percentage: Math.round((customerAnalytics.filter(c => c.total_orders === 1).length / Math.max(customerAnalytics.length, 1)) * 100),
      avgOrderValue: 0,
      color: "bg-yellow-100 text-yellow-800"
    }
  ] : [];

  // Function to manually refresh data
  const refreshViews = async () => {
    try {
      await supabase.rpc('refresh_analytics_views');
      refetchMetrics();
    } catch (error) {
      console.error('Error refreshing analytics views:', error);
    }
  };

  return {
    // Real-time data
    realTimeMetrics,
    // Overview statistics
    overviewStats,
    // Customer data
    customerAnalytics,
    customerSegments,
    // Product data
    productPerformance,
    // Utility
    refreshViews,
    isLoading: overviewLoading || customersLoading || productsLoading,
    error: overviewError,
  };
};