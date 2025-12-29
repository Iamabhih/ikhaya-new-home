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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Gift, Search, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export const GiftCardManager = () => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createForm, setCreateForm] = useState({
    amount: 250,
    recipientEmail: '',
    recipientName: '',
  });

  const { data: giftCards = [], isLoading } = useQuery({
    queryKey: ['admin-gift-cards', statusFilter, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('gift_cards')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (searchTerm) {
        query = query.or(`code.ilike.%${searchTerm}%,recipient_email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const code = `GC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      const { error } = await supabase
        .from('gift_cards')
        .insert({
          code,
          initial_balance: createForm.amount,
          current_balance: createForm.amount,
          recipient_email: createForm.recipientEmail || null,
          recipient_name: createForm.recipientName || null,
          status: 'active',
        });

      if (error) throw error;
      return code;
    },
    onSuccess: (code) => {
      queryClient.invalidateQueries({ queryKey: ['admin-gift-cards'] });
      toast.success(`Gift card created: ${code}`);
      setIsCreateOpen(false);
      setCreateForm({ amount: 250, recipientEmail: '', recipientName: '' });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create gift card');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('gift_cards')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-gift-cards'] });
      toast.success('Gift card updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update');
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      used: 'secondary',
      disabled: 'destructive',
      expired: 'outline',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const totalValue = giftCards.reduce((sum, gc) => sum + (gc.current_balance || 0), 0);
  const activeCards = giftCards.filter(gc => gc.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Gift Cards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{giftCards.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Cards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCards}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R{totalValue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by code or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="used">Used</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Gift Card
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Gift Card</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Amount (R)</Label>
                <Input
                  type="number"
                  min="50"
                  max="10000"
                  value={createForm.amount}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Recipient Email (optional)</Label>
                <Input
                  type="email"
                  value={createForm.recipientEmail}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, recipientEmail: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Recipient Name (optional)</Label>
                <Input
                  value={createForm.recipientName}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, recipientName: e.target.value }))}
                />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Gift className="h-4 w-4 mr-2" />}
                Create Gift Card
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">Loading...</div>
          ) : giftCards.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No gift cards found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Initial</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {giftCards.map((gc) => (
                  <TableRow key={gc.id}>
                    <TableCell className="font-mono font-medium">{gc.code}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {gc.recipient_name && <div>{gc.recipient_name}</div>}
                        {gc.recipient_email && <div className="text-muted-foreground">{gc.recipient_email}</div>}
                        {!gc.recipient_name && !gc.recipient_email && <span className="text-muted-foreground">-</span>}
                      </div>
                    </TableCell>
                    <TableCell>R{gc.initial_balance?.toFixed(2)}</TableCell>
                    <TableCell>R{gc.current_balance?.toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(gc.status)}</TableCell>
                    <TableCell>
                      {gc.created_at && format(new Date(gc.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={gc.status}
                        onValueChange={(status) => updateStatusMutation.mutate({ id: gc.id, status })}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="disabled">Disabled</SelectItem>
                        </SelectContent>
                      </Select>
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

export default GiftCardManager;