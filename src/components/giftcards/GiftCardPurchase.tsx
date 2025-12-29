import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Gift, Loader2 } from 'lucide-react';

const GIFT_CARD_AMOUNTS = [100, 250, 500, 1000, 2500];

export const GiftCardPurchase = () => {
  const { user } = useAuth();
  const [selectedAmount, setSelectedAmount] = useState<number>(250);
  const [customAmount, setCustomAmount] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [message, setMessage] = useState('');

  const amount = customAmount ? parseFloat(customAmount) : selectedAmount;

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      // Generate unique gift card code
      const code = `GC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      const { data, error } = await supabase
        .from('gift_cards')
        .insert({
          code,
          initial_balance: amount,
          current_balance: amount,
          purchaser_id: user?.id || null,
          purchaser_email: user?.email || null,
          recipient_email: recipientEmail || null,
          recipient_name: recipientName || null,
          message: message || null,
          status: 'active',
          purchased_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success('Gift card created successfully!', {
        description: `Code: ${data.code}`,
      });
      // Reset form
      setRecipientEmail('');
      setRecipientName('');
      setMessage('');
      setCustomAmount('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create gift card');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount < 50 || amount > 10000) {
      toast.error('Amount must be between R50 and R10,000');
      return;
    }
    purchaseMutation.mutate();
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Gift className="h-6 w-6 text-primary" />
          <CardTitle>Purchase a Gift Card</CardTitle>
        </div>
        <CardDescription>
          Give the gift of choice! Our gift cards never expire.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amount Selection */}
          <div className="space-y-3">
            <Label>Select Amount</Label>
            <RadioGroup
              value={customAmount ? 'custom' : selectedAmount.toString()}
              onValueChange={(val) => {
                if (val === 'custom') {
                  setCustomAmount('');
                } else {
                  setSelectedAmount(parseInt(val));
                  setCustomAmount('');
                }
              }}
              className="grid grid-cols-3 md:grid-cols-6 gap-3"
            >
              {GIFT_CARD_AMOUNTS.map((amt) => (
                <div key={amt}>
                  <RadioGroupItem
                    value={amt.toString()}
                    id={`amount-${amt}`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`amount-${amt}`}
                    className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    R{amt}
                  </Label>
                </div>
              ))}
              <div>
                <RadioGroupItem
                  value="custom"
                  id="amount-custom"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="amount-custom"
                  className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  Custom
                </Label>
              </div>
            </RadioGroup>
            
            {!GIFT_CARD_AMOUNTS.includes(selectedAmount) || customAmount !== '' ? (
              <div className="mt-3">
                <Input
                  type="number"
                  min="50"
                  max="10000"
                  placeholder="Enter custom amount (R50 - R10,000)"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                />
              </div>
            ) : null}
          </div>

          {/* Recipient Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="recipientName">Recipient Name</Label>
              <Input
                id="recipientName"
                placeholder="Their name"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipientEmail">Recipient Email</Label>
              <Input
                id="recipientEmail"
                type="email"
                placeholder="their@email.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Personal Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Personal Message (optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a personal message to your gift..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          {/* Summary */}
          <div className="rounded-lg bg-muted p-4">
            <div className="flex justify-between items-center">
              <span className="font-medium">Gift Card Value</span>
              <span className="text-2xl font-bold">R{amount.toFixed(2)}</span>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            size="lg"
            disabled={purchaseMutation.isPending || amount < 50}
          >
            {purchaseMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating Gift Card...
              </>
            ) : (
              <>
                <Gift className="h-4 w-4 mr-2" />
                Purchase Gift Card
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default GiftCardPurchase;