
import { UserManagement } from "@/components/admin/UserManagement";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";

const AdminUsers = () => {
  return (
    <AdminProtectedRoute requireSuperAdmin>
      <AdminLayout>
        <h1 className="text-3xl font-bold mb-8">User Management</h1>
        <UserManagement />
      </AdminLayout>
    </AdminProtectedRoute>
  );
};

export default AdminUsers;
