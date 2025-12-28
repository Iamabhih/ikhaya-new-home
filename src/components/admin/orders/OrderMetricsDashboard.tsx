import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Clock, 
  TrendingUp, 
  Users, 
  Package,
  DollarSign,
  BarChart3
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

export const OrderMetricsDashboard = () => {
  // Fetch order performance metrics
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['order-metrics'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get orders from last 30 days
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, status, total_amount, created_at, shipped_at, delivered_at, user_id, email')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Calculate metrics
      const totalOrders = orders?.length || 0;
      const totalRevenue = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Fulfillment time calculation (orders that have shipped_at)
      const shippedOrders = orders?.filter(o => o.shipped_at && o.created_at) || [];
      const avgFulfillmentHours = shippedOrders.length > 0
        ? shippedOrders.reduce((sum, o) => {
            const created = new Date(o.created_at).getTime();
            const shipped = new Date(o.shipped_at!).getTime();
            return sum + (shipped - created) / (1000 * 60 * 60);
          }, 0) / shippedOrders.length
        : 0;

      // Repeat customer rate
      const uniqueEmails = new Set(orders?.map(o => o.email));
      const emailCounts = new Map<string, number>();
      orders?.forEach(o => {
        emailCounts.set(o.email, (emailCounts.get(o.email) || 0) + 1);
      });
      const repeatCustomers = Array.from(emailCounts.values()).filter(c => c > 1).length;
      const repeatRate = uniqueEmails.size > 0 ? (repeatCustomers / uniqueEmails.size) * 100 : 0;

      // Orders by day for chart
      const ordersByDay = new Map<string, { date: string; orders: number; revenue: number }>();
      orders?.forEach(o => {
        const date = new Date(o.created_at).toLocaleDateString('en-ZA');
        const existing = ordersByDay.get(date) || { date, orders: 0, revenue: 0 };
        existing.orders += 1;
        existing.revenue += o.total_amount || 0;
        ordersByDay.set(date, existing);
      });

      // Status distribution
      const statusCounts = {
        pending: orders?.filter(o => o.status === 'pending').length || 0,
        processing: orders?.filter(o => o.status === 'processing').length || 0,
        shipped: orders?.filter(o => o.status === 'shipped').length || 0,
        delivered: orders?.filter(o => o.status === 'delivered').length || 0,
        completed: orders?.filter(o => o.status === 'completed').length || 0,
        cancelled: orders?.filter(o => o.status === 'cancelled').length || 0,
      };

      return {
        totalOrders,
        totalRevenue,
        averageOrderValue,
        avgFulfillmentHours,
        repeatRate,
        uniqueCustomers: uniqueEmails.size,
        ordersByDay: Array.from(ordersByDay.values()).slice(-14), // Last 14 days
        statusCounts,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Orders (30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R{metrics?.totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Avg Fulfillment Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.avgFulfillmentHours.toFixed(1)}h
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              Repeat Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.repeatRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Daily Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics?.ordersByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="orders" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary) / 0.2)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Order Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { status: 'Pending', count: metrics?.statusCounts.pending },
                  { status: 'Processing', count: metrics?.statusCounts.processing },
                  { status: 'Shipped', count: metrics?.statusCounts.shipped },
                  { status: 'Delivered', count: metrics?.statusCounts.delivered },
                  { status: 'Completed', count: metrics?.statusCounts.completed },
                  { status: 'Cancelled', count: metrics?.statusCounts.cancelled },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
