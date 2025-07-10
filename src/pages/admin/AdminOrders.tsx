
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { EnhancedOrderList } from "@/components/admin/orders/EnhancedOrderList";

const AdminOrders = () => {
  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <div className="space-y-8">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Order Management</h1>
              <p className="text-gray-600 text-base">Track, process, and manage customer orders</p>
            </div>
          </div>
          
          <EnhancedOrderList />
        </div>
      </AdminLayout>
    </AdminProtectedRoute>
  );
};

export default AdminOrders;
