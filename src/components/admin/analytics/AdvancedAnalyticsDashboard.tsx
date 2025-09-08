import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RealTimeMetrics } from "./RealTimeMetrics";
import { CustomerInsights } from "./CustomerInsights";
import { ConversionFunnel } from "./ConversionFunnel";
import { ActivityFeed } from "./ActivityFeed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import { TrendingUp, Users, ShoppingCart, DollarSign } from "lucide-react";

export const AdvancedAnalyticsDashboard = () => {
  const { dailyMetrics, eventAnalytics } = useAnalyticsData();

  // Sample data for advanced charts
  const revenueData = dailyMetrics?.map(metric => ({
    date: new Date(metric.date).toLocaleDateString(),
    revenue: metric.value,
    orders: Math.floor(metric.value / 150) // Estimated orders
  })) || [];

  const channelData = [
    { name: 'Direct', value: 45, color: '#8884d8' },
    { name: 'Social Media', value: 25, color: '#82ca9d' },
    { name: 'Email', value: 15, color: '#ffc658' },
    { name: 'Search', value: 10, color: '#ff7300' },
    { name: 'Referral', value: 5, color: '#0088fe' }
  ];

  return (
    <div className="space-y-6">
      {/* Real-time metrics at the top */}
      <RealTimeMetrics />

      {/* Main analytics tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="conversion">Conversion</TabsTrigger>
          <TabsTrigger value="activity">Live Activity</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Revenue Trend (30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`R${value}`, 'Revenue']} />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      dot={{ fill: '#10b981' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Traffic Sources */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Traffic Sources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={channelData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {channelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Event Analytics Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-purple-600" />
                User Events (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={eventAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="event_type" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          <CustomerInsights />
        </TabsContent>

        <TabsContent value="conversion" className="space-y-6">
          <ConversionFunnel />
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <ActivityFeed />
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          {/* Business Intelligence Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Revenue Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium">Best Performing Day</span>
                    <span className="text-lg font-bold text-green-600">Monday</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium">Peak Hours</span>
                    <span className="text-lg font-bold text-blue-600">2PM - 4PM</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm font-medium">Average Order Value</span>
                    <span className="text-lg font-bold text-purple-600">R275</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-orange-600" />
                  Customer Behavior
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                    <span className="text-sm font-medium">Avg Session Duration</span>
                    <span className="text-lg font-bold text-orange-600">8m 24s</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-pink-50 rounded-lg">
                    <span className="text-sm font-medium">Bounce Rate</span>
                    <span className="text-lg font-bold text-pink-600">34%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg">
                    <span className="text-sm font-medium">Pages per Session</span>
                    <span className="text-lg font-bold text-indigo-600">4.2</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>AI-Powered Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border-l-4 border-green-500 bg-green-50">
                  <h4 className="font-semibold text-green-800">Opportunity: Cart Abandonment</h4>
                  <p className="text-sm text-green-700 mt-1">
                    78% of users abandon their cart. Consider implementing exit-intent popups or email reminders.
                  </p>
                </div>
                <div className="p-4 border-l-4 border-blue-500 bg-blue-50">
                  <h4 className="font-semibold text-blue-800">Optimization: Peak Hours</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Traffic spikes at 2-4 PM. Schedule promotions or new product launches during this time.
                  </p>
                </div>
                <div className="p-4 border-l-4 border-purple-500 bg-purple-50">
                  <h4 className="font-semibold text-purple-800">Insight: Customer Retention</h4>
                  <p className="text-sm text-purple-700 mt-1">
                    VIP customers have 3x higher lifetime value. Focus retention campaigns on this segment.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};