
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Upload, Calendar, Settings } from "lucide-react";
import { PaginatedProductList } from "@/components/admin/PaginatedProductList";
import { ProductForm } from "@/components/admin/ProductForm";
import { ProductImageManager } from "@/components/admin/ProductImageManager";
import { EnhancedProductImport } from "@/components/admin/EnhancedProductImport";
import { ProductImportScheduler } from "@/components/admin/ProductImportScheduler";
import { BulkOperationsPanel } from "@/components/admin/BulkOperationsPanel";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

const AdminProducts = () => {
  const [activeTab, setActiveTab] = useState("list");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Products</h1>
          <div className="flex gap-2">
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
            <TabsTrigger value="form">
              {editingProductId ? "Edit Product" : "Add Product"}
            </TabsTrigger>
            <TabsTrigger value="import">Import CSV</TabsTrigger>
            <TabsTrigger value="scheduler">Scheduler</TabsTrigger>
            {editingProductId && (
              <TabsTrigger value="images">Manage Images</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="list">
            <ErrorBoundary>
              <PaginatedProductList 
                onEditProduct={handleEditProduct}
                onProductSelect={handleProductSelect}
                selectedProducts={selectedProducts}
                refreshTrigger={refreshTrigger}
              />
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
