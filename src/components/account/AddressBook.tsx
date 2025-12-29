import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, MapPin, Edit, Trash2, Star } from 'lucide-react';
import { AddressForm, AddressFormData } from './AddressForm';

interface Address {
  id: string;
  label: string;
  first_name: string;
  last_name: string;
  company?: string;
  street_address: string;
  apartment?: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  phone?: string;
  is_default_billing: boolean;
  is_default_shipping: boolean;
}

export const AddressBook = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['customer-addresses', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Address[];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (data: AddressFormData) => {
      const { error } = await supabase
        .from('customer_addresses')
        .insert({ ...data, user_id: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-addresses'] });
      setIsAddDialogOpen(false);
      toast.success('Address added successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add address');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AddressFormData }) => {
      const { error } = await supabase
        .from('customer_addresses')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-addresses'] });
      setEditingAddress(null);
      toast.success('Address updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update address');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customer_addresses')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-addresses'] });
      toast.success('Address deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete address');
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: 'billing' | 'shipping' }) => {
      // First, remove default from all addresses
      const field = type === 'billing' ? 'is_default_billing' : 'is_default_shipping';
      await supabase
        .from('customer_addresses')
        .update({ [field]: false })
        .eq('user_id', user?.id);

      // Then set the new default
      const { error } = await supabase
        .from('customer_addresses')
        .update({ [field]: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-addresses'] });
      toast.success('Default address updated');
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="h-24 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Address Book
        </CardTitle>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Address
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Address</DialogTitle>
            </DialogHeader>
            <AddressForm
              onSubmit={(data) => createMutation.mutate(data)}
              loading={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {addresses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No saved addresses yet</p>
            <p className="text-sm">Add an address for faster checkout</p>
          </div>
        ) : (
          <div className="space-y-4">
            {addresses.map((address) => (
              <div
                key={address.id}
                className="border rounded-lg p-4 relative hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">{address.label}</span>
                      {address.is_default_shipping && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Default Shipping
                        </Badge>
                      )}
                      {address.is_default_billing && (
                        <Badge variant="outline" className="text-xs">
                          Default Billing
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm">
                      {address.first_name} {address.last_name}
                    </p>
                    {address.company && (
                      <p className="text-sm text-muted-foreground">{address.company}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {address.street_address}
                      {address.apartment && `, ${address.apartment}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {address.city}, {address.province} {address.postal_code}
                    </p>
                    <p className="text-sm text-muted-foreground">{address.country}</p>
                    {address.phone && (
                      <p className="text-sm text-muted-foreground mt-1">{address.phone}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Dialog open={editingAddress?.id === address.id} onOpenChange={(open) => !open && setEditingAddress(null)}>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingAddress(address)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Edit Address</DialogTitle>
                        </DialogHeader>
                        <AddressForm
                          initialData={address}
                          onSubmit={(data) => updateMutation.mutate({ id: address.id, data })}
                          loading={updateMutation.isPending}
                        />
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(address.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {!address.is_default_shipping && (
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-2 h-auto p-0 text-xs"
                    onClick={() => setDefaultMutation.mutate({ id: address.id, type: 'shipping' })}
                  >
                    Set as default shipping
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AddressBook;
