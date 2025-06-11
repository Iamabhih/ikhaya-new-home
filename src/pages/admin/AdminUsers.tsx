
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { UserManagement } from "@/components/admin/UserManagement";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";

const AdminUsers = () => {
  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8">User Management</h1>
          <UserManagement />
        </main>
        <Footer />
      </div>
    </AdminProtectedRoute>
  );
};

export default AdminUsers;
