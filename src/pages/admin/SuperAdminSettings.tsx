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
import { CategoryImageManager } from "@/components/admin/CategoryImageManager";
import { ProductImageCandidates } from "@/components/admin/ProductImageCandidates";
import BulkBackgroundRemover from "@/components/admin/BulkBackgroundRemover";
import { BulkStockManager } from "@/components/admin/BulkStockManager";
import { WeeklyPromotionsManagement } from "@/components/admin/WeeklyPromotionsManagement";
import { HideProductsWithoutImages } from "@/components/admin/HideProductsWithoutImages";
import { MasterImageLinker } from "@/components/admin/MasterImageLinker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PricingVisibilityToggle } from "@/components/admin/PricingVisibilityToggle";
import { Settings, Tags, Building2, Truck, CreditCard, TestTube, Activity, Megaphone, Image, Folder, Scissors, Package, FileText, EyeOff, Wrench, DollarSign } from "lucide-react";

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
              <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 xl:grid-cols-15 gap-1 h-auto flex-wrap">
                <TabsTrigger value="site-settings" className="flex items-center gap-2 text-xs">
                  <DollarSign className="h-4 w-4" />
                  <span className="hidden sm:inline">Site</span>
                </TabsTrigger>
                <TabsTrigger value="orders" className="flex items-center gap-2 text-xs">
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Orders</span>
                </TabsTrigger>
                <TabsTrigger value="status" className="flex items-center gap-2 text-xs">
                  <Activity className="h-4 w-4" />
                  <span className="hidden sm:inline">Status</span>
                </TabsTrigger>
                <TabsTrigger value="categories" className="flex items-center gap-2 text-xs">
                  <Tags className="h-4 w-4" />
                  <span className="hidden sm:inline">Categories</span>
                </TabsTrigger>
                <TabsTrigger value="brands" className="flex items-center gap-2 text-xs">
                  <Building2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Brands</span>
                </TabsTrigger>
                <TabsTrigger value="banners" className="flex items-center gap-2 text-xs">
                  <Megaphone className="h-4 w-4" />
                  <span className="hidden sm:inline">Banners</span>
                </TabsTrigger>
                <TabsTrigger value="promotions" className="flex items-center gap-2 text-xs">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Promotions</span>
                </TabsTrigger>
                <TabsTrigger value="banner-guide" className="flex items-center gap-2 text-xs">
                  <Image className="h-4 w-4" />
                  <span className="hidden sm:inline">Guide</span>
                </TabsTrigger>
                <TabsTrigger value="delivery" className="flex items-center gap-2 text-xs">
                  <Truck className="h-4 w-4" />
                  <span className="hidden sm:inline">Delivery</span>
                </TabsTrigger>
                <TabsTrigger value="testing" className="flex items-center gap-2 text-xs">
                  <TestTube className="h-4 w-4" />
                  <span className="hidden sm:inline">Testing</span>
                </TabsTrigger>
                <TabsTrigger value="product-images" className="flex items-center gap-2 text-xs">
                  <Image className="h-4 w-4" />
                  <span className="hidden sm:inline">P Images</span>
                </TabsTrigger>
                <TabsTrigger value="category-images" className="flex items-center gap-2 text-xs">
                  <Folder className="h-4 w-4" />
                  <span className="hidden sm:inline">C Images</span>
                </TabsTrigger>
                <TabsTrigger value="image-candidates" className="flex items-center gap-2 text-xs">
                  <Image className="h-4 w-4" />
                  <span className="hidden sm:inline">Candidates</span>
                </TabsTrigger>
                <TabsTrigger value="background-remover" className="flex items-center gap-2 text-xs">
                  <Scissors className="h-4 w-4" />
                  <span className="hidden sm:inline">BG Remove</span>
                </TabsTrigger>
                <TabsTrigger value="stock-manager" className="flex items-center gap-2 text-xs">
                  <Package className="h-4 w-4" />
                  <span className="hidden sm:inline">Stock</span>
                </TabsTrigger>
                <TabsTrigger value="hide-products" className="flex items-center gap-2 text-xs">
                  <EyeOff className="h-4 w-4" />
                  <span className="hidden sm:inline">Hide No Img</span>
                </TabsTrigger>
                <TabsTrigger value="repair-tester" className="flex items-center gap-2 text-xs">
                  <Wrench className="h-4 w-4" />
                  <span className="hidden sm:inline">Master Linker</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="site-settings">
                <Card>
                  <CardHeader>
                    <CardTitle>Site Settings</CardTitle>
                    <CardDescription>
                      Configure global site settings including pricing visibility and customer experience options.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PricingVisibilityToggle />
                  </CardContent>
                </Card>
              </TabsContent>

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

              <TabsContent value="promotions">
                <Card>
                  <CardHeader>
                    <CardTitle>Weekly Promotions Management</CardTitle>
                    <CardDescription>
                      Upload and manage weekly promotional materials like PDFs and images. Configure the promotions page settings and track download analytics.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <WeeklyPromotionsManagement />
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

              <TabsContent value="category-images">
                <Card>
                  <CardHeader>
                    <CardTitle>Category Image Management</CardTitle>
                    <CardDescription>
                      Upload and manage images for categories. View which categories need images and update existing ones.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CategoryImageManager />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="image-candidates">
                <Card>
                  <CardHeader>
                    <CardTitle>Image Candidate Review</CardTitle>
                    <CardDescription>
                      Review and approve potential image matches found by the enhanced image linking system.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ProductImageCandidates />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="background-remover">
                <Card>
                  <CardHeader>
                    <CardTitle>AI Background Remover</CardTitle>
                    <CardDescription>
                      Automatically remove backgrounds from product images using AI. Process individual images or run bulk operations.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BulkBackgroundRemover />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="stock-manager">
                <Card>
                  <CardHeader>
                    <CardTitle>Bulk Stock Management</CardTitle>
                    <CardDescription>
                      Update stock quantities for all products at once. SuperAdmin only feature with full database access.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BulkStockManager />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="hide-products">
                <Card>
                  <CardHeader>
                    <CardTitle>Hide Products Without Images</CardTitle>
                    <CardDescription>
                      Automatically hide products that don't have any associated images to maintain a clean product catalog.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <HideProductsWithoutImages />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="repair-tester">
                <Card>
                  <CardHeader>
                    <CardTitle>Master Image Linker</CardTitle>
                    <CardDescription>
                      Comprehensive tool to link all product images using strict full SKU matching. Handles large datasets with 10,000+ products and images.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MasterImageLinker />
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