
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    slug: string;
    image_url?: string;
    short_description?: string;
    sku?: string;
  };
}

export const useCart = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [sessionId] = useState(() => {
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
          products!inner (
            id,
            name,
            price,
            slug,
            short_description,
            sku
          )
        `);

      if (user) {
        query.eq('user_id', user.id);
      } else {
        query.eq('session_id', sessionId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.map(item => ({
        ...item,
        product: item.products
      })) as CartItem[];
    },
  });

  const addToCart = useMutation({
    mutationFn: async ({ productId, quantity = 1 }: { productId: string; quantity?: number }) => {
      const { data, error } = await supabase
        .from('cart_items')
        .upsert({
          product_id: productId,
          quantity,
          user_id: user?.id || null,
          session_id: user ? null : sessionId,
        }, {
          onConflict: user ? 'user_id,product_id' : 'session_id,product_id'
        });

      if (error) throw error;
      return data;
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
      if (quantity <= 0) {
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('id', itemId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity })
          .eq('id', itemId);
        if (error) throw error;
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
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);
      if (error) throw error;
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
      const query = supabase.from('cart_items').delete();
      
      if (user) {
        query.eq('user_id', user.id);
      } else {
        query.eq('session_id', sessionId);
      }

      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const total = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  return {
    items,
    isLoading,
    addToCart: addToCart.mutate,
    updateQuantity: updateQuantity.mutate,
    removeItem: removeItem.mutate,
    clearCart: clearCart.mutate,
    total,
  };
};
