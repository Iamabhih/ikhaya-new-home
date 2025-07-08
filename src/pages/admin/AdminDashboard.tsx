
import { useAuth } from "@/contexts/AuthContext";
import { useRoles } from "@/hooks/useRoles";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, Users, CreditCard, TrendingUp, AlertTriangle, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { AdminQuickActions } from "@/components/admin/AdminQuickActions";
import { AdminLayout } from "@/components/admin/AdminLayout";

const AdminDashboard = () => {
  const { user } = useAuth();
  const { roles } = useRoles(user);

  // Fetch dashboard statistics
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [productsRes, ordersRes, customersRes, revenueRes] = await Promise.all([
        supabase.from('products').select('id, stock_quantity').eq('is_active', true),
        supabase.from('orders').select('id, total_amount, status, created_at'),
        supabase.from('profiles').select('id'),
        supabase.from('orders').select('total_amount').eq('status', 'delivered')
      ]);

      const totalProducts = productsRes.data?.length || 0;
      const totalOrders = ordersRes.data?.length || 0;
      const totalCustomers = customersRes.data?.length || 0;
      const totalRevenue = revenueRes.data?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;
      const lowStockProducts = productsRes.data?.filter(p => p.stock_quantity <= 5).length || 0;

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
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">
                {roles.includes('superadmin') ? 'SuperAdmin Dashboard' : 'Admin Dashboard'}
              </h1>
              <p className="text-muted-foreground">
                Welcome back! Current roles: {roles.join(', ')}
              </p>
            </div>
            {stats?.lowStockProducts > 0 && (
              <div className="flex items-center gap-2 bg-orange-50 text-orange-700 px-3 py-2 rounded-lg">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">{stats.lowStockProducts} products low in stock</span>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <AdminQuickActions />
          </div>
          
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                <Package className="h-4 w-4 ml-auto" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalProducts || 0}</div>
                <p className="text-xs text-muted-foreground">Active products</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 ml-auto" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
                <p className="text-xs text-muted-foreground">
                  +{stats?.recentOrdersCount || 0} this week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                <Users className="h-4 w-4 ml-auto" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalCustomers || 0}</div>
                <p className="text-xs text-muted-foreground">Registered users</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                <CreditCard className="h-4 w-4 ml-auto" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R{stats?.totalRevenue?.toFixed(2) || '0.00'}</div>
                <p className="text-xs text-muted-foreground">Delivered orders</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Daily Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Daily Revenue (Last 7 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats?.dailyRevenue || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`R${value}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Order Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Order Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats?.statusDistribution || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ status, count }) => `${status}: ${count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {stats?.statusDistribution?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6">
            <Link to="/admin/products">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Manage Products
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Add, edit, and manage your product catalog</p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/admin/orders">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Manage Orders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Process and track customer orders</p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/admin/homepage">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Homepage Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Manage featured categories and products</p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/admin/analytics">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">View detailed analytics and insights</p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/admin/payments">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Configure payment methods and integrations</p>
                </CardContent>
              </Card>
            </Link>

            {/* SuperAdmin Only Actions */}
            {roles.includes('superadmin') && (
              <>
                <Link to="/superadmin/settings">
                  <Card className="hover:shadow-md transition-shadow cursor-pointer border-destructive">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-destructive">
                        <Settings className="h-5 w-5" />
                        SuperAdmin Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">Manage categories, brands, and system configuration</p>
                    </CardContent>
                  </Card>
                </Link>

                <Link to="/admin/users">
                  <Card className="hover:shadow-md transition-shadow cursor-pointer border-destructive">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-destructive">
                        <Users className="h-5 w-5" />
                        User Management
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">Manage user roles and permissions</p>
                    </CardContent>
                  </Card>
                </Link>

                <Link to="/admin/setup">
                  <Card className="hover:shadow-md transition-shadow cursor-pointer border-destructive">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        Admin Setup
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">Configure admin roles and system settings</p>
                    </CardContent>
                  </Card>
                </Link>
              </>
            )}
          </div>
      </AdminLayout>
    </AdminProtectedRoute>
  );
};

export default AdminDashboard;
