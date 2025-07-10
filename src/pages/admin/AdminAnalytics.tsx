
import { ProductAnalyticsDashboard } from "@/components/admin/ProductAnalyticsDashboard";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";

const AdminAnalytics = () => {
  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <ErrorBoundary>
          <div className="space-y-8">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Analytics Dashboard</h1>
                <p className="text-gray-600 text-base">Monitor performance, insights, and business metrics</p>
              </div>
            </div>
            
            <ProductAnalyticsDashboard />
          </div>
        </ErrorBoundary>
      </AdminLayout>
    </AdminProtectedRoute>
  );
};

export default AdminAnalytics;
