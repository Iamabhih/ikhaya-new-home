import { useState } from "react";
import { UserManagement } from "@/components/admin/UserManagement";
import { TraderApplications } from "@/components/admin/TraderApplications";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Building2 } from "lucide-react";

const AdminUsers = () => {
  const [activeTab, setActiveTab] = useState("traders");

  return (
    <AdminProtectedRoute requireSuperAdmin>
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">User & Trader Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage users, roles, and trader applications
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="traders" className="gap-2">
                <Building2 className="h-4 w-4" />
                Trader Applications
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                All Users
              </TabsTrigger>
            </TabsList>

            <TabsContent value="traders" className="mt-6">
              <TraderApplications />
            </TabsContent>

            <TabsContent value="users" className="mt-6">
              <UserManagement />
            </TabsContent>
          </Tabs>
        </div>
      </AdminLayout>
    </AdminProtectedRoute>
  );
};

export default AdminUsers;
