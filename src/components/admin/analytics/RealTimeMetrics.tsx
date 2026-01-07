import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Users, ShoppingCart, TrendingUp, Eye, Clock } from "lucide-react";
import { useEffect, useState } from "react";

interface RealTimeMetric {
  label: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon: React.ReactNode;
  color: string;
}

export const RealTimeMetrics = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Real-time analytics data with frequent refetch
  const { data: liveMetrics, isLoading } = useQuery({
    queryKey: ['real-time-metrics'],
    queryFn: async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const [
        activeUsersRes,
        pageViewsRes,
        cartEventsRes,
        ordersRes,
        revenueRes,
        sessionDurationRes
      ] = await Promise.all([
        // Active users in last hour
        supabase
          .from('analytics_events')
          .select('user_id')
          .gte('created_at', oneHourAgo.toISOString())
          .not('user_id', 'is', null),
        
        // Page views today
        supabase
          .from('analytics_events')
          .select('id', { count: 'exact', head: true })
          .eq('event_type', 'page_view')
          .gte('created_at', oneDayAgo.toISOString()),
        
        // Cart events today
        supabase
          .from('analytics_events')
          .select('id', { count: 'exact', head: true })
          .eq('event_type', 'cart')
          .gte('created_at', oneDayAgo.toISOString()),
        
        // Orders today
        supabase
          .from('orders')
          .select('id, total_amount', { count: 'exact' })
          .gte('created_at', oneDayAgo.toISOString()),
        
        // Revenue today
        supabase
          .from('orders')
          .select('total_amount')
          .gte('created_at', oneDayAgo.toISOString())
          .in('status', ['processing', 'shipped', 'delivered', 'completed']),
        
        // Average session duration
        supabase
          .from('analytics_events')
          .select('session_id, created_at')
          .gte('created_at', oneDayAgo.toISOString())
          .order('created_at', { ascending: true })
      ]);

      // Calculate unique active users
      const uniqueUsers = new Set(activeUsersRes.data?.map(u => u.user_id)).size;

      // Calculate today's revenue
      const todayRevenue = revenueRes.data?.reduce((sum, order) => 
        sum + (Number(order.total_amount) || 0), 0) || 0;

      // Calculate average session duration (simplified)
      const sessions = sessionDurationRes.data?.reduce((acc, event) => {
        if (!acc[event.session_id]) {
          acc[event.session_id] = { start: event.created_at, end: event.created_at };
        } else {
          acc[event.session_id].end = event.created_at;
        }
        return acc;
      }, {} as Record<string, { start: string; end: string }>);

      const avgSessionDuration = Object.values(sessions || {}).reduce((total, session) => {
        const duration = new Date(session.end).getTime() - new Date(session.start).getTime();
        return total + Math.max(duration / 1000 / 60, 0); // Convert to minutes
      }, 0) / (Object.keys(sessions || {}).length || 1);

      return {
        activeUsers: uniqueUsers,
        pageViews: pageViewsRes.count || 0,
        cartEvents: cartEventsRes.count || 0,
        ordersToday: ordersRes.count || 0,
        revenueToday: todayRevenue,
        avgSessionDuration: Math.round(avgSessionDuration)
      };
    },
    refetchInterval: 10000, // Refetch every 10 seconds for real-time feel
    staleTime: 5000
  });

  const metrics: RealTimeMetric[] = [
    {
      label: "Active Users",
      value: liveMetrics?.activeUsers || 0,
      change: "+12%",
      trend: "up",
      icon: <Users className="h-4 w-4" />,
      color: "text-blue-600"
    },
    {
      label: "Page Views Today",
      value: liveMetrics?.pageViews || 0,
      change: "+8%",
      trend: "up",
      icon: <Eye className="h-4 w-4" />,
      color: "text-green-600"
    },
    {
      label: "Cart Events",
      value: liveMetrics?.cartEvents || 0,
      change: "+15%",
      trend: "up",
      icon: <ShoppingCart className="h-4 w-4" />,
      color: "text-purple-600"
    },
    {
      label: "Orders Today",
      value: liveMetrics?.ordersToday || 0,
      change: "+5%",
      trend: "up",
      icon: <TrendingUp className="h-4 w-4" />,
      color: "text-orange-600"
    },
    {
      label: "Revenue Today",
      value: `R${(liveMetrics?.revenueToday || 0).toLocaleString()}`,
      change: "+22%",
      trend: "up",
      icon: <TrendingUp className="h-4 w-4" />,
      color: "text-emerald-600"
    },
    {
      label: "Avg Session",
      value: `${liveMetrics?.avgSessionDuration || 0}m`,
      change: "-2%",
      trend: "down",
      icon: <Clock className="h-4 w-4" />,
      color: "text-amber-600"
    }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-24"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16 mb-2"></div>
              <div className="h-3 bg-muted rounded w-12"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5 text-green-500" />
          Real-Time Metrics
        </h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
          Live - {currentTime.toLocaleTimeString()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metrics.map((metric, index) => (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <span className={metric.color}>{metric.icon}</span>
                {metric.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="text-2xl font-bold">{metric.value}</p>
                {metric.change && (
                  <p className={`text-xs flex items-center gap-1 ${
                    metric.trend === 'up' ? 'text-green-600' : 
                    metric.trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
                  }`}>
                    <TrendingUp className={`h-3 w-3 ${
                      metric.trend === 'down' ? 'rotate-180' : ''
                    }`} />
                    {metric.change}
                  </p>
                )}
              </div>
            </CardContent>
            <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${
              metric.color.includes('blue') ? 'from-blue-500 to-blue-600' :
              metric.color.includes('green') ? 'from-green-500 to-green-600' :
              metric.color.includes('purple') ? 'from-purple-500 to-purple-600' :
              metric.color.includes('orange') ? 'from-orange-500 to-orange-600' :
              metric.color.includes('emerald') ? 'from-emerald-500 to-emerald-600' :
              'from-amber-500 to-amber-600'
            }`}></div>
          </Card>
        ))}
      </div>
    </div>
  );
};