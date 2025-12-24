import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tag, X, Loader2, Check } from "lucide-react";

interface DiscountCodeInputProps {
  subtotal: number;
  onDiscountApplied: (discount: DiscountInfo | null) => void;
  appliedDiscount: DiscountInfo | null;
}

export interface DiscountInfo {
  id: string;
  code: string;
  type: 'percentage' | 'fixed_amount' | 'free_shipping';
  value: number;
  discountAmount: number;
}

export const DiscountCodeInput = ({ 
  subtotal, 
  onDiscountApplied, 
  appliedDiscount 
}: DiscountCodeInputProps) => {
  const [code, setCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  const validateCode = async () => {
    if (!code.trim()) {
      toast.error("Please enter a discount code");
      return;
    }

    setIsValidating(true);

    try {
      const { data, error } = await supabase
        .from('discount_codes')
        .select('*')
        .eq('code', code.trim().toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !data) {
        toast.error("Invalid discount code");
        return;
      }

      // Check date validity
      const now = new Date();
      if (data.starts_at && new Date(data.starts_at) > now) {
        toast.error("This code is not yet active");
        return;
      }
      if (data.expires_at && new Date(data.expires_at) < now) {
        toast.error("This code has expired");
        return;
      }

      // Check usage limits
      if (data.max_uses && data.current_uses >= data.max_uses) {
        toast.error("This code has reached its usage limit");
        return;
      }

      // Check minimum order amount
      if (data.min_order_amount && subtotal < data.min_order_amount) {
        toast.error(`Minimum order of R${data.min_order_amount.toFixed(2)} required`);
        return;
      }

      // Calculate discount amount
      let discountAmount = 0;
      if (data.discount_type === 'percentage') {
        discountAmount = (subtotal * data.discount_value) / 100;
      } else if (data.discount_type === 'fixed_amount') {
        discountAmount = Math.min(data.discount_value, subtotal);
      }

      const discountInfo: DiscountInfo = {
        id: data.id,
        code: data.code,
        type: data.discount_type as DiscountInfo['type'],
        value: data.discount_value,
        discountAmount
      };

      onDiscountApplied(discountInfo);
      toast.success("Discount code applied!");
      setCode("");

    } catch (error) {
      console.error('Error validating discount code:', error);
      toast.error("Failed to validate discount code");
    } finally {
      setIsValidating(false);
    }
  };

  const removeDiscount = () => {
    onDiscountApplied(null);
    toast.info("Discount removed");
  };

  if (appliedDiscount) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium">Discount Code</label>
        <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-primary" />
            <Badge variant="secondary" className="font-mono">
              {appliedDiscount.code}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {appliedDiscount.type === 'percentage' 
                ? `${appliedDiscount.value}% off`
                : appliedDiscount.type === 'free_shipping'
                  ? 'Free shipping'
                  : `R${appliedDiscount.value.toFixed(2)} off`}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={removeDiscount}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-primary font-medium">
          You save: R{appliedDiscount.discountAmount.toFixed(2)}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Discount Code</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Enter code"
            className="pl-10 h-11 font-mono"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                validateCode();
              }
            }}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={validateCode}
          disabled={isValidating || !code.trim()}
          className="h-11 px-6"
        >
          {isValidating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Apply"
          )}
        </Button>
      </div>
    </div>
  );
};
