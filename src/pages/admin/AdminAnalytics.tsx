
import { ProductAnalyticsDashboard } from "@/components/admin/ProductAnalyticsDashboard";
import { OrdersMetrics } from "@/components/admin/orders/OrdersMetrics";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
            
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="orders">Orders</TabsTrigger>
                <TabsTrigger value="products">Products</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-6">
                <OrdersMetrics />
                <ProductAnalyticsDashboard />
              </TabsContent>
              
              <TabsContent value="orders" className="space-y-6">
                <OrdersMetrics />
              </TabsContent>
              
              <TabsContent value="products" className="space-y-6">
                <ProductAnalyticsDashboard />
              </TabsContent>
            </Tabs>
          </div>
        </ErrorBoundary>
      </AdminLayout>
    </AdminProtectedRoute>
  );
};

export default AdminAnalytics;
