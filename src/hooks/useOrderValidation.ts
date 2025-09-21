import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OrderItem {
  product_id: string;
  quantity: number;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  total_amount?: number;
}

interface OrderValidationParams {
  customer_email: string;
  billing_address: {
    name: string;
    street: string;
    city: string;
    postal_code: string;
    country?: string;
  };
  shipping_address?: {
    name: string;
    street: string;
    city: string;
    postal_code: string;
    country?: string;
  };
  order_items?: OrderItem[];
  payment_method?: string;
}

export const useOrderValidation = () => {
  const { toast } = useToast();

  const validateOrder = useMutation({
    mutationFn: async (params: OrderValidationParams): Promise<ValidationResult> => {
      const { data, error } = await supabase.rpc('validate_order_creation', {
        p_customer_email: params.customer_email,
        p_billing_address: params.billing_address as any,
        p_shipping_address: params.shipping_address as any,
        p_order_items: params.order_items as any,
        p_payment_method: params.payment_method
      });

      if (error) {
        console.error('Order validation error:', error);
        throw new Error(`Validation failed: ${error.message}`);
      }

      return (data as unknown) as ValidationResult;
    },
    onError: (error) => {
      toast({
        title: "Validation Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    validateOrder: validateOrder.mutate,
    validateOrderAsync: validateOrder.mutateAsync,
    isValidating: validateOrder.isPending,
    validationError: validateOrder.error,
  };
};

// Order status validation hook
export const useOrderStatusValidation = () => {
  const { toast } = useToast();

  const validateStatusTransition = useMutation({
    mutationFn: async ({ 
      orderId, 
      currentStatus, 
      newStatus 
    }: { 
      orderId: string; 
      currentStatus: string; 
      newStatus: string; 
    }): Promise<boolean> => {
      const { data, error } = await supabase.rpc('validate_order_status_transition', {
        p_order_id: orderId,
        p_current_status: currentStatus as any,
        p_new_status: newStatus as any
      });

      if (error) {
        console.error('Status validation error:', error);
        throw new Error(`Status transition validation failed: ${error.message}`);
      }

      return (data as unknown) as boolean;
    },
    onError: (error) => {
      toast({
        title: "Invalid Status Transition",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    validateStatusTransition: validateStatusTransition.mutate,
    validateStatusTransitionAsync: validateStatusTransition.mutateAsync,
    isValidating: validateStatusTransition.isPending,
  };
};

// Stock validation for order items
export const useStockValidation = () => {
  const { toast } = useToast();

  const validateStock = useMutation({
    mutationFn: async (orderItems: OrderItem[]): Promise<{ valid: boolean; errors: string[] }> => {
      const errors: string[] = [];
      
      for (const item of orderItems) {
        const { data: product, error } = await supabase
          .from('products')
          .select('name, stock_quantity, is_active')
          .eq('id', item.product_id)
          .eq('is_active', true)
          .single();

        if (error || !product) {
          errors.push(`Product not found or inactive: ${item.product_id}`);
          continue;
        }

        if (product.stock_quantity < item.quantity) {
          errors.push(`Insufficient stock for ${product.name}. Available: ${product.stock_quantity}, Requested: ${item.quantity}`);
        }
      }

      return {
        valid: errors.length === 0,
        errors
      };
    },
    onError: (error) => {
      toast({
        title: "Stock Validation Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    validateStock: validateStock.mutate,
    validateStockAsync: validateStock.mutateAsync,
    isValidating: validateStock.isPending,
  };
};