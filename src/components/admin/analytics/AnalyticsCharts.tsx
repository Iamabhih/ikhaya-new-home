import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from "recharts";

interface CategoryPerformance {
  name: string;
  products: number;
  totalValue: number;
  avgPrice: number;
  fill?: string;
}

interface SalesTrend {
  date: string;
  sales: number;
  orders: number;
  revenue: number;
}

interface CustomerSegment {
  name: string;
  value: number;
}

interface ProductPerformanceItem {
  name: string;
  value: number;
  revenue: number;
}

interface DailyMetric {
  date: string;
  orders: number;
  revenue: number;
  sales?: number;
}

export interface AnalyticsChartsProps {
  categoryPerformance?: CategoryPerformance[];
  salesTrend?: SalesTrend[];
  customerSegments?: CustomerSegment[];
  productPerformance?: ProductPerformanceItem[];
  dailyMetrics?: DailyMetric[];
  isLoading?: boolean;
}

// Premium chart configuration using design system colors
const chartConfig = {
  sales: {
    label: "Sales",
    color: "hsl(var(--chart-1))",
  },
  orders: {
    label: "Orders", 
    color: "hsl(var(--chart-2))",
  },
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-3))",
  },
  products: {
    label: "Products",
    color: "hsl(var(--chart-4))",
  },
  totalValue: {
    label: "Total Value",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig;

// Premium color palette from design system
const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export const AnalyticsCharts = ({ 
  categoryPerformance = [], 
  salesTrend = [],
  customerSegments = [],
  productPerformance = [],
  dailyMetrics = [],
  isLoading = false
}: AnalyticsChartsProps) => {
  
  // Use daily metrics for trend data if salesTrend is empty
  const trendData = salesTrend.length > 0 ? salesTrend : dailyMetrics.map(m => ({
    date: m.date,
    sales: m.sales || m.orders,
    orders: m.orders,
    revenue: m.revenue
  }));
  
  const categoryData = categoryPerformance.map((item, index) => ({
    ...item,
    fill: item.fill || CHART_COLORS[index % CHART_COLORS.length]
  }));

  // Use customer segments for pie chart if category data is empty
  const pieData = categoryData.length > 0 
    ? categoryData 
    : customerSegments.map((seg, index) => ({
        name: seg.name,
        products: seg.value,
        totalValue: 0,
        avgPrice: 0,
        fill: CHART_COLORS[index % CHART_COLORS.length]
      }));

  // Show empty state when no data
  const hasData = trendData.length > 0 || pieData.length > 0 || productPerformance.length > 0;

  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card rounded-lg border border-border/50 p-6 animate-pulse">
            <div className="h-6 bg-muted rounded mb-4"></div>
            <div className="h-[300px] bg-muted rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state when no data available
  if (!hasData) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card rounded-lg border border-border/50 p-6">
            <div className="h-6 bg-muted rounded mb-4"></div>
            <div className="h-[300px] bg-muted/30 rounded flex items-center justify-center">
              <p className="text-muted-foreground text-sm">No data available for selected period</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
      
      {/* Enhanced Revenue Trend Chart */}
      <Card className="bg-card border-border/50 shadow-modern-sm">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            Revenue Trend Analysis
            <div className="h-2 w-2 bg-chart-1 rounded-full animate-pulse"></div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="hsl(var(--border))" 
                  opacity={0.3}
                />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => `R${(value / 1000).toFixed(0)}k`}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent 
                    formatter={(value, name) => [
                      name === 'revenue' ? `R${Number(value).toLocaleString()}` : value,
                      chartConfig[name as keyof typeof chartConfig]?.label || name
                    ]}
                  />} 
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--chart-1))" 
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Category/Segment Distribution */}
      <Card className="bg-card border-border/50 shadow-modern-sm">
        <CardHeader>
          <CardTitle className="text-foreground">
            {customerSegments.length > 0 ? 'Customer Segments' : 'Category Distribution'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => 
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="hsl(var(--chart-1))"
                  dataKey={customerSegments.length > 0 ? "products" : "products"}
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                >
                  {pieData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.fill}
                    />
                  ))}
                </Pie>
                <ChartTooltip 
                  content={<ChartTooltipContent 
                    formatter={(value, name, props) => [
                      customerSegments.length > 0 ? `${value} customers` : `${value} products`,
                      props.payload?.name
                    ]}
                  />} 
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Sales vs Orders Comparison */}
      <Card className="bg-card border-border/50 shadow-modern-sm">
        <CardHeader>
          <CardTitle className="text-foreground">Sales Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trendData}>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="hsl(var(--border))" 
                  opacity={0.3}
                />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                />
                <ChartLegend 
                  content={<ChartLegendContent />} 
                />
                <Bar 
                  dataKey="sales" 
                  fill="hsl(var(--chart-1))" 
                  radius={[2, 2, 0, 0]}
                />
                <Bar 
                  dataKey="orders" 
                  fill="hsl(var(--chart-2))" 
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Product Performance or Category Value Analysis */}
      <Card className="bg-card border-border/50 shadow-modern-sm">
        <CardHeader>
          <CardTitle className="text-foreground">
            {productPerformance.length > 0 ? 'Top Products' : 'Category Value Analysis'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={productPerformance.length > 0 ? productPerformance : categoryData}
                layout="horizontal"
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="hsl(var(--border))" 
                  opacity={0.3}
                />
                <XAxis 
                  type="number"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => productPerformance.length > 0 
                    ? `R${(value / 1000).toFixed(0)}k` 
                    : `R${(value / 1000).toFixed(0)}k`}
                />
                <YAxis 
                  type="category"
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  width={80}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent 
                    formatter={(value, name) => [
                      `R${Number(value).toLocaleString()}`,
                      name === 'revenue' ? 'Revenue' : name === 'totalValue' ? 'Total Value' : name
                    ]}
                  />} 
                />
                <Bar 
                  dataKey={productPerformance.length > 0 ? "revenue" : "totalValue"} 
                  fill="hsl(var(--chart-3))"
                  radius={[0, 2, 2, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};
