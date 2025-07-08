
import { ProductAnalyticsDashboard } from "@/components/admin/ProductAnalyticsDashboard";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";

const AdminAnalytics = () => {
  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <ErrorBoundary>
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            </div>
            
            <ProductAnalyticsDashboard />
          </div>
        </ErrorBoundary>
      </AdminLayout>
    </AdminProtectedRoute>
  );
};

export default AdminAnalytics;
