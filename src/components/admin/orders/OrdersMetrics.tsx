import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Package, Clock, DollarSign } from "lucide-react";

export const OrdersMetrics = () => {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['order-metrics'],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, status, total_amount, created_at');
      
      if (error) throw error;

      const today = new Date();
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const twoMonthsAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);

      const currentMonthOrders = orders.filter(o => new Date(o.created_at) >= monthAgo);
      const previousMonthOrders = orders.filter(o => {
        const d = new Date(o.created_at);
        return d >= twoMonthsAgo && d < monthAgo;
      });

      const pendingOrders = orders.filter(o => ['pending', 'confirmed'].includes(o.status));

      const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const currentRevenue = currentMonthOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const previousRevenue = previousMonthOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

      const calcTrend = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };

      return {
        totalOrders: orders.length,
        currentMonthOrders: currentMonthOrders.length,
        previousMonthOrders: previousMonthOrders.length,
        pendingOrders: pendingOrders.length,
        totalRevenue,
        currentRevenue,
        previousRevenue,
        avgOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
        currentAvg: currentMonthOrders.length > 0 ? currentRevenue / currentMonthOrders.length : 0,
        previousAvg: previousMonthOrders.length > 0 ? previousRevenue / previousMonthOrders.length : 0,
        ordersTrend: calcTrend(currentMonthOrders.length, previousMonthOrders.length),
        revenueTrend: calcTrend(currentRevenue, previousRevenue),
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

  const formatTrend = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const metricCards = [
    {
      title: "Total Orders",
      value: metrics.totalOrders.toLocaleString(),
      subtitle: `${metrics.currentMonthOrders} this month`,
      icon: Package,
      trend: formatTrend(metrics.ordersTrend),
      trendUp: metrics.ordersTrend >= 0,
    },
    {
      title: "Awaiting Fulfillment",
      value: metrics.pendingOrders.toLocaleString(),
      subtitle: "Orders to process",
      icon: Clock,
      trend: metrics.pendingOrders > 10 ? "High" : "Normal",
      trendUp: metrics.pendingOrders <= 10,
    },
    {
      title: "Total Revenue",
      value: `R${metrics.totalRevenue.toLocaleString()}`,
      subtitle: `R${metrics.currentRevenue.toLocaleString()} this month`,
      icon: DollarSign,
      trend: formatTrend(metrics.revenueTrend),
      trendUp: metrics.revenueTrend >= 0,
    },
    {
      title: "Avg Order Value",
      value: `R${metrics.avgOrderValue.toFixed(2)}`,
      subtitle: `R${metrics.currentAvg.toFixed(2)} this month`,
      icon: TrendingUp,
      trend: formatTrend(
        metrics.previousAvg === 0
          ? (metrics.currentAvg > 0 ? 100 : 0)
          : ((metrics.currentAvg - metrics.previousAvg) / metrics.previousAvg) * 100
      ),
      trendUp: metrics.currentAvg >= metrics.previousAvg,
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
                  <span className={`text-xs font-medium mt-2 flex items-center gap-0.5 ${
                    metric.trendUp ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {metric.trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
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
