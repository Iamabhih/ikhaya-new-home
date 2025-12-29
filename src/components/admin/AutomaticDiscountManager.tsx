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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Loader2, Percent, Tag } from 'lucide-react';
import { format } from 'date-fns';

interface AutomaticDiscount {
  id: string;
  name: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  condition_type: string;
  condition_value: Record<string, any>;
  is_active: boolean;
  priority: number;
  starts_at: string | null;
  expires_at: string | null;
  times_used: number;
  usage_limit: number | null;
}

export const AutomaticDiscountManager = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<AutomaticDiscount | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    discount_type: string;
    discount_value: number;
    condition_type: string;
    condition_value: Record<string, any>;
    is_active: boolean;
    priority: number;
    starts_at: string;
    expires_at: string;
    usage_limit: string;
  }>({
    name: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 10,
    condition_type: 'minimum_amount',
    condition_value: { amount: 500 },
    is_active: true,
    priority: 0,
    starts_at: '',
    expires_at: '',
    usage_limit: '',
  });

  const { data: discounts = [], isLoading } = useQuery({
    queryKey: ['admin-automatic-discounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automatic_discounts')
        .select('*')
        .order('priority', { ascending: false });

      if (error) throw error;
      return data as AutomaticDiscount[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        name: data.name,
        description: data.description || null,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        condition_type: data.condition_type,
        condition_value: data.condition_value,
        is_active: data.is_active,
        priority: data.priority,
        starts_at: data.starts_at || null,
        expires_at: data.expires_at || null,
        usage_limit: data.usage_limit ? parseInt(data.usage_limit) : null,
      };

      if (editingDiscount) {
        const { error } = await supabase
          .from('automatic_discounts')
          .update(payload)
          .eq('id', editingDiscount.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('automatic_discounts')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-automatic-discounts'] });
      toast.success(editingDiscount ? 'Discount updated' : 'Discount created');
      closeDialog();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save discount');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('automatic_discounts')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-automatic-discounts'] });
      toast.success('Discount deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('automatic_discounts')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-automatic-discounts'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update');
    },
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingDiscount(null);
    setFormData({
      name: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 10,
      condition_type: 'minimum_amount',
      condition_value: { amount: 500 },
      is_active: true,
      priority: 0,
      starts_at: '',
      expires_at: '',
      usage_limit: '',
    });
  };

  const openEdit = (discount: AutomaticDiscount) => {
    setEditingDiscount(discount);
    setFormData({
      name: discount.name,
      description: discount.description || '',
      discount_type: discount.discount_type,
      discount_value: discount.discount_value,
      condition_type: discount.condition_type,
      condition_value: discount.condition_value,
      is_active: discount.is_active,
      priority: discount.priority || 0,
      starts_at: discount.starts_at?.slice(0, 16) || '',
      expires_at: discount.expires_at?.slice(0, 16) || '',
      usage_limit: discount.usage_limit?.toString() || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const getConditionDisplay = (discount: AutomaticDiscount) => {
    const val = discount.condition_value;
    switch (discount.condition_type) {
      case 'minimum_amount':
        return `Min order R${val.amount || 0}`;
      case 'minimum_quantity':
        return `Min ${val.quantity || 0} items`;
      case 'specific_products':
        return `Specific products`;
      case 'buy_x_get_y':
        return `Buy ${val.buy_qty || 0} get ${val.get_qty || 0}`;
      default:
        return discount.condition_type;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Automatic Discounts</h2>
          <p className="text-muted-foreground">
            Discounts that apply automatically when conditions are met
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Discount
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingDiscount ? 'Edit Discount' : 'Create Automatic Discount'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Summer Sale 20% Off"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Internal description"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Discount Type *</Label>
                  <Select
                    value={formData.discount_type}
                    onValueChange={(val) => setFormData(prev => ({ ...prev, discount_type: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                      <SelectItem value="free_shipping">Free Shipping</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Discount Value *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.discount_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount_value: parseFloat(e.target.value) || 0 }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Condition Type *</Label>
                <Select
                  value={formData.condition_type}
                  onValueChange={(val) => setFormData(prev => ({ 
                    ...prev, 
                    condition_type: val,
                    condition_value: val === 'minimum_amount' ? { amount: 500 } : 
                                    val === 'minimum_quantity' ? { quantity: 3 } :
                                    val === 'buy_x_get_y' ? { buy_qty: 2, get_qty: 1 } : {}
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minimum_amount">Minimum Order Amount</SelectItem>
                    <SelectItem value="minimum_quantity">Minimum Quantity</SelectItem>
                    <SelectItem value="buy_x_get_y">Buy X Get Y</SelectItem>
                    <SelectItem value="all_orders">All Orders</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.condition_type === 'minimum_amount' && (
                <div className="space-y-2">
                  <Label>Minimum Amount (R)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.condition_value.amount || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      condition_value: { ...prev.condition_value, amount: parseFloat(e.target.value) || 0 }
                    }))}
                  />
                </div>
              )}

              {formData.condition_type === 'minimum_quantity' && (
                <div className="space-y-2">
                  <Label>Minimum Items</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.condition_value.quantity || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      condition_value: { ...prev.condition_value, quantity: parseInt(e.target.value) || 0 }
                    }))}
                  />
                </div>
              )}

              {formData.condition_type === 'buy_x_get_y' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Buy Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.condition_value.buy_qty || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        condition_value: { ...prev.condition_value, buy_qty: parseInt(e.target.value) || 0 }
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Get Quantity (Free)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.condition_value.get_qty || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        condition_value: { ...prev.condition_value, get_qty: parseInt(e.target.value) || 0 }
                      }))}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Starts At</Label>
                  <Input
                    type="datetime-local"
                    value={formData.starts_at}
                    onChange={(e) => setFormData(prev => ({ ...prev, starts_at: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expires At</Label>
                  <Input
                    type="datetime-local"
                    value={formData.expires_at}
                    onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Usage Limit (optional)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.usage_limit}
                    onChange={(e) => setFormData(prev => ({ ...prev, usage_limit: e.target.value }))}
                    placeholder="Unlimited"
                  />
                </div>
                <div className="flex items-center space-x-2 pt-8">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingDiscount ? 'Update Discount' : 'Create Discount'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">Loading...</div>
          ) : discounts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No automatic discounts yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Used</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discounts.map((discount) => (
                  <TableRow key={discount.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{discount.name}</div>
                        {discount.description && (
                          <div className="text-sm text-muted-foreground">{discount.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {discount.discount_type === 'percentage' ? (
                          <><Percent className="h-3 w-3" />{discount.discount_value}%</>
                        ) : discount.discount_type === 'free_shipping' ? (
                          'Free Shipping'
                        ) : (
                          `R${discount.discount_value}`
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getConditionDisplay(discount)}</TableCell>
                    <TableCell>
                      <Switch
                        checked={discount.is_active}
                        onCheckedChange={(checked) => toggleMutation.mutate({ id: discount.id, is_active: checked })}
                      />
                    </TableCell>
                    <TableCell>
                      {discount.times_used || 0}
                      {discount.usage_limit && ` / ${discount.usage_limit}`}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(discount)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => deleteMutation.mutate(discount.id)}
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
    </div>
  );
};

export default AutomaticDiscountManager;