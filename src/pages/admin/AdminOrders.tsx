
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { EnhancedOrderList } from "@/components/admin/orders/EnhancedOrderList";

const AdminOrders = () => {
  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <EnhancedOrderList />
      </AdminLayout>
    </AdminProtectedRoute>
  );
};

export default AdminOrders;
