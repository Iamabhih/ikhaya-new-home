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
  LineChart, 
  Line, 
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

interface PremiumAnalyticsChartsProps {
  categoryPerformance?: CategoryPerformance[];
  salesTrend?: SalesTrend[];
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

export const PremiumAnalyticsCharts = ({ 
  categoryPerformance = [], 
  salesTrend = [],
  isLoading = false
}: PremiumAnalyticsChartsProps) => {
  
  // Enhanced default data with better formatting
  const defaultSalesTrend = [
    { date: 'Jan', sales: 4200, orders: 245, revenue: 42500 },
    { date: 'Feb', sales: 3800, orders: 189, revenue: 38900 },
    { date: 'Mar', sales: 5100, orders: 298, revenue: 51200 },
    { date: 'Apr', sales: 4600, orders: 267, revenue: 46800 },
    { date: 'May', sales: 5500, orders: 324, revenue: 55300 },
    { date: 'Jun', sales: 4900, orders: 289, revenue: 49100 },
  ];

  const defaultCategoryPerformance = [
    { name: 'Electronics', products: 45, totalValue: 125000, avgPrice: 2780, fill: CHART_COLORS[0] },
    { name: 'Clothing', products: 89, totalValue: 89000, avgPrice: 1000, fill: CHART_COLORS[1] },
    { name: 'Home & Garden', products: 34, totalValue: 67000, avgPrice: 1970, fill: CHART_COLORS[2] },
    { name: 'Sports', products: 23, totalValue: 45000, avgPrice: 1956, fill: CHART_COLORS[3] },
    { name: 'Books', products: 67, totalValue: 23000, avgPrice: 343, fill: CHART_COLORS[4] },
  ];

  const trendData = salesTrend.length > 0 ? salesTrend : defaultSalesTrend;
  const categoryData = categoryPerformance.length > 0 ? categoryPerformance.map((item, index) => ({
    ...item,
    fill: item.fill || CHART_COLORS[index % CHART_COLORS.length]
  })) : defaultCategoryPerformance;

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

      {/* Enhanced Category Performance */}
      <Card className="bg-card border-border/50 shadow-modern-sm">
        <CardHeader>
          <CardTitle className="text-foreground">Category Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => 
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="hsl(var(--chart-1))"
                  dataKey="products"
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                >
                  {categoryData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.fill}
                    />
                  ))}
                </Pie>
                <ChartTooltip 
                  content={<ChartTooltipContent 
                    formatter={(value, name, props) => [
                      `${value} products`,
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

      {/* Category Value Analysis */}
      <Card className="bg-card border-border/50 shadow-modern-sm">
        <CardHeader>
          <CardTitle className="text-foreground">Category Value Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={categoryData}
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
                  tickFormatter={(value) => `R${(value / 1000).toFixed(0)}k`}
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
                      name === 'totalValue' ? `R${Number(value).toLocaleString()}` : value,
                      name === 'totalValue' ? 'Total Value' : name
                    ]}
                  />} 
                />
                <Bar 
                  dataKey="totalValue" 
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