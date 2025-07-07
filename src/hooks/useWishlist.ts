
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface WishlistItem {
  id: string;
  product_id: string;
  user_id: string;
  created_at: string;
}

export const useWishlist = () => {
  const { user, loading: authLoading } = useAuth();
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Load wishlist data when auth state changes
  useEffect(() => {
    if (authLoading) return;
    
    if (user) {
      loadDatabaseWishlist();
    } else {
      loadLocalWishlist();
    }
  }, [user, authLoading]);

  // Load wishlist from database for authenticated users
  const loadDatabaseWishlist = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('wishlists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setWishlistItems(data || []);
      
      // Migrate any local storage items to database
      await migrateLocalWishlistToDatabase();
    } catch (error) {
      console.error('Failed to load wishlist:', error);
      toast.error('Failed to load your wishlist');
    } finally {
      setLoading(false);
    }
  };

  // Load wishlist from localStorage for guest users
  const loadLocalWishlist = () => {
    try {
      const savedWishlist = localStorage.getItem('wishlist');
      if (savedWishlist) {
        const parsed = JSON.parse(savedWishlist);
        setWishlistItems(parsed);
      } else {
        setWishlistItems([]);
      }
    } catch (error) {
      console.error('Failed to parse wishlist from localStorage:', error);
      setWishlistItems([]);
    }
  };

  // Migrate localStorage wishlist to database when user signs in
  const migrateLocalWishlistToDatabase = async () => {
    if (!user) return;

    try {
      const savedWishlist = localStorage.getItem('wishlist');
      if (!savedWishlist) return;

      const localItems = JSON.parse(savedWishlist) as WishlistItem[];
      if (localItems.length === 0) return;

      // Get existing database items to avoid duplicates
      const { data: existingItems } = await supabase
        .from('wishlists')
        .select('product_id')
        .eq('user_id', user.id);

      const existingProductIds = new Set(existingItems?.map(item => item.product_id) || []);

      // Filter out items that already exist in database
      const itemsToMigrate = localItems.filter(item => !existingProductIds.has(item.product_id));

      if (itemsToMigrate.length > 0) {
        // Prepare items for database insertion
        const dbItems = itemsToMigrate.map(item => ({
          product_id: item.product_id,
          user_id: user.id
        }));

        const { error } = await supabase
          .from('wishlists')
          .insert(dbItems);

        if (error) throw error;

        // Clear localStorage after successful migration
        localStorage.removeItem('wishlist');
        
        if (itemsToMigrate.length > 0) {
          toast.success(`Migrated ${itemsToMigrate.length} item${itemsToMigrate.length !== 1 ? 's' : ''} to your account`);
        }
      } else {
        // Clear localStorage if no new items to migrate
        localStorage.removeItem('wishlist');
      }
    } catch (error) {
      console.error('Failed to migrate wishlist:', error);
      toast.error('Failed to sync your wishlist');
    }
  };

  // Save to localStorage for guest users
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

      if (user) {
        // Authenticated user: add to database
        const { data, error } = await supabase
          .from('wishlists')
          .insert({
            product_id: productId,
            user_id: user.id
          })
          .select()
          .single();

        if (error) throw error;

        setWishlistItems(prev => [data, ...prev]);
        toast.success('Added to wishlist');
      } else {
        // Guest user: add to localStorage
        const newItem: WishlistItem = {
          id: `guest-${Date.now()}`,
          product_id: productId,
          user_id: 'guest',
          created_at: new Date().toISOString()
        };

        const updatedItems = [newItem, ...wishlistItems];
        setWishlistItems(updatedItems);
        saveToLocalStorage(updatedItems);
        
        toast.success('Added to wishlist', {
          description: 'Sign in to save your wishlist permanently'
        });
      }
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
      if (user) {
        // Authenticated user: remove from database
        const { error } = await supabase
          .from('wishlists')
          .delete()
          .eq('product_id', productId)
          .eq('user_id', user.id);

        if (error) throw error;

        setWishlistItems(prev => prev.filter(item => item.product_id !== productId));
        toast.success('Removed from wishlist');
      } else {
        // Guest user: remove from localStorage
        const updatedItems = wishlistItems.filter(item => item.product_id !== productId);
        setWishlistItems(updatedItems);
        saveToLocalStorage(updatedItems);
        toast.success('Removed from wishlist');
      }
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
