import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { CategoryManagement } from "@/components/admin/CategoryManagement";
import { BrandManagement } from "@/components/admin/BrandManagement";
import { DeliveryZoneManagement } from "@/components/admin/DeliveryZoneManagement";
import { PaymentMethodsConfig } from "@/components/admin/PaymentMethodsConfig";
import { ProductTestingPanel } from "@/components/admin/ProductTestingPanel";
import { SystemStatusReport } from "@/components/admin/SystemStatusReport";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Tags, Building2, Truck, CreditCard, TestTube, Activity } from "lucide-react";

const SuperAdminSettings = () => {
  return (
    <AdminProtectedRoute requireSuperAdmin={true}>
      <AdminLayout>
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Settings className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">SuperAdmin Settings</h1>
                <p className="text-muted-foreground">
                  Manage categories, brands, delivery zones, and payment methods
                </p>
              </div>
            </div>

            <Tabs defaultValue="status" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
                <TabsTrigger value="status" className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Status
                </TabsTrigger>
                <TabsTrigger value="categories" className="flex items-center gap-2">
                  <Tags className="h-4 w-4" />
                  Categories
                </TabsTrigger>
                <TabsTrigger value="brands" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Brands
                </TabsTrigger>
                <TabsTrigger value="delivery" className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Delivery
                </TabsTrigger>
                <TabsTrigger value="payments" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payments
                </TabsTrigger>
                <TabsTrigger value="testing" className="flex items-center gap-2">
                  <TestTube className="h-4 w-4" />
                  Testing
                </TabsTrigger>
              </TabsList>

              <TabsContent value="status">
                <Card>
                  <CardHeader>
                    <CardTitle>System Status & Production Readiness</CardTitle>
                    <CardDescription>
                      Monitor system health, run comprehensive tests, and verify production readiness.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SystemStatusReport />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="categories">
                <Card>
                  <CardHeader>
                    <CardTitle>Category Management</CardTitle>
                    <CardDescription>
                      Create, edit, and organize product categories. Categories help customers navigate your product catalog.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CategoryManagement />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="brands">
                <Card>
                  <CardHeader>
                    <CardTitle>Brand Management</CardTitle>
                    <CardDescription>
                      Manage product brands and manufacturers. Brands help customers identify product origins and quality.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BrandManagement />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="delivery">
                <Card>
                  <CardHeader>
                    <CardTitle>Delivery Zone Management</CardTitle>
                    <CardDescription>
                      Configure delivery zones, fees, and shipping options for different areas and order values.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DeliveryZoneManagement />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payments">
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Methods Configuration</CardTitle>
                    <CardDescription>
                      Configure PayFast and PayFlex payment methods, including merchant details, fees, and availability.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PaymentMethodsConfig />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="testing">
                <Card>
                  <CardHeader>
                    <CardTitle>System Testing & Monitoring</CardTitle>
                    <CardDescription>
                      Run end-to-end tests for product management, orders, and system functionality.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ProductTestingPanel />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
      </AdminLayout>
    </AdminProtectedRoute>
  );
};

export default SuperAdminSettings;