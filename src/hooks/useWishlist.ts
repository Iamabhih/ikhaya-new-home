
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WishlistItem {
  id: string;
  product_id: string;
  user_id: string;
  created_at: string;
}

export const useWishlist = () => {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(false);

  // For now, we'll store wishlist in localStorage since auth isn't implemented yet
  // This will be upgraded to use Supabase when auth is added
  useEffect(() => {
    const savedWishlist = localStorage.getItem('wishlist');
    if (savedWishlist) {
      try {
        const parsed = JSON.parse(savedWishlist);
        setWishlistItems(parsed);
      } catch (error) {
        console.error('Failed to parse wishlist from localStorage:', error);
      }
    }
  }, []);

  const saveToLocalStorage = (items: WishlistItem[]) => {
    localStorage.setItem('wishlist', JSON.stringify(items));
  };

  const addToWishlist = async (productId: string) => {
    setLoading(true);
    try {
      // Check if item already exists
      const existingItem = wishlistItems.find(item => item.product_id === productId);
      if (existingItem) {
        toast.info('Product is already in your wishlist');
        return;
      }

      // Create new wishlist item (temporary local storage version)
      const newItem: WishlistItem = {
        id: `temp-${Date.now()}`,
        product_id: productId,
        user_id: 'guest', // Will be replaced with real user ID when auth is implemented
        created_at: new Date().toISOString()
      };

      const updatedItems = [...wishlistItems, newItem];
      setWishlistItems(updatedItems);
      saveToLocalStorage(updatedItems);
      
      toast.success('Added to wishlist');
    } catch (error) {
      console.error('Failed to add to wishlist:', error);
      toast.error('Failed to add to wishlist');
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (productId: string) => {
    setLoading(true);
    try {
      const updatedItems = wishlistItems.filter(item => item.product_id !== productId);
      setWishlistItems(updatedItems);
      saveToLocalStorage(updatedItems);
      
      toast.success('Removed from wishlist');
    } catch (error) {
      console.error('Failed to remove from wishlist:', error);
      toast.error('Failed to remove from wishlist');
    } finally {
      setLoading(false);
    }
  };

  const isInWishlist = (productId: string) => {
    return wishlistItems.some(item => item.product_id === productId);
  };

  const toggleWishlist = async (productId: string) => {
    if (isInWishlist(productId)) {
      await removeFromWishlist(productId);
    } else {
      await addToWishlist(productId);
    }
  };

  return {
    wishlistItems,
    loading,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    toggleWishlist
  };
};
