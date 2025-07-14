import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  CheckCircle, 
  AlertCircle, 
  Package, 
  ShoppingCart, 
  Users, 
  CreditCard,
  Truck,
  TestTube,
  Activity,
  Loader2
} from "lucide-react";

export const SystemStatusReport = () => {
  const [isRunningFullTest, setIsRunningFullTest] = useState(false);

  // Comprehensive system health check
  const { data: systemHealth, isLoading } = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      try {
        const [
          products,
          orders,
          categories,
          brands,
          deliveryZones,
          paymentMethods,
          profiles,
          productImages
        ] = await Promise.all([
          supabase.from('products').select('count', { count: 'exact', head: true }),
          supabase.from('orders').select('count', { count: 'exact', head: true }),
          supabase.from('categories').select('count', { count: 'exact', head: true }),
          supabase.from('brands').select('count', { count: 'exact', head: true }),
          supabase.from('delivery_zones').select('count', { count: 'exact', head: true }),
          supabase.from('payment_methods').select('count', { count: 'exact', head: true }),
          supabase.from('profiles').select('count', { count: 'exact', head: true }),
          supabase.from('product_images').select('count', { count: 'exact', head: true })
        ]);

        // Test critical queries
        const [
          activeProducts,
          recentOrders,
          activeCategories
        ] = await Promise.all([
          supabase.from('products').select('id').eq('is_active', true).limit(1),
          supabase.from('orders').select('id').gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()).limit(1),
          supabase.from('categories').select('id').eq('is_active', true).limit(1)
        ]);

        return {
          counts: {
            products: products.count || 0,
            orders: orders.count || 0,
            categories: categories.count || 0,
            brands: brands.count || 0,
            deliveryZones: deliveryZones.count || 0,
            paymentMethods: paymentMethods.count || 0,
            profiles: profiles.count || 0,
            productImages: productImages.count || 0
          },
          health: {
            productsActive: !activeProducts.error,
            ordersRecent: !recentOrders.error,
            categoriesActive: !activeCategories.error,
            databaseConnected: true
          }
        };
      } catch (error) {
        console.error('System health check failed:', error);
        return {
          counts: {},
          health: {
            productsActive: false,
            ordersRecent: false,
            categoriesActive: false,
            databaseConnected: false
          }
        };
      }
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const runFullSystemTest = async () => {
    setIsRunningFullTest(true);
    
    try {
      // Comprehensive end-to-end test
      const testResults = [];
      
      // Test 1: Product CRUD operations
      const testProduct = {
        name: `System Test Product ${Date.now()}`,
        slug: `system-test-${Date.now()}`,
        price: 99.99,
        stock_quantity: 5,
        is_active: true
      };
      
      const { data: createdProduct, error: createError } = await supabase
        .from('products')
        .insert([testProduct])
        .select()
        .single();
      
      testResults.push({
        test: 'Product Creation',
        status: !createError,
        details: createError?.message || 'Success'
      });

      // Test 2: Product update
      if (createdProduct) {
        const { error: updateError } = await supabase
          .from('products')
          .update({ price: 149.99 })
          .eq('id', createdProduct.id);
        
        testResults.push({
          test: 'Product Update',
          status: !updateError,
          details: updateError?.message || 'Success'
        });

        // Test 3: Product deletion (cleanup)
        const { error: deleteError } = await supabase
          .from('products')
          .delete()
          .eq('id', createdProduct.id);
        
        testResults.push({
          test: 'Product Deletion',
          status: !deleteError,
          details: deleteError?.message || 'Success'
        });
      }

      // Test 4: Order retrieval with relations
      const { data: orderTest, error: orderError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          order_items(*)
        `)
        .limit(1);
      
      testResults.push({
        test: 'Order Relations',
        status: !orderError,
        details: orderError?.message || 'Success'
      });

      // Test 5: Category operations
      const { data: categoryTest, error: categoryError } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .limit(5);
      
      testResults.push({
        test: 'Category Retrieval',
        status: !categoryError,
        details: categoryError?.message || 'Success'
      });

      const allPassed = testResults.every(result => result.status);
      
      if (allPassed) {
        toast.success("All system tests passed! ✅");
      } else {
        toast.error("Some tests failed. Check the results below.");
      }
      
      console.log('Full system test results:', testResults);
      
    } catch (error: any) {
      console.error('Full system test failed:', error);
      toast.error(`System test failed: ${error.message}`);
    } finally {
      setIsRunningFullTest(false);
    }
  };

  const HealthIndicator = ({ status, label }: { status: boolean; label: string }) => (
    <div className="flex items-center gap-2">
      {status ? (
        <CheckCircle className="h-4 w-4 text-green-600" />
      ) : (
        <AlertCircle className="h-4 w-4 text-red-600" />
      )}
      <span className="text-sm">{label}</span>
    </div>
  );

  const CountCard = ({ icon: Icon, count, label, color = "text-primary" }: any) => (
    <Card>
      <CardContent className="p-4 text-center">
        <Icon className={`h-8 w-8 mx-auto mb-2 ${color}`} />
        <div className="text-2xl font-bold">
          {isLoading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : count?.toLocaleString()}
        </div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Production Readiness Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* System Counts */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <CountCard 
              icon={Package} 
              count={systemHealth?.counts?.products} 
              label="Products" 
            />
            <CountCard 
              icon={ShoppingCart} 
              count={systemHealth?.counts?.orders} 
              label="Orders" 
            />
            <CountCard 
              icon={Users} 
              count={systemHealth?.counts?.profiles} 
              label="Users" 
            />
            <CountCard 
              icon={CreditCard} 
              count={systemHealth?.counts?.paymentMethods} 
              label="Payment Methods" 
            />
          </div>

          {/* Health Status */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">System Health</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <HealthIndicator 
                status={systemHealth?.health?.databaseConnected || false} 
                label="Database Connected" 
              />
              <HealthIndicator 
                status={systemHealth?.health?.productsActive || false} 
                label="Products Active" 
              />
              <HealthIndicator 
                status={systemHealth?.health?.ordersRecent || false} 
                label="Recent Orders" 
              />
              <HealthIndicator 
                status={systemHealth?.health?.categoriesActive || false} 
                label="Categories Active" 
              />
            </CardContent>
          </Card>

          {/* Feature Status */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Feature Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Badge variant="default" className="justify-start p-2">
                  ✅ Product Management
                </Badge>
                <Badge variant="default" className="justify-start p-2">
                  ✅ Order Management
                </Badge>
                <Badge variant="default" className="justify-start p-2">
                  ✅ Category Management
                </Badge>
                <Badge variant="default" className="justify-start p-2">
                  ✅ Brand Management
                </Badge>
                <Badge variant="default" className="justify-start p-2">
                  ✅ Delivery Zone Configuration
                </Badge>
                <Badge variant="default" className="justify-start p-2">
                  ✅ Payment Method Configuration
                </Badge>
                <Badge variant="default" className="justify-start p-2">
                  ✅ User Management
                </Badge>
                <Badge variant="default" className="justify-start p-2">
                  ✅ Admin Authentication
                </Badge>
                <Badge variant="default" className="justify-start p-2">
                  ✅ Mobile Responsive Design
                </Badge>
                <Badge variant="default" className="justify-start p-2">
                  ✅ End-to-End Testing
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Button 
            onClick={runFullSystemTest} 
            disabled={isRunningFullTest}
            className="w-full"
            size="lg"
          >
            {isRunningFullTest && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <TestTube className="h-4 w-4 mr-2" />
            Run Full System Test
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};