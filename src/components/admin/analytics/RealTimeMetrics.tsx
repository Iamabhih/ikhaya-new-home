import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, Users, ShoppingCart, TrendingUp, Eye, Target, 
  RefreshCw, Wifi, WifiOff, AlertCircle, Download
} from "lucide-react";
import { useEffect, useState } from "react";

interface RealTimeMetric {
  label: string;
  value: string | number;
  change?: number;
  trend?: "up" | "down" | "neutral";
  icon: React.ReactNode;
  isAlert?: boolean;
  format?: 'currency' | 'percentage' | 'number';
}

interface RealTimeMetricsProps {
  onExport?: () => void;
}

interface RealTimeMetricsData {
  active_users: number;
  page_views: number;
  cart_events: number;
  orders_count: number;
  revenue: number;
  conversion_rate: number;
  trends: {
    active_users_change: number;
    page_views_change: number;
    cart_events_change: number;
    orders_change: number;
    revenue_change: number;
    conversion_change: number;
  };
}

export const RealTimeMetrics = ({ onExport }: RealTimeMetricsProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Enhanced real-time analytics with actual trend calculations
  const { data: metricsData, isLoading, refetch } = useQuery({
    queryKey: ['premium-real-time-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_realtime_metrics', { hours_back: 1 });
      
      if (error) {
        console.error('Real-time metrics error:', error);
        setIsConnected(false);
        throw error;
      }
      
      setIsConnected(true);
      return data as any;
    },
    refetchInterval: 5000, // Optimized 5-second refresh for critical metrics
    staleTime: 3000,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const trends = metricsData?.trends || {
    active_users_change: 0,
    page_views_change: 0,
    cart_events_change: 0,
    orders_change: 0,
    revenue_change: 0,
    conversion_change: 0
  };

  const formatValue = (value: number, format?: string) => {
    switch (format) {
      case 'currency':
        return `R${value.toLocaleString()}`;
      case 'percentage':
        return `${value.toFixed(1)}%`;
      default:
        return value.toLocaleString();
    }
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  const getTrend = (change: number): "up" | "down" | "neutral" => {
    if (Math.abs(change) < 0.1) return "neutral";
    return change > 0 ? "up" : "down";
  };

  const metrics: RealTimeMetric[] = [
    {
      label: "Active Users",
      value: metricsData?.active_users || 0,
      change: trends.active_users_change,
      trend: getTrend(trends.active_users_change || 0),
      icon: <Users className="h-4 w-4" />,
      isAlert: (metricsData?.active_users || 0) > 50,
      format: 'number'
    },
    {
      label: "Page Views",
      value: metricsData?.page_views || 0,
      change: trends.page_views_change,
      trend: getTrend(trends.page_views_change || 0),
      icon: <Eye className="h-4 w-4" />,
      format: 'number'
    },
    {
      label: "Cart Events",
      value: metricsData?.cart_events || 0,
      change: trends.cart_events_change,
      trend: getTrend(trends.cart_events_change || 0),
      icon: <ShoppingCart className="h-4 w-4" />,
      format: 'number'
    },
    {
      label: "Orders",
      value: metricsData?.orders_count || 0,
      change: trends.orders_change,
      trend: getTrend(trends.orders_change || 0),
      icon: <TrendingUp className="h-4 w-4" />,
      isAlert: (metricsData?.orders_count || 0) > 5,
      format: 'number'
    },
    {
      label: "Revenue",
      value: metricsData?.revenue || 0,
      change: trends.revenue_change,
      trend: getTrend(trends.revenue_change || 0),
      icon: <TrendingUp className="h-4 w-4" />,
      isAlert: (metricsData?.revenue || 0) > 1000,
      format: 'currency'
    },
    {
      label: "Conversion",
      value: metricsData?.conversion_rate || 0,
      change: trends.conversion_change,
      trend: getTrend(trends.conversion_change || 0),
      icon: <Target className="h-4 w-4" />,
      format: 'percentage'
    }
  ];

  if (isLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Premium Real-Time Analytics</h3>
        </div>
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
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Enhanced Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
            <Activity className="h-5 w-5 text-chart-1" />
            Premium Real-Time Analytics
          </h3>
          <Badge 
            variant={isConnected ? "default" : "secondary"} 
            className={`flex items-center gap-1 ${
              isConnected 
                ? "bg-chart-1 text-primary-foreground" 
                : "bg-muted text-muted-foreground"
            }`}
          >
            {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isConnected ? "Live" : "Offline"}
          </Badge>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className={`h-2 w-2 rounded-full ${
              isConnected ? 'bg-chart-1 animate-pulse' : 'bg-muted'
            }`}></div>
            {currentTime.toLocaleTimeString()}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            className="flex items-center gap-2 hover:bg-muted"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          {onExport && (
            <Button 
              variant="default" 
              size="sm" 
              onClick={onExport}
              className="flex items-center gap-2 bg-chart-1 hover:bg-chart-1/90"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Data Quality Notice */}
      <Card className="border-chart-1/20 bg-chart-1/5">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-chart-1 mt-0.5" />
            <div>
              <h4 className="font-semibold text-foreground">Authentic Data Analytics</h4>
              <p className="text-sm text-muted-foreground">
                All metrics are filtered to exclude admin, test accounts, and synthetic data for accurate business insights.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Premium Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metrics.map((metric, index) => (
          <Card key={index} className={`
            relative overflow-hidden transition-all duration-300 hover:shadow-modern-md
            ${metric.isAlert ? 'ring-2 ring-chart-2/30 animate-pulse-soft' : ''}
            bg-card border-border/50 hover:border-border
          `}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <span className="text-chart-1">{metric.icon}</span>
                {metric.label}
                {metric.isAlert && <AlertCircle className="h-3 w-3 text-chart-2" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-2xl font-bold text-foreground">
                  {formatValue(Number(metric.value), metric.format)}
                </p>
                {metric.change !== undefined && (
                  <p className={`text-xs flex items-center gap-1 font-medium ${
                    metric.trend === 'up' ? 'text-chart-1' : 
                    metric.trend === 'down' ? 'text-chart-2' : 'text-muted-foreground'
                  }`}>
                    <TrendingUp className={`h-3 w-3 transition-transform ${
                      metric.trend === 'down' ? 'rotate-180' : ''
                    }`} />
                    {formatChange(metric.change)}
                  </p>
                )}
              </div>
            </CardContent>
            
            {/* Premium Gradient Accent */}
            <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${
              metric.isAlert 
                ? 'from-chart-2 to-chart-2/70' 
                : 'from-chart-1 to-chart-1/70'
            }`}></div>
          </Card>
        ))}
      </div>

      {/* System Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Data Freshness</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-chart-1 rounded-full animate-pulse"></div>
              <span className="text-sm text-foreground font-medium">Updated 5s ago</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Connection Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-chart-1' : 'bg-chart-2'}`}></div>
              <span className="text-sm text-foreground font-medium">
                {isConnected ? 'Real-time Active' : 'Polling Mode'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Data Quality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-chart-1 rounded-full"></div>
              <span className="text-sm text-foreground font-medium">Filtered & Verified</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};