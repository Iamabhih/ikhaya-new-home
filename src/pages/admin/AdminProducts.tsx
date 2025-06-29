
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Upload } from "lucide-react";
import { PaginatedProductList } from "@/components/admin/PaginatedProductList";
import { ProductForm } from "@/components/admin/ProductForm";
import { ProductImageManager } from "@/components/admin/ProductImageManager";
import { ProductImport } from "@/components/admin/ProductImport";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

const AdminProducts = () => {
  const [activeTab, setActiveTab] = useState("list");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const handleEditProduct = (productId: string) => {
    setEditingProductId(productId);
    setActiveTab("form");
  };

  const handleFormClose = () => {
    setEditingProductId(null);
    setActiveTab("list");
  };

  const handleAddProduct = () => {
    setEditingProductId(null);
    setActiveTab("form");
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Products</h1>
          <div className="flex gap-2">
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

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="list">Products</TabsTrigger>
            <TabsTrigger value="form">
              {editingProductId ? "Edit Product" : "Add Product"}
            </TabsTrigger>
            <TabsTrigger value="import">Import CSV</TabsTrigger>
            {editingProductId && (
              <TabsTrigger value="images">Manage Images</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="list">
            <ErrorBoundary>
              <PaginatedProductList onEditProduct={handleEditProduct} />
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
              <ProductImport />
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
