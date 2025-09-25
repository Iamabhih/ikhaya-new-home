import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, ShoppingCart, DollarSign } from 'lucide-react';

interface ChartData {
  name: string;
  value: number;
  revenue?: number;
  orders?: number;
}

interface ImprovedAnalyticsChartsProps {
  customerSegments?: ChartData[];
  productPerformance?: ChartData[];
  dailyMetrics?: ChartData[];
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

  const sampleDailyMetrics = dailyMetrics.length > 0 ? dailyMetrics : [
    { name: 'Mon', value: 25, orders: 5 },
    { name: 'Tue', value: 32, orders: 8 },
    { name: 'Wed', value: 28, orders: 6 },
    { name: 'Thu', value: 45, orders: 12 },
    { name: 'Fri', value: 52, orders: 15 },
    { name: 'Sat', value: 48, orders: 11 },
    { name: 'Sun', value: 35, orders: 9 },
  ];

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
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={sampleDailyMetrics}>
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
              />
            </LineChart>
          </ResponsiveContainer>
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
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={sampleDailyMetrics}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="orders" fill="hsl(var(--chart-4))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};