import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, Star, ShoppingBag, Calendar, TrendingUp, UserCheck } from "lucide-react";

interface CustomerSegment {
  segment: string;
  count: number;
  percentage: number;
  avgOrderValue: number;
  color: string;
}

interface TopCustomer {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  total_spent: number;
  total_orders: number;
  avg_order_value: number;
  last_order_date: string;
  days_since_last_order: number;
}

export const CustomerInsights = () => {
  const { data: customerData, isLoading } = useQuery({
    queryKey: ['customer-insights'],
    queryFn: async () => {
      const [
        topCustomersRes,
        customerStatsRes,
        orderHistoryRes,
        profilesRes
      ] = await Promise.all([
        // Top customers by spending
        supabase
          .from('customer_analytics')
          .select('*')
          .order('total_spent', { ascending: false })
          .limit(10),

        // Customer statistics
        supabase
          .from('profiles')
          .select('id, created_at'),

        // Order history for segmentation
        supabase
          .from('orders')
          .select('user_id, total_amount, created_at, status')
          .in('status', ['processing', 'shipped', 'delivered', 'completed']),

        // Total customers
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
      ]);

      // Calculate customer segments
      const ordersByCustomer = orderHistoryRes.data?.reduce((acc, order) => {
        if (!order.user_id) return acc;
        if (!acc[order.user_id]) {
          acc[order.user_id] = { orders: 0, totalSpent: 0, lastOrder: order.created_at };
        }
        acc[order.user_id].orders += 1;
        acc[order.user_id].totalSpent += Number(order.total_amount);
        if (new Date(order.created_at) > new Date(acc[order.user_id].lastOrder)) {
          acc[order.user_id].lastOrder = order.created_at;
        }
        return acc;
      }, {} as Record<string, { orders: number; totalSpent: number; lastOrder: string }>);

      const segments: CustomerSegment[] = [
        {
          segment: "VIP Customers",
          count: Object.values(ordersByCustomer || {}).filter(c => c.totalSpent > 5000).length,
          percentage: 0,
          avgOrderValue: 0,
          color: "bg-purple-100 text-purple-800"
        },
        {
          segment: "Loyal Customers",
          count: Object.values(ordersByCustomer || {}).filter(c => c.orders >= 5 && c.totalSpent <= 5000).length,
          percentage: 0,
          avgOrderValue: 0,
          color: "bg-blue-100 text-blue-800"
        },
        {
          segment: "Regular Customers",
          count: Object.values(ordersByCustomer || {}).filter(c => c.orders >= 2 && c.orders < 5).length,
          percentage: 0,
          avgOrderValue: 0,
          color: "bg-green-100 text-green-800"
        },
        {
          segment: "New Customers",
          count: Object.values(ordersByCustomer || {}).filter(c => c.orders === 1).length,
          percentage: 0,
          avgOrderValue: 0,
          color: "bg-yellow-100 text-yellow-800"
        }
      ];

      const totalCustomers = profilesRes.count || 1;
      segments.forEach(segment => {
        segment.percentage = Math.round((segment.count / totalCustomers) * 100);
      });

      // Calculate new customers this month
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const newCustomersThisMonth = customerStatsRes.data?.filter(
        customer => new Date(customer.created_at) >= thisMonth
      ).length || 0;

      return {
        topCustomers: topCustomersRes.data as TopCustomer[] || [],
        segments,
        totalCustomers,
        newCustomersThisMonth,
        repeatCustomerRate: segments.find(s => s.segment === "Loyal Customers")?.percentage || 0
      };
    },
    staleTime: 300000 // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold">Customer Insights</h3>
      </div>

      {/* Customer Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              Total Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{customerData?.totalCustomers || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-green-600" />
              New This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{customerData?.newCustomersThisMonth || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              Repeat Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{customerData?.repeatCustomerRate || 0}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-600" />
              Avg Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">4.8</p>
          </CardContent>
        </Card>
      </div>

      {/* Customer Segments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Customer Segments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {customerData?.segments.map((segment, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <Badge className={segment.color}>
                    {segment.segment}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {segment.count} customers
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={segment.percentage} className="w-20" />
                  <span className="text-sm font-medium w-10 text-right">
                    {segment.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Customers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            Top Customers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {customerData?.topCustomers.slice(0, 5).map((customer, index) => (
              <div key={customer.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">
                      {customer.first_name && customer.last_name 
                        ? `${customer.first_name} ${customer.last_name}`
                        : customer.email
                      }
                    </p>
                    <p className="text-sm text-muted-foreground">{customer.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">R{customer.total_spent?.toLocaleString() || 0}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ShoppingBag className="h-3 w-3" />
                      {customer.total_orders || 0} orders
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {customer.days_since_last_order || 0}d ago
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};