import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Users, Star, ShoppingBag, Calendar, TrendingUp, UserCheck,
  Download, Filter, BarChart3
} from "lucide-react";
import { useImprovedAnalytics } from "@/hooks/useImprovedAnalytics";
import { Skeleton } from "@/components/ui/skeleton";

export const EnhancedCustomerInsights = () => {
  const { customerAnalytics, overviewStats } = useImprovedAnalytics();

  if (!customerAnalytics || !overviewStats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Transform data for display
  const topCustomers = customerAnalytics.slice(0, 8);
  const totalCustomers = overviewStats.totalCustomers;
  const newThisMonth = customerAnalytics.filter(c => {
    const thisMonth = new Date();
    thisMonth.setDate(1);
    return new Date(c.registration_date) >= thisMonth;
  }).length;

  const exportCustomerData = async () => {
    try {
      const csvContent = [
        ['Name', 'Email', 'Total Spent', 'Orders', 'Segment', 'Registered'],
        ...topCustomers.map(customer => [
          customer.display_name || 'N/A',
          customer.email || 'N/A',
          `R${customer.total_spent.toFixed(2)}`,
          customer.total_orders.toString(),
          customer.customer_segment || 'N/A',
          new Date(customer.registration_date).toLocaleDateString()
        ])
      ]
        .map(row => row.join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customer-analytics-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (error) {
      console.error('Error exporting customer data:', error);
    }
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
            <p className="text-2xl font-bold text-blue-900">{totalCustomers.toLocaleString()}</p>
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
            <p className="text-2xl font-bold text-green-900">{newThisMonth.toLocaleString()}</p>
            <p className="text-xs text-green-700">
              {totalCustomers > 0 
                ? `${Math.round((newThisMonth / totalCustomers) * 100)}% growth`
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
              R{((overviewStats.totalRevenue || 0) / Math.max(overviewStats.totalOrders || 1, 1)).toFixed(2)}
            </p>
            <p className="text-xs text-purple-700">Per transaction</p>
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
          <div className="space-y-6">
            {[
              { segment: 'VIP', count: customerAnalytics.filter(c => c.customer_segment === 'VIP').length, color: 'bg-purple-100 text-purple-800' },
              { segment: 'Loyal', count: customerAnalytics.filter(c => c.customer_segment === 'Loyal').length, color: 'bg-blue-100 text-blue-800' },
              { segment: 'Regular', count: customerAnalytics.filter(c => c.customer_segment === 'Regular').length, color: 'bg-green-100 text-green-800' },
              { segment: 'New', count: customerAnalytics.filter(c => c.customer_segment === 'New').length, color: 'bg-yellow-100 text-yellow-800' },
            ].map((segment, index) => {
              const percentage = totalCustomers > 0 ? Math.round((segment.count / totalCustomers) * 100) : 0;
              const avgOrderValue = customerAnalytics
                .filter(c => c.customer_segment === segment.segment)
                .reduce((sum, c) => sum + c.avg_order_value, 0) / Math.max(segment.count, 1);
              
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={segment.color}>
                        {segment.segment}
                      </Badge>
                      <span className="text-sm font-medium">{segment.count} customers</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Avg: R{avgOrderValue.toFixed(2)}
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                  <p className="text-xs text-muted-foreground">{percentage}% of total</p>
                </div>
              );
            })}
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
            {topCustomers.map((customer, index) => (
              <div key={customer.id} className="flex items-center justify-between p-4 rounded-lg border hover:shadow-md transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">
                      {customer.display_name || customer.email}
                    </p>
                    <p className="text-sm text-muted-foreground">{customer.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {customer.customer_segment}
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
                      {customer.last_order_date ? 
                        `${Math.ceil((new Date().getTime() - new Date(customer.last_order_date).getTime()) / (1000 * 60 * 60 * 24))}d ago` 
                        : 'No orders'}
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