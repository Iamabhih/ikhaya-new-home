
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { EnhancedOrderManagement } from "@/components/admin/orders/EnhancedOrderManagement";
import { OrderTestingPanel } from "@/components/admin/OrderTestingPanel";
import { HistoricalOrderCreator } from "@/components/admin/HistoricalOrderCreator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, TestTube, Calendar } from "lucide-react";

const AdminOrders = () => {
  return (
    <AdminLayout>
        <div className="space-y-8">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Order Management</h1>
              <p className="text-gray-600 text-base">Track, process, and manage customer orders</p>
            </div>
          </div>
          
          <Tabs defaultValue="orders" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="orders" className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Orders
              </TabsTrigger>
              <TabsTrigger value="historical" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Historical Order
              </TabsTrigger>
              <TabsTrigger value="testing" className="flex items-center gap-2">
                <TestTube className="h-4 w-4" />
                Testing
              </TabsTrigger>
            </TabsList>

            <TabsContent value="orders">
              <EnhancedOrderManagement />
            </TabsContent>

            <TabsContent value="historical">
              <HistoricalOrderCreator />
            </TabsContent>

            <TabsContent value="testing">
              <OrderTestingPanel />
            </TabsContent>
          </Tabs>
        </div>
    </AdminLayout>
  );
};

export default AdminOrders;
