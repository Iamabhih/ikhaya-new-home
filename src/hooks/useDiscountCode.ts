import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DiscountInfo } from "@/components/checkout/DiscountCodeInput";

export const useDiscountCode = (subtotal: number) => {
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountInfo | null>(null);

  const applyDiscount = useCallback((discount: DiscountInfo | null) => {
    setAppliedDiscount(discount);
  }, []);

  const recordDiscountUsage = useCallback(async (orderId: string) => {
    if (!appliedDiscount) return;

    try {
      // Increment usage count directly
      const { data: currentCode } = await supabase
        .from('discount_codes')
        .select('current_uses')
        .eq('id', appliedDiscount.id)
        .single();

      if (currentCode) {
        await supabase
          .from('discount_codes')
          .update({ current_uses: (currentCode.current_uses || 0) + 1 })
          .eq('id', appliedDiscount.id);
      }
    } catch (error) {
      console.error('Error recording discount usage:', error);
    }
  }, [appliedDiscount]);

  const calculateTotal = useCallback((baseSubtotal: number, shippingFee: number) => {
    let discountAmount = 0;
    
    if (appliedDiscount) {
      if (appliedDiscount.type === 'percentage') {
        discountAmount = (baseSubtotal * appliedDiscount.value) / 100;
      } else if (appliedDiscount.type === 'fixed_amount') {
        discountAmount = Math.min(appliedDiscount.value, baseSubtotal);
      } else if (appliedDiscount.type === 'free_shipping') {
        discountAmount = shippingFee;
      }
    }

    return {
      subtotal: baseSubtotal,
      discount: discountAmount,
      shipping: appliedDiscount?.type === 'free_shipping' ? 0 : shippingFee,
      total: baseSubtotal - discountAmount + (appliedDiscount?.type === 'free_shipping' ? 0 : shippingFee)
    };
  }, [appliedDiscount]);

  return {
    appliedDiscount,
    applyDiscount,
    recordDiscountUsage,
    calculateTotal
  };
};
