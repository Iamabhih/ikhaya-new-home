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

export const useChartData = (dateRange?: { from?: Date; to?: Date }) => {
  return useQuery({
    queryKey: ['chart-data', dateRange],
    queryFn: async () => {
      const startDate = dateRange?.from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = dateRange?.to || new Date();
      
      // Get sales trend using new database function
      const { data: salesTrendData } = await supabase.rpc('get_sales_trend_data', {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      });

      // Format sales trend data from database function
      const salesTrend = (salesTrendData || []).map((item: any) => ({
        date: item.date,
        sales: Number(item.sales) || 0,
        orders: Number(item.orders) || 0,
        revenue: Number(item.revenue) || 0
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