import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ChartDataResponse {
  salesTrend: Array<{
    date: string;
    sales: number;
    orders: number;
    revenue: number;
  }>;
  categoryPerformance: Array<{
    name: string;
    products: number;
    totalValue: number;
    avgPrice: number;
    fill?: string;
  }>;
}

export const useChartData = (daysBack: number = 7) => {
  return useQuery({
    queryKey: ['chart-data', daysBack],
    queryFn: async () => {
      // Get sales trend from raw analytics events (last 7 days)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      
      const { data: analyticsData } = await supabase
        .from('analytics_events')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      // Group by day for sales trend
      const salesByDay: Record<string, { sales: number; orders: number; revenue: number }> = {};
      
      (analyticsData || []).forEach(event => {
        const day = new Date(event.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' });
        if (!salesByDay[day]) {
          salesByDay[day] = { sales: 0, orders: 0, revenue: 0 };
        }
        
        if (event.event_type === 'page_view') {
          salesByDay[day].sales += 1;
        }
      });

      const salesTrend = Object.entries(salesByDay).map(([date, data]) => ({
        date,
        sales: data.sales,
        orders: data.orders,
        revenue: data.revenue
      }));

      // Get category performance from categories and products
      const { data: categories } = await supabase
        .from('categories')
        .select(`
          name,
          products!inner(
            id,
            price,
            stock_quantity
          )
        `)
        .eq('is_active', true)
        .eq('products.is_active', true);

      const categoryPerformance = (categories || []).slice(0, 5).map((category: any) => ({
        name: category.name,
        products: category.products?.length || 0,
        totalValue: category.products?.reduce((sum: number, p: any) => sum + (p.price * (p.stock_quantity || 0)), 0) || 0,
        avgPrice: category.products?.length > 0 ? 
          (category.products?.reduce((sum: number, p: any) => sum + p.price, 0) / category.products.length) || 0 : 0
      }));

      return {
        salesTrend,
        categoryPerformance
      } as ChartDataResponse;
    },
    refetchInterval: 30000,
    staleTime: 25000
  });
};