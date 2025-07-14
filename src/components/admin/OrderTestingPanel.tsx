import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShoppingCart, TrendingUp, AlertCircle, CheckCircle, Loader2, RefreshCw, User } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

export const OrderTestingPanel = () => {
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<{ [key: string]: boolean | string }>({});
  const queryClient = useQueryClient();

  const { data: orderStats, isLoading: statsLoading } = useQuery({
    queryKey: ['order-stats'],
    queryFn: async () => {
      const [
        totalResult,
        pendingResult,
        confirmedResult,
        shippedResult,
        deliveredResult,
        cancelledResult
      ] = await Promise.all([
        supabase.from('orders').select('count', { count: 'exact', head: true }),
        supabase.from('orders').select('count', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('orders').select('count', { count: 'exact', head: true }).eq('status', 'confirmed'),
        supabase.from('orders').select('count', { count: 'exact', head: true }).eq('status', 'shipped'),
        supabase.from('orders').select('count', { count: 'exact', head: true }).eq('status', 'delivered'),
        supabase.from('orders').select('count', { count: 'exact', head: true }).eq('status', 'cancelled')
      ]);

      return {
        total: totalResult.count || 0,
        pending: pendingResult.count || 0,
        confirmed: confirmedResult.count || 0,
        shipped: shippedResult.count || 0,
        delivered: deliveredResult.count || 0,
        cancelled: cancelledResult.count || 0
      };
    }
  });

  const runOrderTests = async () => {
    setIsRunningTests(true);
    const results: { [key: string]: boolean | string } = {};

    try {
      // Test 1: Order Retrieval
      console.log("Testing order retrieval...");
      const { data: orders, error: fetchError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            product_name,
            quantity,
            unit_price,
            total_price
          )
        `)
        .limit(10);

      results.orderRetrieval = fetchError ? `Failed: ${fetchError.message}` : true;

      // Test 2: Order Status Update (if orders exist)
      if (orders && orders.length > 0) {
        console.log("Testing order status update...");
        const testOrder = orders[0];
        const newStatus: OrderStatus = testOrder.status === 'pending' ? 'confirmed' : 'pending';
        
        const { error: updateError } = await supabase
          .from('orders')
          .update({ status: newStatus })
          .eq('id', testOrder.id);

        results.orderStatusUpdate = updateError ? `Failed: ${updateError.message}` : true;

        // Revert the status change
        await supabase
          .from('orders')
          .update({ status: testOrder.status })
          .eq('id', testOrder.id);
      } else {
        results.orderStatusUpdate = "No orders to test with";
      }

      // Test 3: Order Search Functionality
      console.log("Testing order search...");
      const { data: searchResults, error: searchError } = await supabase
        .from('orders')
        .select('*')
        .or('order_number.ilike.%ORD%,email.ilike.%test%')
        .limit(5);

      results.orderSearch = searchError ? `Failed: ${searchError.message}` : true;

      // Test 4: Order Items Relationship
      console.log("Testing order items relationship...");
      const { data: orderWithItems, error: relationError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          order_items!inner(*)
        `)
        .limit(1);

      results.orderItemsRelation = relationError ? `Failed: ${relationError.message}` : true;

      // Test 5: Order Analytics
      console.log("Testing order analytics...");
      const { data: analytics, error: analyticsError } = await supabase
        .from('orders')
        .select('total_amount, status, created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      results.orderAnalytics = analyticsError ? `Failed: ${analyticsError.message}` : true;

      toast.success("Order tests completed successfully!");
      
    } catch (error: any) {
      console.error("Order test suite failed:", error);
      results.orderTestSuite = `Failed: ${error.message}`;
      toast.error("Order test suite encountered errors");
    } finally {
      setTestResults(results);
      setIsRunningTests(false);
      queryClient.invalidateQueries();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-purple-100 text-purple-800';
      case 'shipped': return 'bg-indigo-100 text-indigo-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const TestResultItem = ({ title, result }: { title: string; result: boolean | string }) => (
    <div className="flex items-center justify-between p-2 rounded border">
      <span className="text-sm font-medium">{title}</span>
      {typeof result === 'boolean' ? (
        result ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <AlertCircle className="h-4 w-4 text-red-600" />
        )
      ) : (
        <Badge variant={result.includes('Failed') ? 'destructive' : 'default'} className="text-xs">
          {result}
        </Badge>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Order Management Testing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">
                  {statsLoading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : orderStats?.total}
                </div>
                <div className="text-sm text-muted-foreground">Total Orders</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">
                  {statsLoading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : orderStats?.delivered}
                </div>
                <div className="text-sm text-muted-foreground">Delivered</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <User className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">
                  {statsLoading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : orderStats?.pending}
                </div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">
                  {statsLoading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : orderStats?.cancelled}
                </div>
                <div className="text-sm text-muted-foreground">Cancelled</div>
              </CardContent>
            </Card>
          </div>

          {/* Status Overview */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-6">
            {orderStats && Object.entries(orderStats).map(([status, count]) => (
              status !== 'total' && (
                <Badge key={status} className={`${getStatusColor(status)} justify-center`}>
                  {status}: {count}
                </Badge>
              )
            ))}
          </div>

          <div className="flex gap-3 mb-6">
            <Button 
              onClick={runOrderTests} 
              disabled={isRunningTests}
              className="flex-1"
            >
              {isRunningTests && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Run Order Tests
            </Button>
            <Button variant="outline" onClick={() => queryClient.invalidateQueries()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </div>

          {Object.keys(testResults).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Test Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <TestResultItem title="Order Retrieval" result={testResults.orderRetrieval} />
                <TestResultItem title="Status Update" result={testResults.orderStatusUpdate} />
                <TestResultItem title="Order Search" result={testResults.orderSearch} />
                <TestResultItem title="Order Items Relation" result={testResults.orderItemsRelation} />
                <TestResultItem title="Order Analytics" result={testResults.orderAnalytics} />
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};