import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAnalytics } from "@/hooks/useAnalytics";
import { toast } from "sonner";

export interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  override_price?: number | null;
  product: {
    id: string;
    name: string;
    price: number;
    slug: string;
    short_description?: string;
    sku?: string;
    product_images?: Array<{
      id: string;
      image_url: string;
      alt_text?: string;
      sort_order?: number;
    }>;
  };
}

export const useCart = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { trackCartAdd, trackEvent } = useAnalytics();
  const [sessionId] = useState(() => {
    if (typeof window === 'undefined') return '';
    
    let id = localStorage.getItem('cart_session_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('cart_session_id', id);
    }
    return id;
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['cart', user?.id, sessionId],
    queryFn: async () => {
      const query = supabase
        .from('cart_items')
        .select(`
          id,
          product_id,
          quantity,
          override_price,
          products!inner (
            id,
            name,
            price,
            slug,
            short_description,
            sku,
            product_images (
              id,
              image_url,
              alt_text,
              sort_order
            )
          )
        `);

      if (user) {
        query.eq('user_id', user.id).is('session_id', null);
      } else {
        query.eq('session_id', sessionId).is('user_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data?.map(item => ({
        ...item,
        product: item.products
      })) as CartItem[] || [];
    },
    enabled: typeof window !== 'undefined' && (!!user || !!sessionId),
  });

  const addToCart = useMutation({
    mutationFn: async ({ productId, quantity = 1, overridePrice }: { productId: string; quantity?: number; overridePrice?: number | null }) => {
      console.log('Adding to cart:', { productId, quantity, overridePrice, userId: user?.id, sessionId });

      if (quantity <= 0) {
        throw new Error('Quantity must be greater than 0');
      }

      // Check if item already exists in cart
      const existingQuery = supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('product_id', productId);

      if (user) {
        existingQuery.eq('user_id', user.id).is('session_id', null);
      } else {
        existingQuery.eq('session_id', sessionId).is('user_id', null);
      }

      const { data: existingItems, error: fetchError } = await existingQuery;
      if (fetchError) throw fetchError;

      if (existingItems && existingItems.length > 0) {
        const existingItem = existingItems[0];
        const newQuantity = existingItem.quantity + quantity;
        
        const updateData: any = { quantity: newQuantity };
        // Update override_price if provided (campaign price should persist)
        if (overridePrice !== undefined) {
          updateData.override_price = overridePrice;
        }
        
        const { error } = await supabase
          .from('cart_items')
          .update(updateData)
          .eq('id', existingItem.id);

        if (error) throw error;
        console.log('Updated existing cart item:', existingItem.id, 'new quantity:', newQuantity);
        
        trackCartAdd(productId, quantity);
      } else {
        const insertData: any = {
          product_id: productId,
          quantity,
        };

        if (overridePrice != null) {
          insertData.override_price = overridePrice;
        }

        if (user) {
          insertData.user_id = user.id;
          insertData.session_id = null;
        } else {
          insertData.session_id = sessionId;
          insertData.user_id = null;
        }

        const { error } = await supabase
          .from('cart_items')
          .insert(insertData);

        if (error) throw error;
        console.log('Inserted new cart item with override_price:', overridePrice);
        
        trackCartAdd(productId, quantity);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success("Added to cart");
    },
    onError: (error) => {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add to cart");
    },
  });

  const updateQuantity = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      console.log('Updating quantity:', { itemId, quantity });
      
      if (!itemId) {
        throw new Error('Item ID is required');
      }
      
      if (quantity <= 0) {
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('id', itemId);
        if (error) throw error;
        console.log('Deleted cart item:', itemId);
      } else {
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity })
          .eq('id', itemId);
        if (error) throw error;
        console.log('Updated cart item quantity:', itemId, quantity);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (error) => {
      console.error("Error updating cart:", error);
      toast.error("Failed to update cart");
    },
  });

  const removeItem = useMutation({
    mutationFn: async (itemId: string) => {
      console.log('Removing cart item:', itemId);
      
      if (!itemId) {
        throw new Error('Item ID is required');
      }
      
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);
      if (error) throw error;
      console.log('Successfully removed cart item:', itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success("Removed from cart");
    },
    onError: (error) => {
      console.error("Error removing from cart:", error);
      toast.error("Failed to remove from cart");
    },
  });

  const clearCart = useMutation({
    mutationFn: async () => {
      console.log('Clearing cart for user:', user?.id, 'session:', sessionId);
      const query = supabase.from('cart_items').delete();
      
      if (user) {
        query.eq('user_id', user.id).is('session_id', null);
      } else {
        query.eq('session_id', sessionId).is('user_id', null);
      }

      const { error } = await query;
      if (error) throw error;
      console.log('Successfully cleared cart');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success("Cart cleared");
      
      trackEvent({
        event_type: 'cart',
        event_name: 'cart_cleared',
        metadata: { user_id: user?.id, session_id: sessionId }
      });
    },
    onError: (error) => {
      console.error("Error clearing cart:", error);
      toast.error("Failed to clear cart");
    },
  });

  // Calculate total using override_price when available
  const total = items?.reduce((sum, item) => {
    if (!item?.product?.price || !item?.quantity) return sum;
    const effectivePrice = item.override_price ?? item.product.price;
    return sum + (effectivePrice * item.quantity);
  }, 0) || 0;

  const itemCount = items?.reduce((sum, item) => sum + (item?.quantity || 0), 0) || 0;

  return {
    items: items || [],
    cartItems: items || [],
    isLoading,
    addToCart: addToCart.mutate,
    updateQuantity: updateQuantity.mutate,
    removeItem: removeItem.mutate,
    clearCart: clearCart.mutate,
    total,
    itemCount,
    isAddingToCart: addToCart.isPending,
    isUpdating: updateQuantity.isPending,
    isRemoving: removeItem.isPending,
    isClearing: clearCart.isPending,
  };
};
