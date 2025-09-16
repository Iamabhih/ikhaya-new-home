import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useRef } from 'react';

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

export interface ProductInsight {
  productId: string;
  productName: string;
  totalSold: number;
  totalRevenue: number;
  totalViews: number;
  conversionRate: number;
}

export const useEnhancedAnalytics = () => {
  const wsRef = useRef<WebSocket | null>(null);

  // Real-time metrics using database function (authentic data only)
  const { data: realTimeMetrics, refetch: refetchMetrics } = useQuery({
    queryKey: ['enhanced-realtime-metrics'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_realtime_metrics', { hours_back: 1 });
      const dataResult = data as any;
      return dataResult ? {
        activeUsers: dataResult.active_users || 0,
        pageViews: dataResult.page_views || 0,
        cartEvents: dataResult.cart_events || 0,
        ordersCount: dataResult.orders_count || 0,
        revenue: dataResult.revenue || 0,
        conversionRate: dataResult.conversion_rate || 0
      } as RealTimeMetrics : null;
    },
    refetchInterval: 5000,
    staleTime: 3000
  });

  // Clean customer analytics using materialized view
  const { data: customerAnalytics } = useQuery({
    queryKey: ['clean-customer-analytics'],
    queryFn: async () => {
      const { data } = await supabase
        .from('clean_customer_analytics')
        .select('*')
        .order('total_spent', { ascending: false })
        .limit(50);

      // Calculate segments from clean data
      const segments: CustomerSegment[] = [
        {
          segment: "VIP Customers",
          count: data?.filter(c => c.total_spent > 5000).length || 0,
          percentage: 0,
          avgOrderValue: 0,
          color: "bg-purple-100 text-purple-800"
        },
        {
          segment: "Loyal Customers", 
          count: data?.filter(c => c.total_orders >= 5 && c.total_spent <= 5000).length || 0,
          percentage: 0,
          avgOrderValue: 0,
          color: "bg-blue-100 text-blue-800"
        },
        {
          segment: "Regular Customers",
          count: data?.filter(c => c.total_orders >= 2 && c.total_orders < 5).length || 0,
          percentage: 0,
          avgOrderValue: 0,
          color: "bg-green-100 text-green-800"
        },
        {
          segment: "New Customers",
          count: data?.filter(c => c.total_orders === 1).length || 0,
          percentage: 0,
          avgOrderValue: 0,
          color: "bg-yellow-100 text-yellow-800"
        }
      ];

      const totalCustomers = data?.length || 1;
      segments.forEach(segment => {
        segment.percentage = Math.round((segment.count / totalCustomers) * 100);
      });

      return {
        topCustomers: data?.slice(0, 10) || [],
        segments,
        totalCustomers,
        newCustomersThisMonth: data?.filter(c => {
          const thisMonth = new Date();
          thisMonth.setDate(1);
          return new Date(c.registration_date) >= thisMonth;
        }).length || 0
      };
    },
    refetchInterval: 30000
  });

  // Clean product performance using materialized view
  const { data: productPerformance } = useQuery({
    queryKey: ['clean-product-performance'],
    queryFn: async () => {
      const { data } = await supabase
        .from('clean_product_performance')
        .select('*')
        .order('total_revenue', { ascending: false })
        .limit(20);

      return data?.map(item => ({
        productId: item.product_id,
        productName: item.product_name,
        totalSold: item.total_sold,
        totalRevenue: item.total_revenue,
        totalViews: item.total_views,
        conversionRate: item.conversion_rate
      })) as ProductInsight[] || [];
    },
    refetchInterval: 30000
  });

  // Overview stats (authentic data only)
  const { data: overviewStats } = useQuery({
    queryKey: ['enhanced-overview-stats'],
    queryFn: async () => {
      // Get authentic customers count
      const { count: totalCustomers } = await supabase
        .from('clean_customer_analytics')
        .select('id', { count: 'exact', head: true });

      // Get authentic orders and revenue
      const { data: orderStats } = await supabase
        .rpc('get_realtime_metrics', { hours_back: 24 * 30 }); // Last 30 days

      return {
        totalCustomers: totalCustomers || 0,
        totalOrders: (orderStats as any)?.orders_count || 0,
        totalRevenue: (orderStats as any)?.revenue || 0,
        conversionRate: (orderStats as any)?.conversion_rate || 0
      };
    },
    refetchInterval: 60000
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        wsRef.current = new WebSocket(`wss://kauostzhxqoxggwqgtym.functions.supabase.co/analytics-stream`);
        
        wsRef.current.onopen = () => {
          console.log('Analytics WebSocket connected');
        };

        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Handle real-time analytics updates
            if (data.type === 'metrics_update') {
              refetchMetrics();
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        wsRef.current.onclose = () => {
          console.log('Analytics WebSocket disconnected, attempting reconnect...');
          setTimeout(connectWebSocket, 5000);
        };

        wsRef.current.onerror = (error) => {
          console.error('Analytics WebSocket error:', error);
        };
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
      }
    };

    // Only connect WebSocket in production environment
    if (window.location.hostname !== 'localhost' &&  window.location.hostname !== '127.0.0.1') {
      connectWebSocket();
    } else {
      console.log('WebSocket disabled in development mode');
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [refetchMetrics]);

  // Function to refresh materialized views
  const refreshViews = async () => {
    try {
      await supabase.rpc('refresh_analytics_views');
      // Refetch queries after refresh
      window.location.reload(); // Temporary - in production use query invalidation
    } catch (error) {
      console.error('Error refreshing views:', error);
    }
  };

  return {
    realTimeMetrics,
    customerAnalytics,
    productPerformance,
    overviewStats,
    refreshViews,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN
  };
};