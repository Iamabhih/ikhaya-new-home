import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Package, 
  Image, 
  AlertTriangle, 
  CheckCircle, 
  Trash2, 
  Eye,
  EyeOff,
  Loader2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

export const ProductionOptimizer = () => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const queryClient = useQueryClient();

  // Fetch production stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['production-stats'],
    queryFn: async () => {
      const [
        productsRes,
        categoriesRes,
        featuredRes
      ] = await Promise.all([
        supabase.from('products').select('id, name, is_active, category_id, stock_quantity').eq('is_active', true),
        supabase.from('categories').select('id, name, is_active'),
        supabase.from('products').select('id').eq('is_featured', true).eq('is_active', true)
      ]);

      const productsWithoutImages = await supabase
        .from('products')
        .select('id, name, category_id')
        .eq('is_active', true)
        .not('id', 'in', `(${(await supabase.from('product_images').select('product_id')).data?.map(p => p.product_id).join(',') || 'null'})`);

      const uncategorizedProducts = await supabase
        .from('products')
        .select('id, name')
        .eq('is_active', true)
        .is('category_id', null);

      return {
        totalProducts: productsRes.data?.length || 0,
        activeCategories: categoriesRes.data?.filter(c => c.is_active).length || 0,
        productsWithoutImages: productsWithoutImages.data?.length || 0,
        uncategorizedProducts: uncategorizedProducts.data?.length || 0,
        featuredProducts: featuredRes.data?.length || 0,
        productsWithoutImagesData: productsWithoutImages.data || [],
        uncategorizedProductsData: uncategorizedProducts.data || []
      };
    },
  });

  // Bulk deactivate products without images
  const deactivateProductsMutation = useMutation({
    mutationFn: async (productIds: string[]) => {
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .in('id', productIds);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-stats'] });
      toast({
        title: "Success",
        description: "Products without images have been deactivated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to deactivate products.",
        variant: "destructive",
      });
    },
  });

  // Delete products without images
  const deleteProductsMutation = useMutation({
    mutationFn: async (productIds: string[]) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .in('id', productIds);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-stats'] });
      toast({
        title: "Success",
        description: "Products without images have been deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete products.",
        variant: "destructive",
      });
    },
  });

  const handleBulkDeactivate = () => {
    if (!stats?.productsWithoutImagesData) return;
    
    const productIds = stats.productsWithoutImagesData.map(p => p.id);
    deactivateProductsMutation.mutate(productIds);
  };

  const handleBulkDelete = () => {
    if (!stats?.productsWithoutImagesData) return;
    
    if (confirm(`Are you sure you want to delete ${stats.productsWithoutImages} products without images? This action cannot be undone.`)) {
      const productIds = stats.productsWithoutImagesData.map(p => p.id);
      deleteProductsMutation.mutate(productIds);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const productionScore = stats ? Math.round(
    ((stats.totalProducts - stats.productsWithoutImages - stats.uncategorizedProducts) / stats.totalProducts) * 100
  ) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Production Optimizer</h2>
          <p className="text-muted-foreground">
            Clean up and optimize your site for production
          </p>
        </div>
      </div>

      {/* Production Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Production Readiness Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{productionScore}%</span>
              <Badge variant={productionScore >= 80 ? "default" : productionScore >= 60 ? "secondary" : "destructive"}>
                {productionScore >= 80 ? "Ready" : productionScore >= 60 ? "Good" : "Needs Work"}
              </Badge>
            </div>
            <Progress value={productionScore} className="w-full" />
            <p className="text-sm text-muted-foreground">
              Based on products with images and proper categorization
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold">{stats?.totalProducts || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Image className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">With Images</p>
                <p className="text-2xl font-bold">
                  {(stats?.totalProducts || 0) - (stats?.productsWithoutImages || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Without Images</p>
                <p className="text-2xl font-bold">{stats?.productsWithoutImages || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Uncategorized</p>
                <p className="text-2xl font-bold">{stats?.uncategorizedProducts || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="images" className="w-full">
        <TabsList>
          <TabsTrigger value="images">Image Issues</TabsTrigger>
          <TabsTrigger value="categories">Category Issues</TabsTrigger>
          <TabsTrigger value="optimization">Quick Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="images" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Products Without Images ({stats?.productsWithoutImages || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.productsWithoutImages ? (
                <div className="space-y-4">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      These products won't show on the website since "Hide products without images" is enabled.
                      You can either add images to these products or remove them.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkDeactivate}
                      disabled={deactivateProductsMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <EyeOff className="h-4 w-4" />
                      Deactivate All
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                      disabled={deleteProductsMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete All
                    </Button>
                  </div>

                  <div className="text-sm text-muted-foreground max-h-40 overflow-y-auto">
                    {stats.productsWithoutImagesData.slice(0, 20).map((product) => (
                      <div key={product.id} className="py-1">
                        {product.name}
                      </div>
                    ))}
                    {stats.productsWithoutImagesData.length > 20 && (
                      <div className="py-1 font-medium">
                        ...and {stats.productsWithoutImagesData.length - 20} more
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-semibold">All products have images!</p>
                  <p className="text-muted-foreground">Your site is ready for production.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Category Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Active Categories:</span>
                  <span className="ml-2">{stats?.activeCategories || 0}</span>
                </div>
                <div>
                  <span className="font-medium">Uncategorized Products:</span>
                  <span className="ml-2">{stats?.uncategorizedProducts || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Production Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Your site has been optimized with the following changes:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Removed test categories and empty categories</li>
                    <li>Added proper descriptions to all active categories</li>
                    <li>Set up {stats?.featuredProducts || 0} featured products</li>
                    <li>Configured featured categories for homepage</li>
                    <li>Applied production-ready site settings</li>
                    <li>Enabled "Hide products without images" setting</li>
                  </ul>
                </AlertDescription>
              </Alert>
              
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Next Steps:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Add images to products or remove products without images</li>
                  <li>Review and update product descriptions</li>
                  <li>Set up delivery zones in admin settings</li>
                  <li>Configure payment methods</li>
                  <li>Test the complete checkout process</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};