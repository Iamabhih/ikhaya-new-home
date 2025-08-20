import { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnhancedProductImport } from "@/components/admin/EnhancedProductImport";
import { ExcelProductImport } from "@/components/admin/ExcelProductImport";
import { ProductImportScheduler } from "@/components/admin/ProductImportScheduler";
import { ProductAnalyticsDashboard } from "@/components/admin/ProductAnalyticsDashboard";
import { ProductManagementLayout } from "@/components/admin/ProductManagementLayout";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { DeleteAllProducts } from "@/components/admin/DeleteAllProducts";
import { ImageMigrationTool } from "@/components/admin/ImageMigrationTool";
import { ManualImageLinker } from "@/components/admin/ManualImageLinker";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductImageRefresh } from "@/components/admin/ProductImageRefresh";
import { UnifiedImageManager } from "@/components/admin/UnifiedImageManager";

const AdminProducts = () => {
  const [activeTab, setActiveTab] = useState("products");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [searchFilters, setSearchFilters] = useState<any>({
    query: '',
    sortBy: 'name'
  });

  // Fetch categories for search filters
  const { data: categories = [] } = useQuery({
    queryKey: ['categories-for-search'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
    staleTime: 300000,
  });

  // Fetch brands for search filters
  const { data: brands = [] } = useQuery({
    queryKey: ['brands-for-search'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('id, name')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
    staleTime: 300000,
  });

  // Enhanced products query that respects search filters
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['admin-products-filtered', searchFilters, refreshTrigger],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`
          id, name, sku, price, stock_quantity, is_active, is_featured, 
          category_id, brand_id, created_at,
          categories:category_id(name),
          brands:brand_id(name)
        `, { count: 'exact' });

      // Apply search filters
      if (searchFilters.query?.trim()) {
        query = query.or(`name.ilike.%${searchFilters.query}%,sku.ilike.%${searchFilters.query}%`);
      }

      if (searchFilters.categoryId) {
        query = query.eq('category_id', searchFilters.categoryId);
      }

      if (searchFilters.brandId) {
        query = query.eq('brand_id', searchFilters.brandId);
      }

      if (searchFilters.inStockOnly) {
        query = query.gt('stock_quantity', 0);
      }

      if (searchFilters.featuredOnly) {
        query = query.eq('is_featured', true);
      }

      // On sale filter - products with compare_at_price higher than current price
      if (searchFilters.onSaleOnly) {
        query = query.not('compare_at_price', 'is', null)
                     .gte('compare_at_price', 'price');
      }

      if (searchFilters.minPrice !== undefined) {
        query = query.gte('price', searchFilters.minPrice);
      }

      if (searchFilters.maxPrice !== undefined) {
        query = query.lte('price', searchFilters.maxPrice);
      }

      // Add rating filter if provided
      if (searchFilters.minRating !== undefined) {
        query = query.gte('average_rating', searchFilters.minRating);
      }

      // Apply sorting
      switch (searchFilters.sortBy) {
        case 'price-asc':
          query = query.order('price', { ascending: true });
          break;
        case 'price-desc':
          query = query.order('price', { ascending: false });
          break;
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'featured':
          query = query.order('is_featured', { ascending: false }).order('created_at', { ascending: false });
          break;
        case 'performance':
          // Order by total sold if available, otherwise by created_at
          query = query.order('created_at', { ascending: false });
          break;
        default:
          query = query.order('name', { ascending: true });
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        products: data || [],
        totalCount: count || 0
      };
    },
    staleTime: 30000,
  });


  const handleProductSelect = (productId: string, selected: boolean) => {
    setSelectedProducts(prev => 
      selected 
        ? [...prev, productId]
        : prev.filter(id => id !== productId)
    );
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleQuickEdit = useCallback(async (productId: string, field: string, value: any) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ [field]: value })
        .eq('id', productId);
      
      if (error) throw error;
      handleRefresh();
    } catch (error) {
      console.error('Quick edit failed:', error);
    }
  }, []);

  const handleSearchFilters = useCallback((filters: any) => {
    setSearchFilters(filters);
  }, []);

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <div className="space-y-8">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-foreground tracking-tight">Product Management</h1>
              <p className="text-muted-foreground text-base">Manage your inventory, analytics, and product imports</p>
            </div>
          </div>

          <ErrorBoundary>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-8 bg-muted p-1 rounded-xl">
                <TabsTrigger 
                  value="products" 
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground font-medium"
                >
                  Products
                </TabsTrigger>
                <TabsTrigger 
                  value="analytics" 
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground font-medium"
                >
                  Analytics
                </TabsTrigger>
                <TabsTrigger 
                  value="import" 
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground font-medium"
                >
                  CSV Import
                </TabsTrigger>
                <TabsTrigger 
                  value="excel" 
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground font-medium"
                >
                  Excel Import
                </TabsTrigger>
                <TabsTrigger 
                  value="scheduler" 
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground font-medium"
                >
                  Scheduler
                </TabsTrigger>
                <TabsTrigger 
                  value="images" 
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground font-medium"
                >
                  Drive Migration
                </TabsTrigger>
                <TabsTrigger 
                  value="drive-linking" 
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground font-medium"
                >
                  Drive Linking
                </TabsTrigger>
                <TabsTrigger 
                  value="image-tools" 
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground font-medium"
                >
                  Image Tools
                </TabsTrigger>
              </TabsList>

              <TabsContent value="products" className="space-y-6">
                <ErrorBoundary>
                  <DeleteAllProducts />
                  <ProductManagementLayout
                    products={productsData?.products || []}
                    totalCount={productsData?.totalCount || 0}
                    isLoading={productsLoading}
                    onSelectProduct={handleProductSelect}
                    selectedProducts={selectedProducts}
                    onSearch={handleSearchFilters}
                    categories={categories}
                    brands={brands}
                    refreshTrigger={refreshTrigger}
                  />
                </ErrorBoundary>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-6">
                <ErrorBoundary>
                  <ProductAnalyticsDashboard />
                </ErrorBoundary>
              </TabsContent>

              <TabsContent value="import" className="space-y-6">
                <ErrorBoundary>
                  <EnhancedProductImport />
                </ErrorBoundary>
              </TabsContent>

              <TabsContent value="excel" className="space-y-6">
                <ErrorBoundary>
                  <ExcelProductImport />
                </ErrorBoundary>
              </TabsContent>

              <TabsContent value="scheduler" className="space-y-6">
                <ErrorBoundary>
                  <ProductImportScheduler />
                </ErrorBoundary>
              </TabsContent>

              <TabsContent value="images" className="space-y-6">
                <ErrorBoundary>
                  <ImageMigrationTool />
                </ErrorBoundary>
              </TabsContent>

              <TabsContent value="drive-linking" className="space-y-6">
                <ErrorBoundary>
                  <ManualImageLinker />
                </ErrorBoundary>
              </TabsContent>

              <TabsContent value="image-tools" className="space-y-6">
                <ErrorBoundary>
                  <UnifiedImageManager />
                  <div className="mt-6">
                    <ProductImageRefresh />
                  </div>
                </ErrorBoundary>
              </TabsContent>
            </Tabs>
          </ErrorBoundary>
        </div>
      </AdminLayout>
    </AdminProtectedRoute>
  );
};

export default AdminProducts;
