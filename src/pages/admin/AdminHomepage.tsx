import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { HomepageSettings } from "@/components/admin/HomepageSettings";

const AdminHomepage = () => {
  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <HomepageSettings />
        </main>
        <Footer />
      </div>
    </AdminProtectedRoute>
  );
};

export default AdminHomepage;