import { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductForm } from "@/components/admin/ProductForm";
import { ProductImageManager } from "@/components/admin/ProductImageManager";
import { EnhancedProductImport } from "@/components/admin/EnhancedProductImport";
import { ProductImportScheduler } from "@/components/admin/ProductImportScheduler";
import { ProductAnalyticsDashboard } from "@/components/admin/ProductAnalyticsDashboard";
import { ProductManagementLayout } from "@/components/admin/ProductManagementLayout";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const AdminProducts = () => {
  const [activeTab, setActiveTab] = useState("products");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
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
        .order('name');
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
          category_id, created_at,
          categories:category_id(name)
        `, { count: 'exact' });

      // Apply search filters
      if (searchFilters.query?.trim()) {
        query = query.or(`name.ilike.%${searchFilters.query}%,sku.ilike.%${searchFilters.query}%`);
      }

      if (searchFilters.categoryId) {
        query = query.eq('category_id', searchFilters.categoryId);
      }

      if (searchFilters.inStockOnly) {
        query = query.gt('stock_quantity', 0);
      }

      if (searchFilters.featuredOnly) {
        query = query.eq('is_featured', true);
      }

      if (searchFilters.minPrice !== undefined) {
        query = query.gte('price', searchFilters.minPrice);
      }

      if (searchFilters.maxPrice !== undefined) {
        query = query.lte('price', searchFilters.maxPrice);
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

  const handleEditProduct = (productId: string) => {
    setEditingProductId(productId);
    setActiveTab("form");
  };

  const handleFormClose = () => {
    setEditingProductId(null);
    setActiveTab("products");
    setRefreshTrigger(prev => prev + 1);
  };

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
    <ErrorBoundary>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="import">Import</TabsTrigger>
          <TabsTrigger value="scheduler">Scheduler</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-6">
          <ErrorBoundary>
            <ProductManagementLayout
              products={productsData?.products || []}
              totalCount={productsData?.totalCount || 0}
              isLoading={productsLoading}
              onEditProduct={handleEditProduct}
              onSelectProduct={handleProductSelect}
              selectedProducts={selectedProducts}
              onSearch={handleSearchFilters}
              categories={categories}
            />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="analytics">
          <ErrorBoundary>
            <ProductAnalyticsDashboard />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="import">
          <ErrorBoundary>
            <EnhancedProductImport />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="scheduler">
          <ErrorBoundary>
            <ProductImportScheduler />
          </ErrorBoundary>
        </TabsContent>

        {/* Product Form Modal/Dialog will be handled within ProductManagementLayout */}
        {editingProductId && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
            <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg">
              <ProductForm
                productId={editingProductId}
                onClose={handleFormClose}
              />
            </div>
          </div>
        )}
      </Tabs>
    </ErrorBoundary>
  );
};

export default AdminProducts;
