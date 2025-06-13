
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { AdminSetup } from "@/components/admin/AdminSetup";
import { AdminStatus } from "@/components/admin/AdminStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";
import { Link } from "react-router-dom";

const AdminSetupPage = () => {
  return (
    <AdminProtectedRoute requireSuperAdmin={true}>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Button variant="outline" asChild className="mb-4">
              <Link to="/admin">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin Dashboard
              </Link>
            </Button>
            
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Admin Setup</h1>
            </div>
            <p className="text-muted-foreground">
              Manage admin roles and user permissions. Only SuperAdmins can access this area.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-6">
              <AdminSetup />
            </div>
            
            <div className="space-y-6">
              <AdminStatus />
              
              <Card>
                <CardHeader>
                  <CardTitle>Setup Instructions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <h4 className="font-medium">Getting Started:</h4>
                    <ol className="list-decimal list-inside space-y-1 mt-2 text-muted-foreground">
                      <li>The first user to register was automatically promoted to SuperAdmin</li>
                      <li>Use the form above to promote additional users to Admin or SuperAdmin</li>
                      <li>Test the admin functionality by logging in with different user accounts</li>
                      <li>Admins can manage products, orders, and view analytics</li>
                      <li>SuperAdmins can additionally manage user roles</li>
                    </ol>
                  </div>
                  
                  <div>
                    <h4 className="font-medium">Security Notes:</h4>
                    <ul className="list-disc list-inside space-y-1 mt-2 text-muted-foreground">
                      <li>Users must be registered before they can be promoted</li>
                      <li>Only SuperAdmins can promote users to admin roles</li>
                      <li>All admin actions are protected by Row Level Security</li>
                      <li>Admin sessions are secured with Supabase authentication</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AdminProtectedRoute>
  );
};

export default AdminSetupPage;
