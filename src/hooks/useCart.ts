import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  variant_id?: string;
  product?: {
    id: string;
    name: string;
    price: number;
    sale_price?: number;
    image_url?: string;
    sku?: string;
  };
}

interface AddToCartParams {
  productId: string;
  quantity?: number;
  variantId?: string;
}

/**
 * Core cart hook - manages cart state and operations
 */
export const useCart = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Get session ID for guest carts
  const sessionId = useMemo(() => {
    if (typeof window === 'undefined') return '';
    let id = localStorage.getItem('cart_session_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('cart_session_id', id);
    }
    return id;
  }, []);

  // Fetch cart items
  const fetchCart = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('cart_items')
        .select(`
          id,
          product_id,
          quantity,
          variant_id,
          products:product_id (
            id,
            name,
            price,
            sale_price,
            image_url,
            sku
          )
        `);

      if (user?.id) {
        query = query.eq('user_id', user.id);
      } else {
        query = query.eq('session_id', sessionId);
      }

      const { data, error } = await query;
      if (error) throw error;

      setItems(
        (data || []).map((item: any) => ({
          id: item.id,
          product_id: item.product_id,
          quantity: item.quantity,
          variant_id: item.variant_id,
          product: item.products
        }))
      );
    } catch (error) {
      console.error('Failed to fetch cart:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, sessionId]);

  // Fetch cart on mount and auth change
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Add item to cart
  const addToCart = useCallback(async ({ productId, quantity = 1, variantId }: AddToCartParams) => {
    try {
      const existingItem = items.find(
        item => item.product_id === productId && item.variant_id === variantId
      );

      if (existingItem) {
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + quantity })
          .eq('id', existingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cart_items')
          .insert({
            product_id: productId,
            quantity,
            variant_id: variantId || null,
            user_id: user?.id || null,
            session_id: user?.id ? null : sessionId
          });
        if (error) throw error;
      }

      await fetchCart();
    } catch (error) {
      console.error('Failed to add to cart:', error);
      throw error;
    }
  }, [items, user?.id, sessionId, fetchCart]);

  // Remove item from cart
  const removeItem = useCallback(async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);
      if (error) throw error;
      await fetchCart();
    } catch (error) {
      console.error('Failed to remove from cart:', error);
      throw error;
    }
  }, [fetchCart]);

  // Update item quantity
  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    try {
      if (quantity <= 0) {
        return removeItem(itemId);
      }
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', itemId);
      if (error) throw error;
      await fetchCart();
    } catch (error) {
      console.error('Failed to update quantity:', error);
      throw error;
    }
  }, [fetchCart, removeItem]);

  // Clear cart
  const clearCart = useCallback(async () => {
    try {
      let query = supabase.from('cart_items').delete();
      if (user?.id) {
        query = query.eq('user_id', user.id);
      } else {
        query = query.eq('session_id', sessionId);
      }
      const { error } = await query;
      if (error) throw error;
      setItems([]);
    } catch (error) {
      console.error('Failed to clear cart:', error);
      throw error;
    }
  }, [user?.id, sessionId]);

  // Calculate totals
  const total = useMemo(() => {
    return items.reduce((sum, item) => {
      const price = item.product?.sale_price || item.product?.price || 0;
      return sum + price * item.quantity;
    }, 0);
  }, [items]);

  const itemCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  return {
    items,
    total,
    itemCount,
    isLoading,
    addToCart,
    removeItem,
    updateQuantity,
    clearCart,
    refreshCart: fetchCart,
    sessionId
  };
};
