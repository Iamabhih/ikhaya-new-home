import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ProductionOptimizer } from "@/components/admin/ProductionOptimizer";

const AdminProduction = () => {
  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <ProductionOptimizer />
      </AdminLayout>
    </AdminProtectedRoute>
  );
};

export default AdminProduction;