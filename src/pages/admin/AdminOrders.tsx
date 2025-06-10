
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderList } from "@/components/admin/OrderList";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";

const AdminOrders = () => {
  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8">Order Management</h1>

          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderList />
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    </AdminProtectedRoute>
  );
};

export default AdminOrders;
