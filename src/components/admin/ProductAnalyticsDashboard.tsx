
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  DollarSign, 
  BarChart3, 
  Download,
  Eye,
  ShoppingCart
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

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

  // Mock sales trend data - in real app, this would come from analytics_metrics
  const salesTrend = [
    { date: '2024-01', sales: 4000, orders: 240 },
    { date: '2024-02', sales: 3000, orders: 139 },
    { date: '2024-03', sales: 2000, orders: 980 },
    { date: '2024-04', sales: 2780, orders: 390 },
    { date: '2024-05', sales: 1890, orders: 480 },
    { date: '2024-06', sales: 2390, orders: 380 },
  ];

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewStats?.totalProducts || 0}</div>
            <p className="text-xs text-muted-foreground">
              {overviewStats?.activeProducts || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R{((overviewStats?.totalRevenue || 0) / 1000).toFixed(1)}k
            </div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alert</CardTitle>
            <Package className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {overviewStats?.lowStockCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">Items need restocking</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R850</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1 text-green-500" />
              +5% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="sales" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Category Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryPerformance}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="products"
                >
                  {categoryPerformance?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topProducts?.map((product, index) => (
              <div key={product.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">#{index + 1}</Badge>
                  <div>
                    <h4 className="font-medium">{product.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {product.category_name || 'Uncategorized'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">R{Number(product.total_revenue || 0).toFixed(2)}</div>
                  <p className="text-sm text-muted-foreground">
                    {product.total_sold || 0} sold
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
