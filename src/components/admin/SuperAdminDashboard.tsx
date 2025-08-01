import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRoles } from "@/hooks/useRoles";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, Edit3, Database, Users, Settings } from "lucide-react";
import { Link } from "react-router-dom";

export const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const { isSuperAdmin } = useRoles(user);

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
          <p className="text-muted-foreground">
            You need SuperAdmin privileges to access this section.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">SuperAdmin Settings</h1>
          <p className="text-gray-600">Advanced system management and configuration</p>
        </div>
        <Badge variant="destructive" className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          SuperAdmin Access
        </Badge>
      </div>

      {/* Super Admin Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Order Management */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-blue-600" />
              Advanced Order Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Full edit and delete capabilities for all orders in the system.
            </p>
            <ul className="text-sm space-y-1 mb-4">
              <li>• Edit order details, amounts, and status</li>
              <li>• Delete orders and related data</li>
              <li>• Modify customer information</li>
              <li>• Update addresses and tracking</li>
            </ul>
            <Button asChild className="w-full">
              <Link to="/admin/orders">
                Manage Orders
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Database Management */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-green-600" />
              Database Administration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Direct database access and advanced system controls.
            </p>
            <ul className="text-sm space-y-1 mb-4">
              <li>• Bulk data operations</li>
              <li>• Database maintenance</li>
              <li>• System performance monitoring</li>
              <li>• Data export and backup</li>
            </ul>
            <Button variant="outline" className="w-full" disabled>
              Coming Soon
            </Button>
          </CardContent>
        </Card>

        {/* User Management */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              Advanced User Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Comprehensive user administration and role management.
            </p>
            <ul className="text-sm space-y-1 mb-4">
              <li>• Create/delete user accounts</li>
              <li>• Assign and modify roles</li>
              <li>• User activity monitoring</li>
              <li>• Security management</li>
            </ul>
            <Button asChild variant="outline" className="w-full">
              <Link to="/admin/users">
                User Management
              </Link>
            </Button>
          </CardContent>
        </Card>

      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Status & Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">Online</div>
              <p className="text-sm text-muted-foreground">System Status</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">99.9%</div>
              <p className="text-sm text-muted-foreground">Uptime</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">Active</div>
              <p className="text-sm text-muted-foreground">All Services</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warning Notice */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-800">SuperAdmin Privileges</h3>
              <p className="text-sm text-yellow-700 mt-1">
                You have unrestricted access to all system functions. Use these powers responsibly. 
                All superadmin actions are logged and monitored for security purposes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};