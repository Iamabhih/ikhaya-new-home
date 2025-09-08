
import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRoles } from "@/hooks/useRoles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

interface AdminProtectedRouteProps {
  children: ReactNode;
  requireSuperAdmin?: boolean;
  allowManager?: boolean;
}

export const AdminProtectedRoute = ({ children, requireSuperAdmin = false, allowManager = false }: AdminProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isManager, isSuperAdmin, loading: rolesLoading } = useRoles(user);

  // Show loading state
  if (authLoading || rolesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Check authentication
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Please sign in to access the admin panel.
            </p>
            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link to="/auth">Sign In</Link>
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link to="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check permissions
  const hasPermission = requireSuperAdmin 
    ? isSuperAdmin() 
    : allowManager 
    ? isAdmin() || isManager() 
    : isAdmin();

  if (!hasPermission) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              You don't have permission to access this area.
            </p>
            <p className="text-sm text-muted-foreground">
              {requireSuperAdmin 
                ? 'Super admin access required.' 
                : allowManager
                ? 'Admin or Manager access required.'
                : 'Admin access required.'}
            </p>
            <p className="text-xs text-muted-foreground">
              Current user: {user.email}
            </p>
            <div className="space-y-2">
              <Button variant="outline" asChild className="w-full">
                <Link to="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
