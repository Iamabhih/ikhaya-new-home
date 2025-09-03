import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Users, Eye, Search, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';

export const VisitorAnalyticsDashboard = () => {
  // Fetch visitor overview stats
  const { data: visitorStats } = useQuery({
    queryKey: ['visitor-analytics-overview'],
    queryFn: async () => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [
        totalPageViewsRes,
        uniqueVisitorsRes,
        todayPageViewsRes,
        productViewsRes,
        searchesRes,
        cartAddsRes
      ] = await Promise.all([
        supabase
          .from('analytics_events')
          .select('id', { count: 'exact', head: true })
          .eq('event_type', 'page_view')
          .gte('created_at', thirtyDaysAgo),
        supabase
          .from('analytics_events')
          .select('session_id')
          .eq('event_type', 'page_view')
          .gte('created_at', thirtyDaysAgo),
        supabase
          .from('analytics_events')
          .select('id', { count: 'exact', head: true })
          .eq('event_type', 'page_view')
          .gte('created_at', today),
        supabase
          .from('analytics_events')
          .select('id', { count: 'exact', head: true })
          .eq('event_type', 'product_view')
          .gte('created_at', sevenDaysAgo),
        supabase
          .from('analytics_events')
          .select('id', { count: 'exact', head: true })
          .eq('event_type', 'search')
          .gte('created_at', sevenDaysAgo),
        supabase
          .from('analytics_events')
          .select('id', { count: 'exact', head: true })
          .eq('event_type', 'cart')
          .gte('created_at', sevenDaysAgo)
      ]);

      const uniqueVisitors = new Set(uniqueVisitorsRes.data?.map(v => v.session_id)).size;

      return {
        totalPageViews: totalPageViewsRes.count || 0,
        uniqueVisitors,
        todayPageViews: todayPageViewsRes.count || 0,
        productViews: productViewsRes.count || 0,
        searches: searchesRes.count || 0,
        cartAdds: cartAddsRes.count || 0
      };
    },
    staleTime: 300000,
  });

  // Fetch daily page views for chart
  const { data: dailyPageViews } = useQuery({
    queryKey: ['daily-page-views'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data } = await supabase
        .from('analytics_events')
        .select('created_at')
        .eq('event_type', 'page_view')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      // Group by date
      const dailyViews = data?.reduce((acc, event) => {
        const date = event.created_at.split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(dailyViews || {}).map(([date, views]) => ({
        date: new Date(date).toLocaleDateString(),
        views
      }));
    },
    staleTime: 300000,
  });

  // Fetch top pages
  const { data: topPages } = useQuery({
    queryKey: ['top-pages'],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data } = await supabase
        .from('analytics_events')
        .select('page_path')
        .eq('event_type', 'page_view')
        .gte('created_at', sevenDaysAgo.toISOString());

      const pageViews = data?.reduce((acc, event) => {
        const path = event.page_path || '/';
        acc[path] = (acc[path] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(pageViews || {})
        .map(([path, views]) => ({ path, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);
    },
    staleTime: 300000,
  });

  // Fetch event distribution
  const { data: eventDistribution } = useQuery({
    queryKey: ['event-distribution'],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data } = await supabase
        .from('analytics_events')
        .select('event_type')
        .gte('created_at', sevenDaysAgo.toISOString());

      const eventCounts = data?.reduce((acc, event) => {
        acc[event.event_type] = (acc[event.event_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(eventCounts || {}).map(([type, count]) => ({
        name: type.replace('_', ' ').toUpperCase(),
        value: count
      }));
    },
    staleTime: 300000,
  });

  const exportData = () => {
    const csvData = [
      ['Metric', 'Value'],
      ['Total Page Views (30 days)', visitorStats?.totalPageViews || 0],
      ['Unique Visitors (30 days)', visitorStats?.uniqueVisitors || 0],
      ['Today Page Views', visitorStats?.todayPageViews || 0],
      ['Product Views (7 days)', visitorStats?.productViews || 0],
      ['Searches (7 days)', visitorStats?.searches || 0],
      ['Cart Additions (7 days)', visitorStats?.cartAdds || 0],
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visitor-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Visitor Analytics</h2>
        <Button onClick={exportData} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Page Views (30d)</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{visitorStats?.totalPageViews || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{visitorStats?.uniqueVisitors || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{visitorStats?.todayPageViews || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Product Views (7d)</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{visitorStats?.productViews || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Searches (7d)</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{visitorStats?.searches || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cart Adds (7d)</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{visitorStats?.cartAdds || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Page Views Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Page Views (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyPageViews}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="views" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Event Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Event Distribution (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={eventDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {eventDistribution?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Pages */}
      <Card>
        <CardHeader>
          <CardTitle>Top Pages (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={topPages} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="path" type="category" width={150} />
              <Tooltip />
              <Bar dataKey="views" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};