import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Package, Clock, CheckCircle, AlertCircle, DollarSign } from "lucide-react";

export const OrdersMetrics = () => {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['order-metrics'],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, status, total_amount, created_at');
      
      if (error) throw error;

      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const todayOrders = orders.filter(o => 
        new Date(o.created_at).toDateString() === today.toDateString()
      );
      
      const weekOrders = orders.filter(o => 
        new Date(o.created_at) >= weekAgo
      );

      const monthOrders = orders.filter(o => 
        new Date(o.created_at) >= monthAgo
      );

      const pendingOrders = orders.filter(o => 
        ['pending', 'confirmed'].includes(o.status)
      );

      const processingOrders = orders.filter(o => 
        o.status === 'processing'
      );

      const fulfilledOrders = orders.filter(o => 
        o.status === 'delivered'
      );

      const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const monthRevenue = monthOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

      return {
        totalOrders: orders.length,
        todayOrders: todayOrders.length,
        weekOrders: weekOrders.length,
        monthOrders: monthOrders.length,
        pendingOrders: pendingOrders.length,
        processingOrders: processingOrders.length,
        fulfilledOrders: fulfilledOrders.length,
        totalRevenue,
        monthRevenue,
        avgOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0
      };
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-4 bg-muted animate-pulse rounded mb-2" />
              <div className="h-8 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  const metricCards = [
    {
      title: "Total Orders",
      value: metrics.totalOrders.toLocaleString(),
      subtitle: `${metrics.monthOrders} this month`,
      icon: Package,
      trend: "+12.3%"
    },
    {
      title: "Awaiting Fulfillment",
      value: metrics.pendingOrders.toLocaleString(),
      subtitle: "Orders to process",
      icon: Clock,
      trend: metrics.pendingOrders > 10 ? "High" : "Normal"
    },
    {
      title: "Total Revenue",
      value: `R${metrics.totalRevenue.toLocaleString()}`,
      subtitle: `R${metrics.monthRevenue.toLocaleString()} this month`,
      icon: DollarSign,
      trend: "+8.7%"
    },
    {
      title: "Avg Order Value",
      value: `R${metrics.avgOrderValue.toFixed(2)}`,
      subtitle: "Per order",
      icon: TrendingUp,
      trend: "+5.2%"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metricCards.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {metric.title}
                  </p>
                  <p className="text-2xl font-bold">{metric.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {metric.subtitle}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-green-600 font-medium mt-2">
                    {metric.trend}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};