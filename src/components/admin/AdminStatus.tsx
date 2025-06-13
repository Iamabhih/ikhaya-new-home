
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, User, Crown } from "lucide-react";

export const AdminStatus = () => {
  const { user } = useAuth();
  const { roles, isAdmin, isSuperAdmin } = useRoles(user);

  if (!user) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Current User Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium">Email: {user.email}</p>
          <p className="text-sm text-muted-foreground">User ID: {user.id}</p>
        </div>
        
        <div>
          <p className="text-sm font-medium mb-2">Current Roles:</p>
          <div className="flex gap-2 flex-wrap">
            {roles.length > 0 ? (
              roles.map((role) => (
                <Badge 
                  key={role} 
                  variant={role === 'superadmin' ? 'destructive' : role === 'admin' ? 'secondary' : 'outline'}
                  className="flex items-center gap-1"
                >
                  {role === 'superadmin' && <Crown className="h-3 w-3" />}
                  {role === 'admin' && <Shield className="h-3 w-3" />}
                  {role}
                </Badge>
              ))
            ) : (
              <Badge variant="outline">customer</Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Admin Access:</span>
            <Badge variant={isAdmin() ? "default" : "outline"} className="ml-2">
              {isAdmin() ? "Yes" : "No"}
            </Badge>
          </div>
          <div>
            <span className="font-medium">SuperAdmin:</span>
            <Badge variant={isSuperAdmin() ? "destructive" : "outline"} className="ml-2">
              {isSuperAdmin() ? "Yes" : "No"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
