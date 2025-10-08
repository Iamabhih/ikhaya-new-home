import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, ShoppingCart, DollarSign } from 'lucide-react';
import type { DailyMetric } from "@/hooks/useDailyMetrics";

interface ChartData {
  name: string;
  value: number;
  revenue?: number;
  orders?: number;
}

interface ImprovedAnalyticsChartsProps {
  customerSegments?: ChartData[];
  productPerformance?: ChartData[];
  dailyMetrics?: DailyMetric[];
  isLoading?: boolean;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export const ImprovedAnalyticsCharts = ({ 
  customerSegments = [], 
  productPerformance = [], 
  dailyMetrics = [], 
  isLoading = false 
}: ImprovedAnalyticsChartsProps) => {
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Generate sample data if no data is provided
  const sampleCustomerSegments = customerSegments.length > 0 ? customerSegments : [
    { name: 'VIP', value: 5 },
    { name: 'Loyal', value: 12 },
    { name: 'Regular', value: 25 },
    { name: 'New', value: 15 },
  ];

  const sampleProductPerformance = productPerformance.length > 0 ? productPerformance : [
    { name: 'Product A', value: 150, revenue: 1500 },
    { name: 'Product B', value: 120, revenue: 1200 },
    { name: 'Product C', value: 100, revenue: 800 },
    { name: 'Product D', value: 80, revenue: 600 },
    { name: 'Product E', value: 60, revenue: 400 },
  ];

  // Transform daily metrics for charts
  const trafficData = dailyMetrics?.length 
    ? dailyMetrics.map(m => ({
        name: new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: m.pageViews
      }))
    : [];

  const ordersData = dailyMetrics?.length
    ? dailyMetrics.map(m => ({
        name: new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        orders: m.orders
      }))
    : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Customer Segments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-chart-1" />
            Customer Segments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={sampleCustomerSegments}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {sampleCustomerSegments.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Product Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-chart-2" />
            Top Products (Revenue)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={sampleProductPerformance}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'revenue' ? `R${value}` : value,
                  name === 'revenue' ? 'Revenue' : 'Units Sold'
                ]}
              />
              <Bar dataKey="revenue" fill="hsl(var(--chart-2))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Daily Traffic */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-chart-3" />
            Weekly Traffic
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trafficData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trafficData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--chart-3))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--chart-3))" }}
                  name="Page Views"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground">
              No traffic data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-chart-4" />
            Weekly Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ordersData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={ordersData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="orders" fill="hsl(var(--chart-4))" name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground">
              No orders data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};