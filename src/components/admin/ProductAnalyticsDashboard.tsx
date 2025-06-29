
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AnalyticsOverview } from "./analytics/AnalyticsOverview";
import { AnalyticsCharts } from "./analytics/AnalyticsCharts";
import { TopProductsList } from "./analytics/TopProductsList";

export const ProductAnalyticsDashboard = () => {
  // Fetch overview metrics
  const { data: overviewStats } = useQuery({
    queryKey: ['product-analytics-overview'],
    queryFn: async () => {
      const [
        totalProductsRes,
        activeProductsRes,
        totalRevenueRes,
        lowStockRes
      ] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('order_items').select('total_price').limit(1000),
        supabase.from('products').select('id', { count: 'exact', head: true }).lte('stock_quantity', 5)
      ]);

      const totalRevenue = totalRevenueRes.data?.reduce((sum, item) => sum + Number(item.total_price), 0) || 0;

      return {
        totalProducts: totalProductsRes.count || 0,
        activeProducts: activeProductsRes.count || 0,
        totalRevenue,
        lowStockCount: lowStockRes.count || 0
      };
    },
    staleTime: 300000,
  });

  // Fetch top performing products
  const { data: topProducts } = useQuery({
    queryKey: ['top-performing-products'],
    queryFn: async () => {
      const { data } = await supabase
        .from('product_performance')
        .select('*')
        .order('total_revenue', { ascending: false })
        .limit(5);
      return data || [];
    },
    staleTime: 300000,
  });

  // Fetch category performance
  const { data: categoryPerformance } = useQuery({
    queryKey: ['category-performance'],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select(`
          category_id,
          categories:category_id(name),
          price,
          stock_quantity
        `)
        .eq('is_active', true);

      const categoryStats = data?.reduce((acc, product) => {
        const categoryName = product.categories?.name || 'Uncategorized';
        if (!acc[categoryName]) {
          acc[categoryName] = { 
            name: categoryName, 
            products: 0, 
            totalValue: 0,
            avgPrice: 0 
          };
        }
        acc[categoryName].products += 1;
        acc[categoryName].totalValue += Number(product.price) * (product.stock_quantity || 0);
        return acc;
      }, {} as Record<string, any>);

      return Object.values(categoryStats || {}).map((cat: any) => ({
        ...cat,
        avgPrice: cat.totalValue / cat.products
      }));
    },
    staleTime: 300000,
  });

  const exportAnalytics = () => {
    // Create CSV data
    const csvData = [
      ['Metric', 'Value'],
      ['Total Products', overviewStats?.totalProducts || 0],
      ['Active Products', overviewStats?.activeProducts || 0],
      ['Total Revenue', `R${(overviewStats?.totalRevenue || 0).toFixed(2)}`],
      ['Low Stock Items', overviewStats?.lowStockCount || 0],
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `product-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Product Analytics</h2>
        <Button onClick={exportAnalytics} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* Overview Stats */}
      <AnalyticsOverview stats={overviewStats} />

      {/* Charts Row */}
      <AnalyticsCharts categoryPerformance={categoryPerformance} />

      {/* Top Products */}
      <TopProductsList products={topProducts} />
    </div>
  );
};
