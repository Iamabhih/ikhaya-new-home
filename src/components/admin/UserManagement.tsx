
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Search, UserPlus, Edit, Shield, Trash2, AlertTriangle } from "lucide-react";
import { validateEmail, validateName } from "@/utils/validation";
import type { AppRole } from "@/hooks/useRoles";

interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  company_name: string | null;
  wholesale_approved: boolean;
  created_at: string;
  roles: AppRole[];
}

export const UserManagement = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole | "all">("all");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Fetch users with their roles
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users', searchTerm, selectedRole],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select(`
          id,
          email,
          first_name,
          last_name,
          phone,
          company_name,
          wholesale_approved,
          created_at
        `);

      if (searchTerm) {
        query = query.or(`email.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`);
      }

      const { data: profiles, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;

      // Fetch roles for each user
      const usersWithRoles = await Promise.all(
        profiles.map(async (profile) => {
          const { data: userRoles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id);
          
          return {
            ...profile,
            roles: userRoles?.map(r => r.role as AppRole) || []
          };
        })
      );

      // Filter by role if specified
      if (selectedRole !== "all") {
        return usersWithRoles.filter(user => user.roles.includes(selectedRole));
      }

      return usersWithRoles;
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<User> }) => {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User updated successfully');
      setEditingUser(null);
    },
    onError: (error) => {
      toast.error('Failed to update user');
      console.error(error);
    },
  });

  // Assign role mutation
  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase.rpc('assign_user_role', {
        target_user_id: userId,
        target_role: role
      });
      
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Role assigned successfully');
    },
    onError: (error) => {
      console.error('Error assigning role:', error);
      toast.error(`Failed to assign role: ${error.message}`);
    },
  });

  // Remove role mutation
  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase.rpc('remove_user_role', {
        target_user_id: userId,
        target_role: role
      });
      
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Role removed successfully');
    },
    onError: (error) => {
      console.error('Error removing role:', error);
      toast.error(`Failed to remove role: ${error.message}`);
    },
  });

  // Delete user mutation (calls Edge Function with service role)
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      setDeletingUserId(userId);
      // Explicitly fetch session token to guarantee it is attached even if the
      // supabase client's internal session hasn't fully hydrated yet.
      const { data: sessionData } = await supabase.auth.getSession();
      const authHeaders = sessionData.session?.access_token
        ? { Authorization: `Bearer ${sessionData.session.access_token}` }
        : undefined;
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
        headers: authHeaders,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User deleted successfully');
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
    },
    onError: (error: any) => {
      console.error('Error deleting user:', error);
      toast.error(`Failed to delete user: ${error.message}`);
    },
    onSettled: () => {
      setDeletingUserId(null);
    },
  });

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
    }
  };

  const validateUserForm = (user: Partial<User>): boolean => {
    const errors: string[] = [];
    
    if (user.email && !validateEmail(user.email)) {
      errors.push("Please enter a valid email address");
    }
    
    if (user.first_name && !validateName(user.first_name)) {
      errors.push("First name must contain only letters, spaces, hyphens, and apostrophes");
    }
    
    if (user.last_name && !validateName(user.last_name)) {
      errors.push("Last name must contain only letters, spaces, hyphens, and apostrophes");
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleUpdateUser = (updates: Partial<User>) => {
    if (!editingUser) return;
    
    if (!validateUserForm(updates)) return;
    
    updateUserMutation.mutate({ userId: editingUser.id, updates });
  };

  const handleAssignRole = (userId: string, role: AppRole) => {
    assignRoleMutation.mutate({ userId, role });
  };

  const handleRemoveRole = (userId: string, role: AppRole) => {
    removeRoleMutation.mutate({ userId, role });
  };

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case 'superadmin': return 'destructive';
      case 'admin': return 'secondary';
      case 'manager': return 'default';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <Label htmlFor="search">Search Users</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by email, name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="role-filter">Filter by Role</Label>
              <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as AppRole | "all")}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="superadmin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Wholesale</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {user.first_name && user.last_name 
                          ? `${user.first_name} ${user.last_name}`
                          : 'No name set'
                        }
                      </div>
                      {user.company_name && (
                        <div className="text-sm text-muted-foreground">{user.company_name}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {user.roles.map((role) => (
                        <Badge 
                          key={role} 
                          variant={getRoleBadgeVariant(role)}
                          className="text-xs"
                        >
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.wholesale_approved ? "default" : "outline"}>
                      {user.wholesale_approved ? "Approved" : "Not Approved"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingUser(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit User</DialogTitle>
                          </DialogHeader>
                          <EditUserForm
                            user={editingUser}
                            onSave={handleUpdateUser}
                            onAssignRole={handleAssignRole}
                            onRemoveRole={handleRemoveRole}
                            validationErrors={validationErrors}
                            isLoading={updateUserMutation.isPending}
                          />
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                        onClick={() => handleDeleteClick(user)}
                        disabled={deletingUserId === user.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete User Account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                This action is <strong>permanent</strong> and cannot be undone. The user's account
                and all associated data (roles, cart, loyalty points) will be deleted.
                Their orders will be retained but unlinked from this account.
              </AlertDescription>
            </Alert>
            {userToDelete && (
              <p className="text-sm">
                User: <strong>{userToDelete.first_name} {userToDelete.last_name}</strong>{" "}
                ({userToDelete.email})
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => { setDeleteConfirmOpen(false); setUserToDelete(null); }}
                disabled={deleteUserMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={deleteUserMutation.isPending}
              >
                {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface EditUserFormProps {
  user: User | null;
  onSave: (updates: Partial<User>) => void;
  onAssignRole: (userId: string, role: AppRole) => void;
  onRemoveRole: (userId: string, role: AppRole) => void;
  validationErrors: string[];
  isLoading: boolean;
}

const EditUserForm = ({ user, onSave, onAssignRole, onRemoveRole, validationErrors, isLoading }: EditUserFormProps) => {
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || '',
    company_name: user?.company_name || '',
    wholesale_approved: user?.wholesale_approved || false,
  });
  const [newRole, setNewRole] = useState<AppRole>('customer');

  if (!user) return null;

  const availableRoles: AppRole[] = ['customer', 'admin', 'manager', 'superadmin'];

  return (
    <div className="space-y-4">
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index} className="text-sm">{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="first_name">First Name</Label>
          <Input
            id="first_name"
            value={formData.first_name}
            onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="last_name">Last Name</Label>
          <Input
            id="last_name"
            value={formData.last_name}
            onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          value={formData.phone}
          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
        />
      </div>

      <div>
        <Label htmlFor="company_name">Company Name</Label>
        <Input
          id="company_name"
          value={formData.company_name}
          onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
        />
      </div>

      {/* Role Management */}
      <div>
        <Label>Current Roles</Label>
        <div className="flex gap-2 mb-2">
          {user.roles.map((role) => (
            <Badge 
              key={role} 
              variant="secondary"
              className="cursor-pointer"
              onClick={() => onRemoveRole(user.id, role)}
            >
              {role} ×
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Select value={newRole} onValueChange={(value) => setNewRole(value as AppRole)}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableRoles.filter(role => !user.roles.includes(role)).map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            type="button" 
            variant="outline"
            onClick={() => onAssignRole(user.id, newRole)}
            disabled={user.roles.includes(newRole)}
          >
            <UserPlus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button 
          onClick={() => onSave(formData)}
          disabled={isLoading}
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
};
