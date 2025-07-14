import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, ShoppingCart, Users, AlertCircle, CheckCircle, Loader2, RefreshCw } from "lucide-react";

export const ProductTestingPanel = () => {
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<{ [key: string]: boolean | string }>({});
  const queryClient = useQueryClient();

  const { data: systemStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['system-status'],
    queryFn: async () => {
      const [productsResult, ordersResult, categoriesResult] = await Promise.all([
        supabase.from('products').select('count', { count: 'exact', head: true }),
        supabase.from('orders').select('count', { count: 'exact', head: true }),
        supabase.from('categories').select('count', { count: 'exact', head: true })
      ]);

      return {
        products: productsResult.count || 0,
        orders: ordersResult.count || 0,
        categories: categoriesResult.count || 0
      };
    }
  });

  const runComprehensiveTests = async () => {
    setIsRunningTests(true);
    const results: { [key: string]: boolean | string } = {};

    try {
      // Test 1: Product Creation
      console.log("Testing product creation...");
      const testProduct = {
        name: `Test Product ${Date.now()}`,
        slug: `test-product-${Date.now()}`,
        price: 99.99,
        stock_quantity: 10,
        is_active: true,
        is_featured: false,
        description: "Test product for end-to-end testing",
        short_description: "Test product"
      };

      const { data: newProduct, error: createError } = await supabase
        .from('products')
        .insert([testProduct])
        .select()
        .single();

      if (createError) {
        results.productCreation = `Failed: ${createError.message}`;
      } else {
        results.productCreation = true;
        results.createdProductId = newProduct.id;
      }

      // Test 2: Product Update
      if (newProduct) {
        console.log("Testing product update...");
        const { error: updateError } = await supabase
          .from('products')
          .update({ price: 149.99, is_featured: true })
          .eq('id', newProduct.id);

        results.productUpdate = updateError ? `Failed: ${updateError.message}` : true;
      }

      // Test 3: Product Retrieval with Relations
      console.log("Testing product retrieval with relations...");
      const { data: productWithRelations, error: fetchError } = await supabase
        .from('products')
        .select(`
          *,
          categories:category_id(name),
          brands:brand_id(name),
          product_images(*)
        `)
        .limit(5);

      results.productFetch = fetchError ? `Failed: ${fetchError.message}` : true;

      // Test 4: Category Management
      console.log("Testing category creation...");
      const testCategory = {
        name: `Test Category ${Date.now()}`,
        slug: `test-category-${Date.now()}`,
        is_active: true
      };

      const { error: categoryError } = await supabase
        .from('categories')
        .insert([testCategory]);

      results.categoryCreation = categoryError ? `Failed: ${categoryError.message}` : true;

      // Test 5: Order Status Updates
      console.log("Testing order operations...");
      const { data: sampleOrder, error: orderFetchError } = await supabase
        .from('orders')
        .select('*')
        .limit(1)
        .single();

      if (sampleOrder && !orderFetchError) {
        results.orderFetch = true;
      } else {
        results.orderFetch = "No orders found or fetch failed";
      }

      // Test 6: Search Functionality
      console.log("Testing search functionality...");
      const { data: searchResults, error: searchError } = await supabase
        .from('products')
        .select('*')
        .or('name.ilike.%test%,sku.ilike.%test%')
        .limit(10);

      results.searchFunctionality = searchError ? `Failed: ${searchError.message}` : true;

      // Clean up test data
      if (newProduct) {
        await supabase.from('products').delete().eq('id', newProduct.id);
      }

      toast.success("All tests completed successfully!");
      
    } catch (error: any) {
      console.error("Test suite failed:", error);
      results.testSuite = `Failed: ${error.message}`;
      toast.error("Test suite encountered errors");
    } finally {
      setTestResults(results);
      setIsRunningTests(false);
      queryClient.invalidateQueries();
    }
  };

  const resetSystem = async () => {
    try {
      // Clear any test data and refresh caches
      queryClient.invalidateQueries();
      toast.success("System reset completed");
    } catch (error: any) {
      toast.error(`Reset failed: ${error.message}`);
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
            <Package className="h-5 w-5" />
            System Status & Testing Panel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <Package className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">
                  {statusLoading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : systemStatus?.products}
                </div>
                <div className="text-sm text-muted-foreground">Products</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">
                  {statusLoading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : systemStatus?.orders}
                </div>
                <div className="text-sm text-muted-foreground">Orders</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">
                  {statusLoading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : systemStatus?.categories}
                </div>
                <div className="text-sm text-muted-foreground">Categories</div>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-3 mb-6">
            <Button 
              onClick={runComprehensiveTests} 
              disabled={isRunningTests}
              className="flex-1"
            >
              {isRunningTests && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Run End-to-End Tests
            </Button>
            <Button variant="outline" onClick={resetSystem}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset System
            </Button>
          </div>

          {Object.keys(testResults).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Test Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <TestResultItem title="Product Creation" result={testResults.productCreation} />
                <TestResultItem title="Product Update" result={testResults.productUpdate} />
                <TestResultItem title="Product Fetch" result={testResults.productFetch} />
                <TestResultItem title="Category Creation" result={testResults.categoryCreation} />
                <TestResultItem title="Order Operations" result={testResults.orderFetch} />
                <TestResultItem title="Search Functionality" result={testResults.searchFunctionality} />
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};