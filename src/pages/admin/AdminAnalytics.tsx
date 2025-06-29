
import { ProductAnalyticsDashboard } from "@/components/admin/ProductAnalyticsDashboard";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

const AdminAnalytics = () => {
  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        </div>
        
        <ProductAnalyticsDashboard />
      </div>
    </ErrorBoundary>
  );
};

export default AdminAnalytics;
