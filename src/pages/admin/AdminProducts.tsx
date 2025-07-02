import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Upload, Calendar, Settings, BarChart3, Table, Grid } from "lucide-react";
import { PaginatedProductList } from "@/components/admin/PaginatedProductList";
import { ProductForm } from "@/components/admin/ProductForm";
import { ProductImageManager } from "@/components/admin/ProductImageManager";
import { EnhancedProductImport } from "@/components/admin/EnhancedProductImport";
import { ProductImportScheduler } from "@/components/admin/ProductImportScheduler";
import { BulkOperationsPanel } from "@/components/admin/BulkOperationsPanel";
import { AdvancedProductSearch } from "@/components/admin/AdvancedProductSearch";
import { ProductTableView } from "@/components/admin/ProductTableView";
import { ProductAnalyticsDashboard } from "@/components/admin/ProductAnalyticsDashboard";
import { NotificationCenter } from "@/components/admin/NotificationCenter";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const AdminProducts = () => {
  const [activeTab, setActiveTab] = useState("list");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
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
    setActiveTab("list");
    setRefreshTrigger(prev => prev + 1);
  };

  const handleAddProduct = () => {
    setEditingProductId(null);
    setActiveTab("form");
  };

  const handleProductSelect = (productId: string, selected: boolean) => {
    setSelectedProducts(prev => 
      selected 
        ? [...prev, productId]
        : prev.filter(id => id !== productId)
    );
  };

  const handleClearSelection = () => {
    setSelectedProducts([]);
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleQuickEdit = async (productId: string, field: string, value: any) => {
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
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Products</h1>
          <div className="flex gap-2 items-center">
            <NotificationCenter />
            <Button onClick={() => setActiveTab("analytics")} variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
            <Button onClick={() => setActiveTab("scheduler")} variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Scheduler
            </Button>
            <Button onClick={() => setActiveTab("import")} variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
            <Button onClick={handleAddProduct}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Bulk Operations Panel */}
        {selectedProducts.length > 0 && (
          <BulkOperationsPanel
            selectedProducts={selectedProducts}
            onClearSelection={handleClearSelection}
            onRefresh={handleRefresh}
          />
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="list">Products</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="form">
              {editingProductId ? "Edit Product" : "Add Product"}
            </TabsTrigger>
            <TabsTrigger value="import">Import CSV</TabsTrigger>
            <TabsTrigger value="scheduler">Scheduler</TabsTrigger>
            {editingProductId && (
              <TabsTrigger value="images">Manage Images</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            <ErrorBoundary>
              <AdvancedProductSearch
                onSearch={setSearchFilters}
                categories={categories}
                totalCount={productsData?.totalCount}
                isLoading={productsLoading}
              />
              
              <div className="flex justify-end gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                >
                  <Table className="h-4 w-4" />
                </Button>
              </div>

              {viewMode === 'grid' ? (
                <PaginatedProductList 
                  onEditProduct={handleEditProduct}
                  onProductSelect={handleProductSelect}
                  selectedProducts={selectedProducts}
                  refreshTrigger={refreshTrigger}
                  searchFilters={searchFilters}
                />
              ) : (
                <ProductTableView
                  products={productsData?.products || []}
                  selectedProducts={selectedProducts}
                  onSelectProduct={handleProductSelect}
                  onSelectAll={(checked) => {
                    const products = productsData?.products || [];
                    if (checked) {
                      products.forEach(product => handleProductSelect(product.id, true));
                    } else {
                      products.forEach(product => handleProductSelect(product.id, false));
                    }
                  }}
                  onEditProduct={handleEditProduct}
                  onQuickEdit={handleQuickEdit}
                />
              )}
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="analytics">
            <ErrorBoundary>
              <ProductAnalyticsDashboard />
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="form">
            <ErrorBoundary>
              <ProductForm
                productId={editingProductId}
                onClose={handleFormClose}
              />
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

          {editingProductId && (
            <TabsContent value="images">
              <ErrorBoundary>
                <ProductImageManager productId={editingProductId} />
              </ErrorBoundary>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </ErrorBoundary>
  );
};

export default AdminProducts;
