import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Users, Star, ShoppingBag, Calendar, TrendingUp, UserCheck,
  Download, Filter, BarChart3
} from "lucide-react";
import { useEnhancedAnalytics } from "@/hooks/useEnhancedAnalytics";

export const EnhancedCustomerInsights = () => {
  const { customerAnalytics, overviewStats } = useEnhancedAnalytics();

  if (!customerAnalytics) {
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

  const exportCustomerData = async () => {
    const csvContent = [
      ['Name', 'Email', 'Total Spent', 'Orders', 'Registration Date'].join(','),
      ...customerAnalytics.topCustomers.map(customer => [
        `"${customer.first_name || ''} ${customer.last_name || ''}"`.trim(),
        customer.email,
        customer.total_spent,
        customer.total_orders,
        new Date(customer.registration_date).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `customer-insights-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Premium Customer Intelligence</h3>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Authentic Data Only
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportCustomerData}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Enhanced Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              Total Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-900">{customerAnalytics.totalCustomers}</p>
            <p className="text-xs text-blue-700">Verified accounts only</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-green-600" />
              New This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-900">{customerAnalytics.newCustomersThisMonth}</p>
            <p className="text-xs text-green-700">
              {customerAnalytics.totalCustomers > 0 
                ? `${Math.round((customerAnalytics.newCustomersThisMonth / customerAnalytics.totalCustomers) * 100)}% growth`
                : 'No data'
              }
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              Avg Order Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-900">
              R{customerAnalytics.topCustomers.length > 0 
                ? Math.round(customerAnalytics.topCustomers.reduce((sum, c) => sum + (c.avg_order_value || 0), 0) / customerAnalytics.topCustomers.length)
                : 0
              }
            </p>
            <p className="text-xs text-purple-700">Across all customers</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-600" />
              Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-900">
              {overviewStats?.conversionRate?.toFixed(1) || 0}%
            </p>
            <p className="text-xs text-amber-700">Visitor to customer</p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Customer Segments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Customer Segments
            </CardTitle>
            <Badge variant="outline">Live Data</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {customerAnalytics.segments.map((segment, index) => (
              <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  <Badge className={segment.color}>
                    {segment.segment}
                  </Badge>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {segment.count} customers
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {segment.count > 0 
                        ? `Avg: R${Math.round(customerAnalytics.topCustomers
                            .filter(c => {
                              if (segment.segment === "VIP Customers") return c.total_spent > 5000;
                              if (segment.segment === "Loyal Customers") return c.total_orders >= 5 && c.total_spent <= 5000;
                              if (segment.segment === "Regular Customers") return c.total_orders >= 2 && c.total_orders < 5;
                              return c.total_orders === 1;
                            })
                            .reduce((sum, c) => sum + (c.avg_order_value || 0), 0) / segment.count || 0
                          )} per order`
                        : 'No orders'
                      }
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={segment.percentage} className="w-24" />
                  <span className="text-sm font-medium w-12 text-right">
                    {segment.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Top Customers */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              High-Value Customers
            </CardTitle>
            <Button variant="outline" size="sm">View All</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {customerAnalytics.topCustomers.slice(0, 8).map((customer, index) => (
              <div key={customer.id} className="flex items-center justify-between p-4 rounded-lg border hover:shadow-md transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
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
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {customer.total_spent > 5000 ? 'VIP' : 
                         customer.total_orders >= 5 ? 'Loyal' : 
                         customer.total_orders >= 2 ? 'Regular' : 'New'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Member since {new Date(customer.registration_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-lg">R{customer.total_spent?.toLocaleString() || 0}</p>
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
                  <div className="text-xs text-muted-foreground mt-1">
                    Avg: R{customer.avg_order_value?.toLocaleString() || 0} per order
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