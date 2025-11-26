import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Hook to handle cart migration when users log in
 * Migrates session-based cart items to user account
 */
export const useCartMigration = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const migrateCart = useMutation({
    mutationFn: async () => {
      if (!user) return undefined;

      const sessionId = localStorage.getItem('cart_session_id');
      if (!sessionId) return undefined;

      console.log('Starting cart migration for user:', user.id);

      // Get session cart items
      const { data: sessionItems, error: fetchError } = await supabase
        .from('cart_items')
        .select('*')
        .eq('session_id', sessionId)
        .is('user_id', null);

      if (fetchError) throw fetchError;

      if (!sessionItems || sessionItems.length === 0) {
        console.log('No session cart items to migrate');
        return undefined;
      }

      console.log(`Found ${sessionItems.length} session cart items to migrate`);

      // Get existing user cart items to check for duplicates
      const { data: existingUserItems, error: userFetchError } = await supabase
        .from('cart_items')
        .select('product_id, quantity, id')
        .eq('user_id', user.id)
        .is('session_id', null);

      if (userFetchError) throw userFetchError;

      const existingProductMap = new Map(
        existingUserItems?.map(item => [item.product_id, item]) || []
      );

      let migratedCount = 0;
      let mergedCount = 0;

      for (const sessionItem of sessionItems) {
        const existingItem = existingProductMap.get(sessionItem.product_id);

        if (existingItem) {
          // Merge quantities for existing products
          const newQuantity = existingItem.quantity + sessionItem.quantity;
          
          const { error: updateError } = await supabase
            .from('cart_items')
            .update({ quantity: newQuantity })
            .eq('id', existingItem.id);

          if (updateError) throw updateError;
          mergedCount++;
          console.log(`Merged cart item: ${sessionItem.product_id}, new quantity: ${newQuantity}`);
        } else {
          // Migrate session item to user cart
          const { error: insertError } = await supabase
            .from('cart_items')
            .insert({
              user_id: user.id,
              product_id: sessionItem.product_id,
              quantity: sessionItem.quantity,
              variant_id: sessionItem.variant_id,
              session_id: null
            });

          if (insertError) throw insertError;
          migratedCount++;
          console.log(`Migrated cart item: ${sessionItem.product_id}`);
        }
      }

      // Delete session cart items
      const { error: deleteError } = await supabase
        .from('cart_items')
        .delete()
        .eq('session_id', sessionId);

      if (deleteError) throw deleteError;

      // Track cart migration analytics
      await supabase.from('analytics_events').insert({
        user_id: user.id,
        event_type: 'cart',
        event_name: 'cart_migrated',
        session_id: sessionId,
        metadata: {
          migrated_items: migratedCount,
          merged_items: mergedCount,
          total_session_items: sessionItems.length
        }
      });

      console.log(`Cart migration completed: ${migratedCount} migrated, ${mergedCount} merged`);
      
      // Clear session ID after successful migration
      localStorage.removeItem('cart_session_id');

      return { migratedCount, mergedCount };
    },
    onSuccess: (result) => {
      if (result && (result.migratedCount > 0 || result.mergedCount > 0)) {
        queryClient.invalidateQueries({ queryKey: ['cart'] });
        
        const totalItems = result.migratedCount + result.mergedCount;
        toast.success(
          `Cart synchronized! ${totalItems} item${totalItems > 1 ? 's' : ''} ${
            result.mergedCount > 0 ? 'merged with existing items' : 'added to your cart'
          }`
        );
      }
    },
    onError: (error) => {
      console.error('Cart migration error:', error);
      toast.error('Failed to sync your cart. Please refresh the page.');
    }
  });

  // Auto-migrate cart when user logs in
  useEffect(() => {
    if (user && !migrateCart.isPending) {
      const sessionId = localStorage.getItem('cart_session_id');
      if (sessionId) {
        // Small delay to ensure cart queries are ready
        setTimeout(() => {
          migrateCart.mutate();
        }, 500);
      }
    }
    return undefined;
  }, [user, migrateCart]);

  return {
    migrateCart: migrateCart.mutate,
    isMigrating: migrateCart.isPending,
    migrationError: migrateCart.error,
  };
};