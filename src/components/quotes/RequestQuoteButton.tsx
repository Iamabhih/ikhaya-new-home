import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRoles } from '@/hooks/useRoles';
import { useQuotes } from '@/hooks/useQuotes';
import { useCart } from '@/hooks/useCart';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';

export const RequestQuoteButton = () => {
  const { user } = useAuth();
  const { loading: rolesLoading } = useRoles(user);
  const { items, clearCart } = useCart();
  const { createQuote, isCreating } = useQuotes();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: user?.email || '',
    customer_phone: '',
    company_name: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Please add items to your cart before requesting a quote.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.customer_name || !formData.customer_email) {
      toast({
        title: "Required fields missing",
        description: "Please fill in your name and email address.",
        variant: "destructive",
      });
      return;
    }

    createQuote({
      ...formData,
      items: items.map(item => ({
        product_id: item.product_id,
        product_name: item.product?.name || 'Product',
        product_sku: item.product?.sku || '',
        quantity: item.quantity,
        unit_price: 0, // Will be set by admin
      })),
    });

    clearCart();
    setIsOpen(false);
    setFormData({
      customer_name: '',
      customer_email: user?.email || '',
      customer_phone: '',
      company_name: '',
      notes: '',
    });
  };

  if (rolesLoading || items.length === 0) return null;

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="w-full"
        size="lg"
        variant="default"
      >
        <FileText className="mr-2 h-4 w-4" />
        Request Quote for {items.length} Item{items.length !== 1 ? 's' : ''}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Request a Quote</DialogTitle>
            <DialogDescription>
              Fill in your details and we'll get back to you with pricing and availability.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customer_name">Full Name *</Label>
              <Input
                id="customer_name"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer_email">Email Address *</Label>
              <Input
                id="customer_email"
                type="email"
                value={formData.customer_email}
                onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                placeholder="john@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer_phone">Phone Number</Label>
              <Input
                id="customer_phone"
                type="tel"
                value={formData.customer_phone}
                onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                placeholder="+27 XX XXX XXXX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="Your Company"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any special requirements or questions..."
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating}
                className="flex-1"
              >
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Quote Request
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
