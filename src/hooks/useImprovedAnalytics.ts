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
  // Overview Stats with error handling and fallbacks
  const { data: overviewStats, isLoading: overviewLoading, error: overviewError } = useQuery({
    queryKey: ['improved-analytics-overview', dateRange],
    queryFn: async (): Promise<AnalyticsOverview> => {
      try {
        // Get total customers from profiles
        const { count: totalCustomers } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true });

        // Get orders data with date filtering if provided
        let ordersQuery = supabase.from('orders').select('id, total_amount, created_at, status');
        
        if (dateRange?.from) {
          ordersQuery = ordersQuery.gte('created_at', dateRange.from.toISOString());
        }
        if (dateRange?.to) {
          ordersQuery = ordersQuery.lte('created_at', dateRange.to.toISOString());
        }

        const { data: orders } = await ordersQuery;
        
        const totalOrders = orders?.length || 0;
        const completedOrders = orders?.filter(o => 
          o.status === 'delivered' || o.status === 'completed'
        ) || [];
        
        const totalRevenue = completedOrders.reduce((sum, order) => 
          sum + Number(order.total_amount || 0), 0
        );

        // Get analytics events for conversion calculation
        let eventsQuery = supabase
          .from('analytics_events')
          .select('session_id, event_type', { count: 'exact' });

        if (dateRange?.from) {
          eventsQuery = eventsQuery.gte('created_at', dateRange.from.toISOString());
        }
        if (dateRange?.to) {
          eventsQuery = eventsQuery.lte('created_at', dateRange.to.toISOString());
        }

        const { data: events } = await eventsQuery;
        const uniqueSessions = new Set(events?.map(e => e.session_id) || []).size;
        
        const conversionRate = uniqueSessions > 0 ? 
          Math.round((completedOrders.length / uniqueSessions) * 100 * 100) / 100 : 0;

        // Recent orders count (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data: recentOrders } = await supabase
          .from('orders')
          .select('id')
          .gte('created_at', thirtyDaysAgo.toISOString())
          .in('status', ['delivered', 'completed']);

        return {
          totalCustomers: totalCustomers || 0,
          totalOrders,
          totalRevenue,
          conversionRate,
          recentOrdersCount: recentOrders?.length || 0,
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

  // Customer Analytics with proper error handling
  const { data: customerAnalytics, isLoading: customersLoading } = useQuery({
    queryKey: ['improved-customer-analytics', dateRange],
    queryFn: async (): Promise<CustomerAnalytic[]> => {
      try {
        // Build the customer analytics from profiles and orders
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name, created_at')
          .limit(100);

        if (!profiles) return [];

        const customerAnalytics: CustomerAnalytic[] = [];

        for (const profile of profiles) {
          // Get orders for this customer
          const { data: orders } = await supabase
            .from('orders')
            .select('total_amount, created_at, status')
            .eq('user_id', profile.id)
            .not('status', 'in', '(cancelled,pending)');

          const totalOrders = orders?.length || 0;
          const totalSpent = orders?.reduce((sum, order) => 
            sum + Number(order.total_amount || 0), 0
          ) || 0;
          const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
          const lastOrderDate = orders?.[0]?.created_at || null;

          const customerSegment = 
            totalSpent > 5000 ? 'VIP' :
            totalOrders >= 5 ? 'Loyal' :
            totalOrders >= 2 ? 'Regular' :
            totalOrders === 1 ? 'New' :
            'Inactive';

          customerAnalytics.push({
            id: profile.id,
            email: profile.email || '',
            display_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email || '',
            total_orders: totalOrders,
            total_spent: totalSpent,
            avg_order_value: avgOrderValue,
            last_order_date: lastOrderDate,
            customer_segment: customerSegment,
          });
        }

        return customerAnalytics
          .sort((a, b) => b.total_spent - a.total_spent)
          .slice(0, 50);

      } catch (error) {
        console.error('Error fetching customer analytics:', error);
        return [];
      }
    },
    refetchInterval: 60000,
  });

  // Product Performance with proper error handling
  const { data: productPerformance, isLoading: productsLoading } = useQuery({
    queryKey: ['improved-product-performance', dateRange],
    queryFn: async (): Promise<ProductPerformance[]> => {
      try {
        // Get products with their order items
        const { data: products } = await supabase
          .from('products')
          .select(`
            id, name,
            order_items!inner(quantity, total_price, order_id)
          `)
          .eq('is_active', true)
          .limit(100);

        if (!products) return [];

        const productPerformance: ProductPerformance[] = [];

        for (const product of products) {
          const orderItems = product.order_items || [];
          
          const totalSold = orderItems.reduce((sum: number, item: any) => 
            sum + (item.quantity || 0), 0
          );
          const totalRevenue = orderItems.reduce((sum: number, item: any) => 
            sum + Number(item.total_price || 0), 0
          );

          // Get analytics events for views
          const { data: viewEvents } = await supabase
            .from('analytics_events')
            .select('session_id')
            .eq('product_id', product.id)
            .eq('event_type', 'product_view');

          const totalViews = new Set(viewEvents?.map(e => e.session_id) || []).size;
          const conversionRate = totalViews > 0 ? 
            Math.round((orderItems.length / totalViews) * 100 * 100) / 100 : 0;

          productPerformance.push({
            product_id: product.id,
            product_name: product.name,
            total_sold: totalSold,
            total_revenue: totalRevenue,
            total_views: totalViews,
            conversion_rate: conversionRate,
          });
        }

        return productPerformance
          .sort((a, b) => b.total_revenue - a.total_revenue)
          .slice(0, 20);

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