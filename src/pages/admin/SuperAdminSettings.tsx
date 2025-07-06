import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { CategoryManagement } from "@/components/admin/CategoryManagement";
import { BrandManagement } from "@/components/admin/BrandManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Tags, Building2 } from "lucide-react";

const SuperAdminSettings = () => {
  return (
    <AdminProtectedRoute requireSuperAdmin={true}>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Settings className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">SuperAdmin Settings</h1>
                <p className="text-muted-foreground">
                  Manage categories, brands, and system configuration
                </p>
              </div>
            </div>

            <Tabs defaultValue="categories" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="categories" className="flex items-center gap-2">
                  <Tags className="h-4 w-4" />
                  Categories
                </TabsTrigger>
                <TabsTrigger value="brands" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Brands
                </TabsTrigger>
              </TabsList>

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
            </Tabs>
          </div>
        </main>
        <Footer />
      </div>
    </AdminProtectedRoute>
  );
};

export default SuperAdminSettings;