
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, UserPlus, Crown } from "lucide-react";
import { validateEmail } from "@/utils/validation";

export const AdminSetup = () => {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [validationError, setValidationError] = useState("");

  const createAdminMutation = useMutation({
    mutationFn: async (userEmail: string) => {
      const { data, error } = await supabase.rpc('create_admin_user', {
        user_email: userEmail
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User promoted to admin successfully');
      setEmail("");
    },
    onError: (error: any) => {
      toast.error(`Failed to promote user: ${error.message}`);
    },
  });

  const createSuperAdminMutation = useMutation({
    mutationFn: async (userEmail: string) => {
      const { data, error } = await supabase.rpc('create_superadmin_user', {
        user_email: userEmail
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User promoted to superadmin successfully');
      setEmail("");
    },
    onError: (error: any) => {
      toast.error(`Failed to promote user: ${error.message}`);
    },
  });

  const validateForm = (): boolean => {
    if (!email) {
      setValidationError("Email is required");
      return false;
    }
    
    if (!validateEmail(email)) {
      setValidationError("Please enter a valid email address");
      return false;
    }
    
    setValidationError("");
    return true;
  };

  const handlePromoteToAdmin = () => {
    if (!validateForm()) return;
    createAdminMutation.mutate(email);
  };

  const handlePromoteToSuperAdmin = () => {
    if (!validateForm()) return;
    createSuperAdminMutation.mutate(email);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Admin Setup & User Promotion
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="user-email">User Email</Label>
            <Input
              id="user-email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {validationError && (
              <Alert variant="destructive" className="mt-2">
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handlePromoteToAdmin}
              disabled={createAdminMutation.isPending || !email}
              className="flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Promote to Admin
            </Button>
            
            <Button
              onClick={handlePromoteToSuperAdmin}
              disabled={createSuperAdminMutation.isPending || !email}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <Crown className="h-4 w-4" />
              Promote to SuperAdmin
            </Button>
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-medium mb-2">Role Hierarchy</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Customer</Badge>
              <span className="text-muted-foreground">Default role for all users</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Admin</Badge>
              <span className="text-muted-foreground">Can manage products, orders, and view analytics</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="destructive">SuperAdmin</Badge>
              <span className="text-muted-foreground">Can manage user roles and all admin functions</span>
            </div>
          </div>
        </div>

        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Only SuperAdmins can promote users to admin roles. Make sure you have at least one SuperAdmin account before testing role management.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
