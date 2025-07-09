import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ProductImage {
  id: string;
  image_url: string;
  alt_text?: string;
  display_order?: number;
}

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
    product_images?: ProductImage[];
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
            image_url,
            short_description,
            sku,
            product_images (
              id,
              image_url,
              alt_text,
              display_order
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

      return data.map(item => ({
        ...item,
        product: item.products
      })) as CartItem[];
    },
  });

  const addToCart = useMutation({
    mutationFn: async ({ productId, quantity = 1 }: { productId: string; quantity?: number }) => {
      console.log('Adding to cart:', { productId, quantity, userId: user?.id, sessionId });

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
        // Update existing item
        const existingItem = existingItems[0];
        const newQuantity = existingItem.quantity + quantity;
        
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: newQuantity })
          .eq('id', existingItem.id);

        if (error) throw error;
        console.log('Updated existing cart item:', existingItem.id, 'new quantity:', newQuantity);
      } else {
        // Insert new item
        const insertData: any = {
          product_id: productId,
          quantity,
        };

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
        console.log('Inserted new cart item');
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
    },
    onError: (error) => {
      console.error("Error clearing cart:", error);
      toast.error("Failed to clear cart");
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