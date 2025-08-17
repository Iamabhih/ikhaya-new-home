import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { CategoryManagement } from "@/components/admin/CategoryManagement";
import { BrandManagement } from "@/components/admin/BrandManagement";
import { DeliveryZoneManagement } from "@/components/admin/DeliveryZoneManagement";
import { ProductTestingPanel } from "@/components/admin/ProductTestingPanel";
import { PromotionalBannersManagement } from "@/components/admin/PromotionalBannersManagement";
import { BannerDesignGuide } from "@/components/admin/BannerDesignGuide";
import { SystemStatusReport } from "@/components/admin/SystemStatusReport";
import { DeleteAllOrders } from "@/components/admin/DeleteAllOrders";
import { ProductImageReport } from "@/components/admin/ProductImageReport";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Tags, Building2, Truck, CreditCard, TestTube, Activity, Megaphone, Image } from "lucide-react";

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

            <Tabs defaultValue="orders" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 lg:grid-cols-9">
                <TabsTrigger value="orders" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Orders
                </TabsTrigger>
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
                <TabsTrigger value="banners" className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4" />
                  Banners
                </TabsTrigger>
                <TabsTrigger value="banner-guide" className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Guide
                </TabsTrigger>
                <TabsTrigger value="delivery" className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Delivery
                </TabsTrigger>
                <TabsTrigger value="testing" className="flex items-center gap-2">
                  <TestTube className="h-4 w-4" />
                  Testing
                </TabsTrigger>
                <TabsTrigger value="product-images" className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Product Images
                </TabsTrigger>
              </TabsList>

              <TabsContent value="orders">
                <Card>
                  <CardHeader>
                    <CardTitle>SuperAdmin Order Management</CardTitle>
                    <CardDescription>
                      Advanced order management with full edit and delete capabilities. Only available to SuperAdmins.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-yellow-800 font-medium text-sm">
                          ⚠️ SuperAdmin Order Features:
                        </p>
                        <ul className="text-yellow-700 text-sm mt-2 ml-4 list-disc">
                          <li>Edit all order details including amounts, status, and customer information</li>
                          <li>Delete orders and all related data permanently</li>
                          <li>Modify addresses, tracking numbers, and payment information</li>
                          <li>All actions are logged for security and audit purposes</li>
                        </ul>
                      </div>
                      <div className="flex gap-4">
                        <a href="/admin/orders" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                          Go to Order Management
                        </a>
                      </div>
                      
                      <div className="mt-6">
                        <DeleteAllOrders />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

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

              <TabsContent value="banners">
                <Card>
                  <CardHeader>
                    <CardTitle>Promotional Banners</CardTitle>
                    <CardDescription>
                      Manage homepage promotional banners and sales advertisements. Create engaging banners to promote sales, deals, and special offers.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PromotionalBannersManagement />
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


              <TabsContent value="banner-guide">
                <Card>
                  <CardHeader>
                    <CardTitle>Banner Design Guide</CardTitle>
                    <CardDescription>
                      Guidelines and specifications for creating promotional banners with proper dimensions and formatting.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BannerDesignGuide />
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

              <TabsContent value="product-images">
                <Card>
                  <CardHeader>
                    <CardTitle>Product Image Report</CardTitle>
                    <CardDescription>
                      View all products and their linked images. Identify products missing images and manage product-image relationships.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ProductImageReport />
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