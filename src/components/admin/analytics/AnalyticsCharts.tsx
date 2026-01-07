
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

interface CategoryPerformance {
  name: string;
  products: number;
  totalValue: number;
  avgPrice: number;
}

interface SalesTrend {
  date: string;
  sales: number;
  orders: number;
}

interface AnalyticsChartsProps {
  categoryPerformance?: CategoryPerformance[];
  salesTrend?: SalesTrend[];
}

export const AnalyticsCharts = ({ categoryPerformance, salesTrend }: AnalyticsChartsProps) => {
  // Default sales trend data
  const defaultSalesTrend = [
    { date: '2024-01', sales: 4000, orders: 240 },
    { date: '2024-02', sales: 3000, orders: 139 },
    { date: '2024-03', sales: 2000, orders: 980 },
    { date: '2024-04', sales: 2780, orders: 390 },
    { date: '2024-05', sales: 1890, orders: 480 },
    { date: '2024-06', sales: 2390, orders: 380 },
  ];

  const trendData = salesTrend || defaultSalesTrend;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Sales Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="sales" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Category Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryPerformance || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="products"
              >
                {categoryPerformance?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
