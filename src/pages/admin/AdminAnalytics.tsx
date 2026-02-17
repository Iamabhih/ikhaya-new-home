
import { PremiumRealTimeMetrics } from "@/components/admin/analytics/PremiumRealTimeMetrics";
import { OrdersMetrics } from "@/components/admin/orders/OrdersMetrics";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdvancedAnalyticsDashboard } from "@/components/admin/analytics/AdvancedAnalyticsDashboard";
import { CartAbandonmentDashboard } from "@/components/admin/CartAbandonmentDashboard";

const AdminAnalytics = () => {
  return (
    <AdminLayout>
        <ErrorBoundary>
          <div className="space-y-8">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Premium Analytics Dashboard
                </h1>
                <p className="text-muted-foreground text-base">
                  Real-time insights, customer intelligence, and business metrics
                </p>
              </div>
            </div>
            
            {/* Advanced Analytics Dashboard */}
            <AdvancedAnalyticsDashboard />
            
            {/* Additional Analytics Sections */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="space-y-6">
                <OrdersMetrics />
              </div>
              <div className="space-y-6">
                <PremiumRealTimeMetrics />
              </div>
            </div>

            {/* Cart Abandonment Analytics */}
            <CartAbandonmentDashboard />
          </div>
        </ErrorBoundary>
    </AdminLayout>
  );
};

export default AdminAnalytics;
