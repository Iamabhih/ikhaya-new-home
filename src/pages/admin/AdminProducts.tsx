
import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductList } from "@/components/admin/ProductList";
import { ProductForm } from "@/components/admin/ProductForm";
import { StockManagement } from "@/components/admin/StockManagement";
import { LowStockAlert } from "@/components/admin/LowStockAlert";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";

const AdminProducts = () => {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("products");

  const handleEditProduct = (productId: string) => {
    setSelectedProduct(productId);
    setActiveTab("add");
  };

  const handleCreateProduct = () => {
    setSelectedProduct(null);
    setActiveTab("add");
  };

  const handleFormClose = () => {
    setSelectedProduct(null);
    setActiveTab("products");
  };

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Product Management</h1>
          </div>

          <LowStockAlert />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="stock">Stock Management</TabsTrigger>
              <TabsTrigger value="add">
                {selectedProduct ? 'Edit Product' : 'Add Product'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="products">
              <ProductList onEditProduct={handleEditProduct} />
            </TabsContent>

            <TabsContent value="stock">
              <StockManagement />
            </TabsContent>

            <TabsContent value="add">
              <ProductForm 
                productId={selectedProduct || undefined} 
                onClose={handleFormClose} 
              />
            </TabsContent>
          </Tabs>
        </main>
        <Footer />
      </div>
    </AdminProtectedRoute>
  );
};

export default AdminProducts;
