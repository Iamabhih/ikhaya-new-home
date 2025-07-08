import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { HomepageSettings } from "@/components/admin/HomepageSettings";

const AdminHomepage = () => {
  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <HomepageSettings />
      </AdminLayout>
    </AdminProtectedRoute>
  );
};

export default AdminHomepage;