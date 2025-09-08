import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingDown, Users, Eye, ShoppingCart, CreditCard, Package } from "lucide-react";

interface FunnelStep {
  name: string;
  count: number;
  percentage: number;
  dropoffRate: number;
  icon: React.ReactNode;
  color: string;
}

export const ConversionFunnel = () => {
  const { data: funnelData, isLoading } = useQuery({
    queryKey: ['conversion-funnel'],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [
        pageViewsRes,
        productViewsRes,
        cartEventsRes,
        checkoutEventsRes,
        ordersRes
      ] = await Promise.all([
        // Total page views
        supabase
          .from('analytics_events')
          .select('id', { count: 'exact', head: true })
          .eq('event_type', 'page_view')
          .gte('created_at', sevenDaysAgo.toISOString()),

        // Product page views
        supabase
          .from('analytics_events')
          .select('id', { count: 'exact', head: true })
          .eq('event_type', 'product_view')
          .gte('created_at', sevenDaysAgo.toISOString()),

        // Cart events (add to cart)
        supabase
          .from('analytics_events')
          .select('id', { count: 'exact', head: true })
          .eq('event_type', 'cart')
          .eq('event_name', 'item_added_to_cart')
          .gte('created_at', sevenDaysAgo.toISOString()),

        // Checkout initiated (estimated from orders)
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo.toISOString()),

        // Completed orders
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .in('status', ['processing', 'shipped', 'delivered', 'completed'])
          .gte('created_at', sevenDaysAgo.toISOString())
      ]);

      const pageViews = pageViewsRes.count || 0;
      const productViews = productViewsRes.count || 0;
      const cartEvents = cartEventsRes.count || 0;
      const checkoutEvents = checkoutEventsRes.count || 0;
      const completedOrders = ordersRes.count || 0;

      // Calculate conversion rates
      const steps: FunnelStep[] = [
        {
          name: "Website Visitors",
          count: pageViews,
          percentage: 100,
          dropoffRate: 0,
          icon: <Users className="h-4 w-4" />,
          color: "bg-blue-500"
        },
        {
          name: "Product Page Views",
          count: productViews,
          percentage: pageViews > 0 ? Math.round((productViews / pageViews) * 100) : 0,
          dropoffRate: pageViews > 0 ? Math.round(((pageViews - productViews) / pageViews) * 100) : 0,
          icon: <Eye className="h-4 w-4" />,
          color: "bg-green-500"
        },
        {
          name: "Added to Cart",
          count: cartEvents,
          percentage: productViews > 0 ? Math.round((cartEvents / productViews) * 100) : 0,
          dropoffRate: productViews > 0 ? Math.round(((productViews - cartEvents) / productViews) * 100) : 0,
          icon: <ShoppingCart className="h-4 w-4" />,
          color: "bg-yellow-500"
        },
        {
          name: "Checkout Initiated",
          count: checkoutEvents,
          percentage: cartEvents > 0 ? Math.round((checkoutEvents / cartEvents) * 100) : 0,
          dropoffRate: cartEvents > 0 ? Math.round(((cartEvents - checkoutEvents) / cartEvents) * 100) : 0,
          icon: <CreditCard className="h-4 w-4" />,
          color: "bg-orange-500"
        },
        {
          name: "Order Completed",
          count: completedOrders,
          percentage: checkoutEvents > 0 ? Math.round((completedOrders / checkoutEvents) * 100) : 0,
          dropoffRate: checkoutEvents > 0 ? Math.round(((checkoutEvents - completedOrders) / checkoutEvents) * 100) : 0,
          icon: <Package className="h-4 w-4" />,
          color: "bg-purple-500"
        }
      ];

      // Calculate overall conversion rate
      const overallConversionRate = pageViews > 0 ? Math.round((completedOrders / pageViews) * 100 * 100) / 100 : 0;

      return {
        steps,
        overallConversionRate,
        totalDropoffs: pageViews - completedOrders
      };
    },
    staleTime: 300000 // 5 minutes
  });

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-48"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-orange-600" />
            Conversion Funnel (Last 7 Days)
          </span>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Overall Conversion Rate</p>
            <p className="text-2xl font-bold text-green-600">
              {funnelData?.overallConversionRate || 0}%
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {funnelData?.steps.map((step, index) => {
            const isFirst = index === 0;
            const maxWidth = isFirst ? 100 : (step.count / funnelData.steps[0].count) * 100;
            
            return (
              <div key={step.name} className="relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${step.color} text-white`}>
                      {step.icon}
                    </div>
                    <div>
                      <p className="font-medium">{step.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {step.count.toLocaleString()} users
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{step.percentage}%</p>
                    {!isFirst && step.dropoffRate > 0 && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <TrendingDown className="h-3 w-3" />
                        {step.dropoffRate}% drop
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Visual funnel bar */}
                <div className="relative h-12 bg-muted rounded-lg overflow-hidden">
                  <div 
                    className={`h-full ${step.color} transition-all duration-500 flex items-center justify-center`}
                    style={{ width: `${maxWidth}%` }}
                  >
                    <span className="text-white font-semibold text-sm">
                      {step.count.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Dropoff visualization */}
                {!isFirst && step.dropoffRate > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-red-600">
                        {Math.round((funnelData.steps[index - 1].count - step.count))} users dropped off
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary insights */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-semibold mb-2">Key Insights</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Biggest Drop-off Point:</p>
              <p className="font-medium">
                {funnelData?.steps.reduce((max, step) => 
                  step.dropoffRate > max.dropoffRate ? step : max, 
                  funnelData.steps[1]
                )?.name || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Lost Customers:</p>
              <p className="font-medium text-red-600">
                {funnelData?.totalDropoffs.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};