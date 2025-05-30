
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useAnalyticsData = () => {
  // Fetch overall metrics
  const { data: overviewStats } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: async () => {
      const [
        totalCustomersRes,
        totalOrdersRes,
        totalRevenueRes,
        recentOrdersRes,
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('total_amount').eq('status', 'delivered'),
        supabase
          .from('orders')
          .select('*')
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .eq('status', 'delivered'),
      ]);

      const totalRevenue = totalRevenueRes.data?.reduce(
        (sum, order) => sum + Number(order.total_amount),
        0
      ) || 0;

      return {
        totalCustomers: totalCustomersRes.count || 0,
        totalOrders: totalOrdersRes.count || 0,
        totalRevenue,
        recentOrdersCount: recentOrdersRes.data?.length || 0,
      };
    },
  });

  // Fetch customer analytics
  const { data: customerAnalytics } = useQuery({
    queryKey: ['customer-analytics'],
    queryFn: async () => {
      const { data } = await supabase
        .from('customer_analytics')
        .select('*')
        .order('total_spent', { ascending: false })
        .limit(10);

      return data || [];
    },
  });

  // Fetch product performance
  const { data: productPerformance } = useQuery({
    queryKey: ['product-performance'],
    queryFn: async () => {
      const { data } = await supabase
        .from('product_performance')
        .select('*')
        .order('total_revenue', { ascending: false })
        .limit(10);

      return data || [];
    },
  });

  // Fetch daily metrics for charts
  const { data: dailyMetrics } = useQuery({
    queryKey: ['daily-metrics'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data } = await supabase
        .from('analytics_metrics')
        .select('*')
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: true });

      return data || [];
    },
  });

  // Fetch event analytics
  const { data: eventAnalytics } = useQuery({
    queryKey: ['event-analytics'],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data } = await supabase
        .from('analytics_events')
        .select('event_type, event_name, created_at')
        .gte('created_at', sevenDaysAgo.toISOString());

      // Group by event type
      const eventCounts = data?.reduce((acc, event) => {
        acc[event.event_type] = (acc[event.event_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(eventCounts || {}).map(([type, count]) => ({
        event_type: type,
        count,
      }));
    },
  });

  return {
    overviewStats,
    customerAnalytics,
    productPerformance,
    dailyMetrics,
    eventAnalytics,
  };
};
