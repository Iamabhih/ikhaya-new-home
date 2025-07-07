
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { EnhancedOrderList } from "@/components/admin/orders/EnhancedOrderList";

const AdminOrders = () => {
  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-7xl">
          <EnhancedOrderList />
        </main>
        <Footer />
      </div>
    </AdminProtectedRoute>
  );
};

export default AdminOrders;
