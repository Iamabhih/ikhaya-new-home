import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { FileText, Eye, Check, X, DollarSign } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AdminLayout } from '@/components/admin/AdminLayout';

interface Quote {
  id: string;
  quote_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  company_name?: string;
  status: string;
  subtotal: number;
  total_amount: number;
  notes?: string;
  admin_notes?: string;
  created_at: string;
  items: Array<{
    id: string;
    product_name: string;
    product_sku?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

const AdminQuotes = () => {
  const queryClient = useQueryClient();
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pricingData, setPricingData] = useState<Record<string, number>>({});
  const [adminNotes, setAdminNotes] = useState('');

  const { data: quotes, isLoading } = useQuery({
    queryKey: ['admin-quotes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          items:quote_items(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Quote[];
    },
  });

  const updateQuoteMutation = useMutation({
    mutationFn: async ({
      quoteId,
      status,
      items,
      adminNotes,
    }: {
      quoteId: string;
      status: string;
      items?: Array<{ id: string; unit_price: number }>;
      adminNotes?: string;
    }) => {
      // Update quote status and notes
      const { error: quoteError } = await supabase
        .from('quotes')
        .update({
          status,
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', quoteId);

      if (quoteError) throw quoteError;

      // Update item prices if provided
      if (items) {
        for (const item of items) {
          const { error: itemError } = await supabase
            .from('quote_items')
            .update({
              unit_price: item.unit_price,
              total_price: item.unit_price * (selectedQuote?.items.find(i => i.id === item.id)?.quantity || 0),
            })
            .eq('id', item.id);

          if (itemError) throw itemError;
        }

        // Recalculate quote totals
        const totalAmount = items.reduce((sum, item) => {
          const quantity = selectedQuote?.items.find(i => i.id === item.id)?.quantity || 0;
          return sum + (item.unit_price * quantity);
        }, 0);

        const { error: totalError } = await supabase
          .from('quotes')
          .update({
            subtotal: totalAmount,
            total_amount: totalAmount,
          })
          .eq('id', quoteId);

        if (totalError) throw totalError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-quotes'] });
      toast({
        title: "Quote Updated",
        description: "Quote has been successfully updated.",
      });
      setIsDialogOpen(false);
      setSelectedQuote(null);
      setPricingData({});
      setAdminNotes('');
    },
    onError: (error) => {
      console.error('Error updating quote:', error);
      toast({
        title: "Error",
        description: "Failed to update quote. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleViewQuote = (quote: Quote) => {
    setSelectedQuote(quote);
    setAdminNotes(quote.admin_notes || '');
    const prices: Record<string, number> = {};
    quote.items.forEach(item => {
      prices[item.id] = item.unit_price || 0;
    });
    setPricingData(prices);
    setIsDialogOpen(true);
  };

  const handleApproveQuote = () => {
    if (!selectedQuote) return;

    const items = selectedQuote.items.map(item => ({
      id: item.id,
      unit_price: pricingData[item.id] || 0,
    }));

    updateQuoteMutation.mutate({
      quoteId: selectedQuote.id,
      status: 'approved',
      items,
      adminNotes,
    });
  };

  const handleRejectQuote = () => {
    if (!selectedQuote) return;

    updateQuoteMutation.mutate({
      quoteId: selectedQuote.id,
      status: 'rejected',
      adminNotes,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'default',
      reviewed: 'secondary',
      approved: 'outline',
      rejected: 'destructive',
      converted: 'outline',
    };

    return (
      <Badge variant={variants[status] || 'default'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Quote Requests</h1>
          <p className="text-muted-foreground mt-2">
            Manage wholesale quote requests from customers
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-1/3" />
                  <div className="h-4 bg-muted rounded w-1/2 mt-2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {quotes && quotes.length > 0 ? (
              quotes.map(quote => (
                <Card key={quote.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          {quote.quote_number}
                        </CardTitle>
                        <CardDescription className="mt-2">
                          {quote.customer_name} ({quote.customer_email})
                          {quote.company_name && ` • ${quote.company_name}`}
                        </CardDescription>
                      </div>
                      {getStatusBadge(quote.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          {quote.items.length} item{quote.items.length !== 1 ? 's' : ''}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Requested: {new Date(quote.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleViewQuote(quote)}
                        variant="outline"
                        size="sm"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Quote Requests</h3>
                    <p className="text-sm text-muted-foreground">
                      Quote requests will appear here when customers submit them
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Quote Details - {selectedQuote?.quote_number}</DialogTitle>
              <DialogDescription>
                Review and set pricing for this quote request
              </DialogDescription>
            </DialogHeader>

            {selectedQuote && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Customer</Label>
                    <p className="text-sm">{selectedQuote.customer_name}</p>
                    <p className="text-sm text-muted-foreground">{selectedQuote.customer_email}</p>
                    {selectedQuote.customer_phone && (
                      <p className="text-sm text-muted-foreground">{selectedQuote.customer_phone}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Company</Label>
                    <p className="text-sm">{selectedQuote.company_name || 'N/A'}</p>
                  </div>
                </div>

                {selectedQuote.notes && (
                  <div>
                    <Label className="text-sm font-medium">Customer Notes</Label>
                    <p className="text-sm text-muted-foreground">{selectedQuote.notes}</p>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium mb-2 block">Items</Label>
                  <div className="space-y-2">
                    {selectedQuote.items.map(item => (
                      <div key={item.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium">{item.product_name}</p>
                            {item.product_sku && (
                              <p className="text-sm text-muted-foreground">SKU: {item.product_sku}</p>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`price-${item.id}`} className="text-sm">
                            <DollarSign className="h-4 w-4 inline" /> Unit Price (R)
                          </Label>
                          <Input
                            id={`price-${item.id}`}
                            type="number"
                            step="0.01"
                            min="0"
                            value={pricingData[item.id] || ''}
                            onChange={(e) => setPricingData({
                              ...pricingData,
                              [item.id]: parseFloat(e.target.value) || 0,
                            })}
                            placeholder="0.00"
                            className="w-32"
                            disabled={selectedQuote.status !== 'pending'}
                          />
                          <span className="text-sm text-muted-foreground">
                            Total: R{((pricingData[item.id] || 0) * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="admin-notes">Admin Notes</Label>
                  <Textarea
                    id="admin-notes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add internal notes about this quote..."
                    rows={3}
                    disabled={selectedQuote.status !== 'pending'}
                  />
                </div>

                {selectedQuote.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleApproveQuote}
                      disabled={updateQuoteMutation.isPending}
                      className="flex-1"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Approve & Send Quote
                    </Button>
                    <Button
                      onClick={handleRejectQuote}
                      disabled={updateQuoteMutation.isPending}
                      variant="destructive"
                      className="flex-1"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject Quote
                    </Button>
                  </div>
                )}

                {selectedQuote.status !== 'pending' && (
                  <div className="text-center text-sm text-muted-foreground">
                    This quote has been {selectedQuote.status}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminQuotes;
