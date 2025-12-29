import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';

interface ProductVariant {
  id: string;
  parent_product_id: string;
  sku: string;
  price: number;
  compare_at_price?: number | null;
  stock_quantity: number;
  is_active: boolean;
}

interface VariantManagerProps {
  productId: string;
  basePrice: number;
}

export const VariantManager = ({ productId, basePrice }: VariantManagerProps) => {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [formData, setFormData] = useState({
    sku: '',
    price: basePrice,
    compare_at_price: '',
    stock_quantity: 0,
    is_active: true,
  });

  const { data: variants = [], isLoading } = useQuery({
    queryKey: ['admin-product-variants', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ProductVariant[];
    },
    enabled: !!productId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('product_variants')
        .insert({
          parent_product_id: productId,
          sku: data.sku,
          price: data.price,
          compare_at_price: data.compare_at_price ? parseFloat(data.compare_at_price) : null,
          stock_quantity: data.stock_quantity,
          is_active: data.is_active,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-product-variants'] });
      setIsAddDialogOpen(false);
      resetForm();
      toast.success('Variant created');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create variant');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('product_variants')
        .update({
          sku: data.sku,
          price: data.price,
          compare_at_price: data.compare_at_price ? parseFloat(data.compare_at_price) : null,
          stock_quantity: data.stock_quantity,
          is_active: data.is_active,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-product-variants'] });
      setEditingVariant(null);
      resetForm();
      toast.success('Variant updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update variant');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_variants')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-product-variants'] });
      toast.success('Variant deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete variant');
    },
  });

  const resetForm = () => {
    setFormData({
      sku: '',
      price: basePrice,
      compare_at_price: '',
      stock_quantity: 0,
      is_active: true,
    });
  };

  const openEditDialog = (variant: ProductVariant) => {
    setEditingVariant(variant);
    setFormData({
      sku: variant.sku,
      price: variant.price,
      compare_at_price: variant.compare_at_price?.toString() || '',
      stock_quantity: variant.stock_quantity,
      is_active: variant.is_active,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingVariant) {
      updateMutation.mutate({ id: editingVariant.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const VariantForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>SKU *</Label>
          <Input
            value={formData.sku}
            onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Stock Quantity *</Label>
          <Input
            type="number"
            min="0"
            value={formData.stock_quantity}
            onChange={(e) => setFormData(prev => ({ ...prev, stock_quantity: parseInt(e.target.value) || 0 }))}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Price (R) *</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={formData.price}
            onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Compare at Price (R)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={formData.compare_at_price}
            onChange={(e) => setFormData(prev => ({ ...prev, compare_at_price: e.target.value }))}
          />
        </div>
      </div>


      <div className="flex items-center space-x-2">
        <Switch
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
        />
        <Label htmlFor="is_active">Active</Label>
      </div>

      <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
        {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        {editingVariant ? 'Update Variant' : 'Create Variant'}
      </Button>
    </form>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Product Variants</CardTitle>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Variant
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Product Variant</DialogTitle>
            </DialogHeader>
            <VariantForm />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">Loading variants...</div>
        ) : variants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No variants yet</p>
            <p className="text-sm">Add variants for different sizes, colors, etc.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants.map((variant) => (
                <TableRow key={variant.id}>
                  <TableCell className="font-mono">{variant.sku}</TableCell>
                  <TableCell>R{variant.price.toFixed(2)}</TableCell>
                  <TableCell>{variant.stock_quantity}</TableCell>
                  <TableCell>
                    <Badge variant={variant.is_active ? 'default' : 'secondary'}>
                      {variant.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Dialog open={editingVariant?.id === variant.id} onOpenChange={(open) => !open && setEditingVariant(null)}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(variant)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Variant</DialogTitle>
                          </DialogHeader>
                          <VariantForm />
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(variant.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default VariantManager;
