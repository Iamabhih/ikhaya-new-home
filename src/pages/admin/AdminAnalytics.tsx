

import { useAuth } from "@/hooks/useAuth";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  ChartConfig 
} from "@/components/ui/chart";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Area, AreaChart 
} from "recharts";
import { 
  TrendingUp, Users, ShoppingCart, DollarSign, 
  Eye, MousePointerClick, Package, Star 
} from "lucide-react";

const AdminAnalytics = () => {
  const { user } = useAuth();
  const { 
    overviewStats, 
    customerAnalytics, 
    productPerformance, 
    dailyMetrics, 
    eventAnalytics 
  } = useAnalyticsData();

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Access Denied</h1>
            <p className="text-muted-foreground">Please sign in to access analytics.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Chart configurations using theme-aware colors
  const revenueChartConfig = {
    revenue: {
      label: "Revenue",
      color: "hsl(var(--primary))",
    },
    orders: {
      label: "Orders", 
      color: "hsl(var(--secondary))",
    },
  } satisfies ChartConfig;

  const customerChartConfig = {
    customers: {
      label: "New Customers",
      color: "hsl(var(--primary))",
    },
  } satisfies ChartConfig;

  const eventChartConfig = {
    page_view: {
      label: "Page Views",
      color: "hsl(var(--primary))",
    },
    product_view: {
      label: "Product Views", 
      color: "hsl(var(--secondary))",
    },
    cart: {
      label: "Cart Additions",
      color: "hsl(var(--accent))",
    },
    purchase: {
      label: "Purchases",
      color: "hsl(var(--chart-1))",
    },
    search: {
      label: "Searches",
      color: "hsl(var(--chart-2))",
    },
  } satisfies ChartConfig;

  // Process daily metrics for charts with proper type checking
  const revenueData = dailyMetrics?.filter(m => m.metric_name === 'total_revenue').map(m => {
    const metadata = m.metadata as Record<string, any> || {};
    return {
      date: new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: Number(m.value),
      orders: Number(metadata.order_count || 0),
    };
  }) || [];

  const customerData = dailyMetrics?.filter(m => m.metric_name === 'new_registrations').map(m => ({
    date: new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    customers: Number(m.value),
  })) || [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 ml-auto text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R{overviewStats?.totalRevenue?.toFixed(2) || '0.00'}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 ml-auto text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overviewStats?.totalOrders || 0}</div>
              <p className="text-xs text-muted-foreground">
                +{overviewStats?.recentOrdersCount || 0} last 30 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 ml-auto text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overviewStats?.totalCustomers || 0}</div>
              <p className="text-xs text-muted-foreground">Registered users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
              <TrendingUp className="h-4 w-4 ml-auto text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R{overviewStats?.totalOrders ? (overviewStats.totalRevenue / overviewStats.totalOrders).toFixed(2) : '0.00'}
              </div>
              <p className="text-xs text-muted-foreground">Per order</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trend (Last 30 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={revenueChartConfig}>
                    <AreaChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="var(--color-revenue)" 
                        fill="var(--color-revenue)" 
                      />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Event Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle>User Activity (Last 7 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={eventChartConfig}>
                    <PieChart>
                      <Pie
                        data={eventAnalytics}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ event_type, count }) => `${event_type}: ${count}`}
                        outerRadius={80}
                        fill="var(--color-page_view)"
                        dataKey="count"
                      >
                        {eventAnalytics?.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={`var(--color-${entry.event_type})`} 
                          />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sales" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Daily Revenue & Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={revenueChartConfig}>
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="revenue" orientation="left" />
                    <YAxis yAxisId="orders" orientation="right" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar 
                      yAxisId="revenue" 
                      dataKey="revenue" 
                      fill="var(--color-revenue)" 
                      name="Revenue (R)" 
                    />
                    <Bar 
                      yAxisId="orders" 
                      dataKey="orders" 
                      fill="var(--color-orders)" 
                      name="Orders" 
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Customer Growth */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer Growth</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={customerChartConfig}>
                    <LineChart data={customerData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line 
                        type="monotone" 
                        dataKey="customers" 
                        stroke="var(--color-customers)" 
                      />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Top Customers */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Customers by Spend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {customerAnalytics?.slice(0, 5).map((customer, index) => (
                      <div key={customer.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{customer.first_name} {customer.last_name}</p>
                          <p className="text-sm text-muted-foreground">{customer.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">R{Number(customer.total_spent).toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">{customer.total_orders} orders</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Product Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {productPerformance?.slice(0, 10).map((product, index) => (
                    <div key={product.id} className="flex items-center justify-between p-4 border rounded">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">{product.category_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">R{Number(product.total_revenue).toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">{product.total_sold} sold</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="engagement" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Page Views</CardTitle>
                  <Eye className="h-4 w-4 ml-auto text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {eventAnalytics?.find(e => e.event_type === 'page_view')?.count || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Last 7 days</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Product Views</CardTitle>
                  <Package className="h-4 w-4 ml-auto text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {eventAnalytics?.find(e => e.event_type === 'product_view')?.count || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Last 7 days</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cart Additions</CardTitle>
                  <MousePointerClick className="h-4 w-4 ml-auto text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {eventAnalytics?.find(e => e.event_type === 'cart')?.count || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Last 7 days</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default AdminAnalytics;

