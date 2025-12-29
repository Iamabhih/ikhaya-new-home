import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Gift, Loader2, Check, X } from 'lucide-react';

interface GiftCardInputProps {
  onApply: (giftCard: { code: string; balance: number; id: string }) => void;
  onRemove: () => void;
  appliedGiftCard?: { code: string; balance: number; id: string } | null;
  orderTotal: number;
}

export const GiftCardInput = ({ 
  onApply, 
  onRemove, 
  appliedGiftCard, 
  orderTotal 
}: GiftCardInputProps) => {
  const [code, setCode] = useState('');

  const validateMutation = useMutation({
    mutationFn: async (giftCardCode: string) => {
      const { data, error } = await supabase
        .from('gift_cards')
        .select('id, code, current_balance, status, expires_at')
        .eq('code', giftCardCode.toUpperCase().trim())
        .single();

      if (error || !data) {
        throw new Error('Gift card not found');
      }

      if (data.status !== 'active') {
        throw new Error('This gift card is no longer active');
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        throw new Error('This gift card has expired');
      }

      if (data.current_balance <= 0) {
        throw new Error('This gift card has no remaining balance');
      }

      return {
        id: data.id,
        code: data.code,
        balance: data.current_balance,
      };
    },
    onSuccess: (data) => {
      onApply(data);
      setCode('');
      toast.success(`Gift card applied! Balance: R${data.balance.toFixed(2)}`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Invalid gift card');
    },
  });

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error('Please enter a gift card code');
      return;
    }
    validateMutation.mutate(code);
  };

  const appliedAmount = appliedGiftCard 
    ? Math.min(appliedGiftCard.balance, orderTotal)
    : 0;

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="h-4 w-4 text-primary" />
          <Label className="font-medium">Gift Card</Label>
        </div>

        {appliedGiftCard ? (
          <div className="space-y-2">
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="ml-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-mono font-medium">{appliedGiftCard.code}</span>
                    <div className="text-sm text-muted-foreground">
                      Balance: R{appliedGiftCard.balance.toFixed(2)}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onRemove}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
            <div className="flex justify-between text-sm">
              <span>Amount to be deducted:</span>
              <span className="font-medium text-green-600">-R{appliedAmount.toFixed(2)}</span>
            </div>
            {appliedGiftCard.balance > orderTotal && (
              <p className="text-xs text-muted-foreground">
                Remaining balance after purchase: R{(appliedGiftCard.balance - orderTotal).toFixed(2)}
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={handleApply} className="flex gap-2">
            <Input
              placeholder="Enter gift card code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="font-mono"
            />
            <Button 
              type="submit" 
              variant="secondary"
              disabled={validateMutation.isPending}
            >
              {validateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Apply'
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export default GiftCardInput;