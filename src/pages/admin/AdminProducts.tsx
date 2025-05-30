
import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductList } from "@/components/admin/ProductList";
import { ProductForm } from "@/components/admin/ProductForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const AdminProducts = () => {
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [editingProductId, setEditingProductId] = useState<string | undefined>();

  const handleCreateProduct = () => {
    setEditingProductId(undefined);
    setView('create');
  };

  const handleEditProduct = (productId: string) => {
    setEditingProductId(productId);
    setView('edit');
  };

  const handleClose = () => {
    setView('list');
    setEditingProductId(undefined);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          {view !== 'list' && (
            <Button
              variant="ghost"
              onClick={handleClose}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Products
            </Button>
          )}
          <h1 className="text-3xl font-bold">Product Management</h1>
        </div>

        {view === 'list' && (
          <Card>
            <CardHeader>
              <CardTitle>Products</CardTitle>
            </CardHeader>
            <CardContent>
              <ProductList
                onCreateProduct={handleCreateProduct}
                onEditProduct={handleEditProduct}
              />
            </CardContent>
          </Card>
        )}

        {(view === 'create' || view === 'edit') && (
          <ProductForm
            productId={editingProductId}
            onClose={handleClose}
          />
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AdminProducts;
