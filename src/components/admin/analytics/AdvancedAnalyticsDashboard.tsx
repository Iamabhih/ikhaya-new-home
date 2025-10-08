import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Filter } from "lucide-react";
import { EnhancedCustomerInsights } from "./EnhancedCustomerInsights";
import { ConversionFunnel } from "./ConversionFunnel";
import { ActivityFeed } from "./ActivityFeed";
import { AnalyticsTestPanel } from "./AnalyticsTestPanel";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { useImprovedAnalytics } from "@/hooks/useImprovedAnalytics";
import { useDailyMetrics } from "@/hooks/useDailyMetrics";
import { useAnalyticsInsights } from "@/hooks/useAnalyticsInsights";
import { ImprovedAnalyticsCharts } from "./ImprovedAnalyticsCharts";
import { ImprovedRealTimeMetrics } from "./ImprovedRealTimeMetrics";
import { useState } from "react";
import { TrendingUp, Users, ShoppingCart, DollarSign } from "lucide-react";
import { DateRange } from "react-day-picker";

export const AdvancedAnalyticsDashboard = () => {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date()
  });

  const { overviewStats, customerAnalytics, productPerformance, isLoading: analyticsLoading } = useImprovedAnalytics();
  const { data: dailyMetrics, isLoading: metricsLoading } = useDailyMetrics(dateRange);
  const { data: insights } = useAnalyticsInsights(dateRange);

  // Transform customer analytics into chart segments
  const customerSegments = customerAnalytics?.reduce((acc, customer) => {
    const segment = acc.find(s => s.name === customer.customer_segment);
    if (segment) {
      segment.value++;
    } else {
      acc.push({ name: customer.customer_segment, value: 1 });
    }
    return acc;
  }, [] as Array<{ name: string; value: number }>);

  // Transform product performance into chart data
  const productChartData = productPerformance?.slice(0, 10).map(p => ({
    name: p.product_name.substring(0, 20),
    value: p.total_revenue,
    revenue: p.total_revenue
  }));

  const handleExport = async () => {
    try {
      const data = { 
        overviewStats, 
        customerAnalytics,
        productPerformance, 
        dailyMetrics,
        timestamp: new Date() 
      };
      const jsonContent = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'analytics-export.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Enhanced Header with Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Premium Analytics Dashboard
          </h1>
          <p className="text-muted-foreground text-base">
            Real-time insights, customer intelligence, and business metrics
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <DatePickerWithRange 
            date={dateRange}
            setDate={setDateRange}
            placeholder="Select date range"
          />
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.reload()}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Refresh
          </Button>
          <Button 
            variant="default" 
            size="sm"
            onClick={handleExport}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6 bg-muted/50">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="conversion">Conversion</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <ImprovedRealTimeMetrics onExport={handleExport} />
          
          {/* Overview Stats Cards */}
          {overviewStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Customers</p>
                      <p className="text-2xl font-bold">{overviewStats.totalCustomers}</p>
                    </div>
                    <Users className="h-8 w-8 text-chart-1" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                      <p className="text-2xl font-bold">{overviewStats.totalOrders}</p>
                    </div>
                    <ShoppingCart className="h-8 w-8 text-chart-2" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                      <p className="text-2xl font-bold">R{overviewStats.totalRevenue.toFixed(2)}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-chart-3" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                      <p className="text-2xl font-bold">{overviewStats.conversionRate}%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-chart-4" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <ImprovedAnalyticsCharts 
            customerSegments={customerSegments}
            productPerformance={productChartData}
            dailyMetrics={dailyMetrics}
            isLoading={metricsLoading}
          />
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          <EnhancedCustomerInsights />
        </TabsContent>

        <TabsContent value="conversion" className="space-y-6">
          <ConversionFunnel />
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <ActivityFeed />
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-chart-1" />
                  Performance Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-chart-1/10 rounded-lg">
                    <span className="text-sm font-medium">Best Performing Day</span>
                    <span className="text-lg font-bold text-chart-1">{insights?.peakDay || 'Loading...'}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-chart-2/10 rounded-lg">
                    <span className="text-sm font-medium">Peak Hours</span>
                    <span className="text-lg font-bold text-chart-2">{insights?.peakHour || 'Loading...'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-chart-3" />
                  Customer Behavior
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-chart-3/10 rounded-lg">
                    <span className="text-sm font-medium">Total Sessions</span>
                    <span className="text-lg font-bold text-chart-3">{insights?.totalSessions || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-chart-4/10 rounded-lg">
                    <span className="text-sm font-medium">Conversion Rate</span>
                    <span className="text-lg font-bold text-chart-4">{insights?.conversionRate || 0}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="diagnostics" className="space-y-6">
          <AnalyticsTestPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};