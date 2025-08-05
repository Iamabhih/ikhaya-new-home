
import { useAuth } from "@/contexts/AuthContext";
import { useRoles } from "@/hooks/useRoles";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, ShoppingCart, Users, CreditCard, TrendingUp, AlertTriangle, Settings, Crown, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";

const AdminDashboard = () => {
  const { user } = useAuth();
  const { roles } = useRoles(user);

  // Fetch dashboard statistics
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [productsRes, ordersRes, customersRes, revenueRes, subscriptionsRes] = await Promise.all([
        supabase.from('products').select('id, stock_quantity').eq('is_active', true),
        supabase.from('orders').select('id, total_amount, status, created_at'),
        supabase.from('profiles').select('id'),
        supabase.from('orders').select('total_amount').eq('status', 'delivered'),
        supabase.from('newsletter_subscriptions').select('id, is_active, subscribed_at')
      ]);

      const totalProducts = productsRes.data?.length || 0;
      const totalOrders = ordersRes.data?.length || 0;
      const totalCustomers = customersRes.data?.length || 0;
      const totalRevenue = revenueRes.data?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;
      const lowStockProducts = productsRes.data?.filter(p => p.stock_quantity <= 5).length || 0;
      
      // Newsletter subscription metrics
      const totalSubscriptions = subscriptionsRes.data?.length || 0;
      const activeSubscriptions = subscriptionsRes.data?.filter(s => s.is_active).length || 0;
      
      // Recent subscriptions (last 30 days)
      const recentSubscriptions = subscriptionsRes.data?.filter(sub => {
        const subDate = new Date(sub.subscribed_at);
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        return subDate >= monthAgo;
      }) || [];

      // Order status distribution
      const statusCounts = ordersRes.data?.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Recent orders (last 7 days)
      const recentOrders = ordersRes.data?.filter(order => {
        const orderDate = new Date(order.created_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return orderDate >= weekAgo;
      }) || [];

      // Daily revenue for last 7 days
      const dailyRevenue = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayOrders = ordersRes.data?.filter(order => 
          order.created_at.startsWith(dateStr) && order.status === 'delivered'
        ) || [];
        
        const dayRevenue = dayOrders.reduce((sum, order) => sum + Number(order.total_amount), 0);
        
        dailyRevenue.push({
          date: date.toLocaleDateString('en-US', { weekday: 'short' }),
          revenue: dayRevenue
        });
      }

      return {
        totalProducts,
        totalOrders,
        totalCustomers,
        totalRevenue,
        lowStockProducts,
        recentOrdersCount: recentOrders.length,
        totalSubscriptions,
        activeSubscriptions,
        recentSubscriptionsCount: recentSubscriptions.length,
        statusDistribution: Object.entries(statusCounts).map(([status, count]) => ({
          status,
          count
        })),
        dailyRevenue
      };
    },
  });

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <div className="space-y-8">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                {roles.includes('superadmin') ? 'SuperAdmin Dashboard' : 'Admin Dashboard'}
              </h1>
              <p className="text-gray-600 text-base">
                Monitor your store performance and manage operations
              </p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1">
                  {roles.map((role) => (
                    <Badge 
                      key={role} 
                      variant={role === 'superadmin' ? 'destructive' : 'secondary'}
                      className="text-xs font-medium"
                    >
                      {role === 'superadmin' ? 'Super Admin' : role.charAt(0).toUpperCase() + role.slice(1)}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            {stats?.lowStockProducts > 0 && (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl shadow-sm">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium text-sm">Low Stock Alert</p>
                  <p className="text-xs">{stats.lowStockProducts} products need restocking</p>
                </div>
              </div>
            )}
          </div>

          
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
            <Card className="bg-white border border-gray-200/60 shadow-sm hover:shadow-md transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-gray-700">Total Products</CardTitle>
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <Package className="h-5 w-5 text-indigo-600" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-3xl font-bold text-gray-900">{stats?.totalProducts || 0}</div>
                <p className="text-sm text-gray-500">Active in your catalog</p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200/60 shadow-sm hover:shadow-md transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-gray-700">Total Orders</CardTitle>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-3xl font-bold text-gray-900">{stats?.totalOrders || 0}</div>
                <p className="text-sm text-gray-500">
                  <span className="text-green-600 font-medium">+{stats?.recentOrdersCount || 0}</span> this week
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200/60 shadow-sm hover:shadow-md transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-gray-700">Total Customers</CardTitle>
                <div className="p-2 bg-green-50 rounded-lg">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-3xl font-bold text-gray-900">{stats?.totalCustomers || 0}</div>
                <p className="text-sm text-gray-500">Registered users</p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200/60 shadow-sm hover:shadow-md transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-gray-700">Total Revenue</CardTitle>
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <CreditCard className="h-5 w-5 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-3xl font-bold text-gray-900">R{stats?.totalRevenue?.toFixed(2) || '0.00'}</div>
                <p className="text-sm text-gray-500">From delivered orders</p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200/60 shadow-sm hover:shadow-md transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-gray-700">Newsletter Subs</CardTitle>
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Mail className="h-5 w-5 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-3xl font-bold text-gray-900">{stats?.activeSubscriptions || 0}</div>
                <p className="text-sm text-gray-500">
                  <span className="text-green-600 font-medium">+{stats?.recentSubscriptionsCount || 0}</span> this month
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Daily Revenue Chart */}
            <Card className="bg-white border border-gray-200/60 shadow-sm">
              <CardHeader className="border-b border-gray-100 pb-4">
                <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-900">
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-indigo-600" />
                  </div>
                  Revenue Trends
                  <Badge variant="secondary" className="ml-auto">Last 7 days</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={stats?.dailyRevenue || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#64748b' }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#64748b' }}
                    />
                    <Tooltip 
                      formatter={(value) => [`R${value}`, 'Revenue']} 
                      contentStyle={{ 
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                    />
                    <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Order Status Distribution */}
            <Card className="bg-white border border-gray-200/60 shadow-sm">
              <CardHeader className="border-b border-gray-100 pb-4">
                <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-900">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <ShoppingCart className="h-5 w-5 text-blue-600" />
                  </div>
                  Order Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={stats?.statusDistribution || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ status, count }) => `${status}: ${count}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {stats?.statusDistribution?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
              <p className="text-sm text-gray-500">Manage your store efficiently</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              <Link to="/admin/products" className="group">
                <Card className="bg-white border border-gray-200/60 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all duration-200 h-full">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-indigo-50 rounded-xl group-hover:bg-indigo-100 transition-colors">
                        <Package className="h-6 w-6 text-indigo-600" />
                      </div>
                      <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-indigo-700">
                        Manage Products
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 text-sm leading-relaxed">Add, edit, and organize your product catalog with advanced inventory management</p>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/admin/orders" className="group">
                <Card className="bg-white border border-gray-200/60 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all duration-200 h-full">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                        <ShoppingCart className="h-6 w-6 text-blue-600" />
                      </div>
                      <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-blue-700">
                        Order Management
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 text-sm leading-relaxed">Process orders, update status, and track fulfillment efficiently</p>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/admin/analytics" className="group">
                <Card className="bg-white border border-gray-200/60 shadow-sm hover:shadow-lg hover:border-green-200 transition-all duration-200 h-full">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-green-50 rounded-xl group-hover:bg-green-100 transition-colors">
                        <TrendingUp className="h-6 w-6 text-green-600" />
                      </div>
                      <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-green-700">
                        Analytics & Reports
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 text-sm leading-relaxed">View detailed insights, generate reports, and track performance metrics</p>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/admin/subscriptions" className="group">
                <Card className="bg-white border border-gray-200/60 shadow-sm hover:shadow-lg hover:border-purple-200 transition-all duration-200 h-full">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-purple-50 rounded-xl group-hover:bg-purple-100 transition-colors">
                        <Mail className="h-6 w-6 text-purple-600" />
                      </div>
                      <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-purple-700">
                        Subscriptions
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 text-sm leading-relaxed">Manage newsletter subscribers and export mailing lists</p>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/admin/homepage" className="group">
                <Card className="bg-white border border-gray-200/60 shadow-sm hover:shadow-lg hover:border-emerald-200 transition-all duration-200 h-full">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-emerald-50 rounded-xl group-hover:bg-emerald-100 transition-colors">
                        <Settings className="h-6 w-6 text-emerald-600" />
                      </div>
                      <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-emerald-700">
                        Homepage Settings
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 text-sm leading-relaxed">Customize featured content and manage homepage layout</p>
                  </CardContent>
                </Card>
              </Link>

              {/* SuperAdmin Only Actions */}
              {roles.includes('superadmin') && (
                <>
                  <Link to="/superadmin/settings" className="group">
                    <Card className="bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 shadow-sm hover:shadow-lg hover:border-red-300 transition-all duration-200 h-full">
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-red-100 rounded-xl group-hover:bg-red-200 transition-colors">
                            <Settings className="h-6 w-6 text-red-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg font-semibold text-red-800 group-hover:text-red-900">
                              SuperAdmin Settings
                            </CardTitle>
                            <Badge variant="destructive" className="text-xs mt-1">
                              <Crown className="h-3 w-3 mr-1" />
                              Super Admin
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-red-700 text-sm leading-relaxed">Manage system configuration, categories, and global settings</p>
                      </CardContent>
                    </Card>
                  </Link>

                  <Link to="/admin/users" className="group">
                    <Card className="bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 shadow-sm hover:shadow-lg hover:border-red-300 transition-all duration-200 h-full">
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-red-100 rounded-xl group-hover:bg-red-200 transition-colors">
                            <Users className="h-6 w-6 text-red-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg font-semibold text-red-800 group-hover:text-red-900">
                              User Management
                            </CardTitle>
                            <Badge variant="destructive" className="text-xs mt-1">
                              <Crown className="h-3 w-3 mr-1" />
                              Super Admin
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-red-700 text-sm leading-relaxed">Manage user roles, permissions, and account administration</p>
                      </CardContent>
                    </Card>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </AdminLayout>
    </AdminProtectedRoute>
  );
};

export default AdminDashboard;
