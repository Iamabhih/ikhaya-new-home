
import { useState } from "react";
import { ProductAnalyticsDashboard } from "@/components/admin/ProductAnalyticsDashboard";
import { VisitorAnalyticsDashboard } from "@/components/admin/VisitorAnalyticsDashboard";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AdminAnalytics = () => {
  const [activeTab, setActiveTab] = useState("visitor");

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
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="visitor">Visitor Analytics</TabsTrigger>
                <TabsTrigger value="product">Product Analytics</TabsTrigger>
              </TabsList>
              
              <TabsContent value="visitor" className="space-y-6">
                <VisitorAnalyticsDashboard />
              </TabsContent>
              
              <TabsContent value="product" className="space-y-6">
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
