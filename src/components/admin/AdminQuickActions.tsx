
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, ShoppingCart, Users, Plus, BarChart3, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const AdminQuickActions = () => {
  const { data: quickStats } = useQuery({
    queryKey: ['admin-quick-stats'],
    queryFn: async () => {
      const [productsRes, ordersRes, usersRes] = await Promise.all([
        supabase.from('products').select('id').eq('is_active', true),
        supabase.from('orders').select('id, status').eq('status', 'pending'),
        supabase.from('profiles').select('id')
      ]);

      return {
        totalProducts: productsRes.data?.length || 0,
        pendingOrders: ordersRes.data?.length || 0,
        totalUsers: usersRes.data?.length || 0,
      };
    },
  });

  const quickActions = [
    {
      title: "Add Product",
      description: "Create a new product",
      icon: Plus,
      href: "/admin/products",
      color: "bg-blue-500",
    },
    {
      title: "Manage Orders",
      description: `${quickStats?.pendingOrders || 0} pending orders`,
      icon: ShoppingCart,
      href: "/admin/orders",
      color: "bg-green-500",
      badge: quickStats?.pendingOrders || 0,
    },
    {
      title: "User Management",
      description: `${quickStats?.totalUsers || 0} total users`,
      icon: Users,
      href: "/admin/users",
      color: "bg-purple-500",
    },
    {
      title: "Analytics",
      description: "View reports and insights",
      icon: BarChart3,
      href: "/admin/analytics",
      color: "bg-orange-500",
    },
    {
      title: "Settings",
      description: "Payment & system settings",
      icon: Settings,
      href: "/admin/payments",
      color: "bg-gray-500",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} to={action.href}>
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start space-y-2 w-full hover:bg-muted transition-colors"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className={`${action.color} p-2 rounded-md text-white`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    {action.badge && action.badge > 0 && (
                      <Badge variant="destructive">{action.badge}</Badge>
                    )}
                  </div>
                  <div className="text-left">
                    <div className="font-medium">{action.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {action.description}
                    </div>
                  </div>
                </Button>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
