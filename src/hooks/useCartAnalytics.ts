import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CartAnalyticsEvent {
  sessionId: string;
  userId?: string;
  email?: string;
  eventType: 'cart_created' | 'item_added' | 'item_removed' | 'checkout_initiated' | 'payment_attempted' | 'cart_abandoned' | 'cart_converted';
  productId?: string;
  productName?: string;
  productPrice?: number;
  productCategory?: string;
  productSku?: string;
  quantity?: number;
  cartValue: number;
  abandonmentReason?: string;
  pageUrl?: string;
  deviceInfo?: {
    userAgent: string;
    screenResolution: string;
    language: string;
    timestamp: number;
  };
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

interface CartSessionData {
  sessionId: string;
  userId?: string;
  email?: string;
  phone?: string;
  totalValue: number;
  itemCount: number;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  deviceInfo?: object;
}

/**
 * Enhanced cart analytics hook with comprehensive tracking
 */
export const useCartAnalytics = () => {
  const { user } = useAuth();

  // Create or update cart session
  const createOrUpdateCartSession = useMutation({
    mutationFn: async (sessionData: CartSessionData) => {
      const { error } = await supabase
        .from('cart_sessions')
        .upsert({
          session_id: sessionData.sessionId,
          user_id: sessionData.userId || null,
          email: sessionData.email || null,
          phone: sessionData.phone || null,
          total_value: sessionData.totalValue,
          item_count: sessionData.itemCount,
          utm_source: sessionData.utmSource || null,
          utm_medium: sessionData.utmMedium || null,
          utm_campaign: sessionData.utmCampaign || null,
          device_info: (sessionData.deviceInfo || {}) as any,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'session_id'
        });

      if (error) throw error;
    }
  });

  // Track detailed cart events
  const trackEnhancedCartEvent = useMutation({
    mutationFn: async (event: CartAnalyticsEvent) => {
      // First, create/update the cart session
      await createOrUpdateCartSession.mutateAsync({
        sessionId: event.sessionId,
        userId: event.userId,
        email: event.email,
        totalValue: event.cartValue,
        itemCount: 1, // This will be updated by triggers
        utmSource: event.utmSource,
        utmMedium: event.utmMedium,
        utmCampaign: event.utmCampaign,
        deviceInfo: event.deviceInfo
      });

      // Get the actual UUID id from cart_sessions (not the text session_id)
      const { data: cartSession, error: sessionError } = await supabase
        .from('cart_sessions')
        .select('id')
        .eq('session_id', event.sessionId)
        .single();

      if (sessionError || !cartSession) {
        console.error('Failed to get cart session UUID:', sessionError);
        return;
      }

      // Then track the specific cart event using the UUID cart session id
      const { error } = await supabase
        .from('enhanced_cart_tracking')
        .insert({
          cart_session_id: cartSession.id, // Use UUID id, not text session_id
          product_id: event.productId || null,
          product_name: event.productName || 'Unknown Product',
          product_price: event.productPrice || 0,
          product_category: event.productCategory || null,
          product_sku: event.productSku || null,
          quantity: event.quantity || 1,
          abandonment_reason: event.abandonmentReason || null,
          checkout_reached: event.eventType === 'checkout_initiated',
          payment_attempted: event.eventType === 'payment_attempted',
          purchased: event.eventType === 'cart_converted',
          removed_at: event.eventType === 'item_removed' ? new Date().toISOString() : null
        });

      if (error) {
        console.error('Failed to track cart event:', error);
        throw error;
      }

      // Also track in general analytics
      await supabase.from('analytics_events').insert({
        user_id: event.userId,
        session_id: event.sessionId,
        event_type: 'cart',
        event_name: event.eventType,
        page_path: event.pageUrl,
        product_id: event.productId,
        metadata: {
          product_name: event.productName,
          product_price: event.productPrice,
          quantity: event.quantity,
          cart_value: event.cartValue,
          abandonment_reason: event.abandonmentReason,
          device_info: event.deviceInfo,
          utm_source: event.utmSource,
          utm_medium: event.utmMedium,
          utm_campaign: event.utmCampaign
        }
      });
    }
  });

  // Get cart session analytics
  const { data: cartSessionAnalytics } = useQuery({
    queryKey: ['cart-session-analytics', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('cart_sessions')
        .select(`
          *,
          enhanced_cart_tracking (
            product_name,
            product_price,
            quantity,
            added_at,
            removed_at,
            purchased
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Get abandonment insights
  const { data: abandonmentInsights } = useQuery({
    queryKey: ['abandonment-insights'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cart_sessions')
        .select(`
          id,
          total_value,
          item_count,
          abandoned_at,
          abandonment_stage,
          utm_source,
          utm_medium,
          enhanced_cart_tracking (
            product_name,
            product_category,
            product_price,
            abandonment_reason
          )
        `)
        .not('abandoned_at', 'is', null)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .order('abandoned_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    }
  });

  // Mark cart as abandoned
  const markCartAbandoned = useMutation({
    mutationFn: async ({ 
      sessionId, 
      stage, 
      reason 
    }: { 
      sessionId: string; 
      stage: string; 
      reason?: string; 
    }) => {
      // First get the UUID from cart_sessions
      const { data: cartSession } = await supabase
        .from('cart_sessions')
        .select('id')
        .eq('session_id', sessionId)
        .single();

      const { error } = await supabase
        .from('cart_sessions')
        .update({
          abandoned_at: new Date().toISOString(),
          abandonment_stage: stage
        })
        .eq('session_id', sessionId);

      if (error) throw error;

      // Update tracking records with abandonment reason using UUID
      if (reason && cartSession) {
        await supabase
          .from('enhanced_cart_tracking')
          .update({ abandonment_reason: reason })
          .eq('cart_session_id', cartSession.id) // Use UUID, not text session_id
          .is('removed_at', null);
      }
    }
  });

  // Mark cart as converted
  const markCartConverted = useMutation({
    mutationFn: async ({ sessionId, orderId }: { sessionId: string; orderId?: string }) => {
      // First get the UUID from cart_sessions
      const { data: cartSession } = await supabase
        .from('cart_sessions')
        .select('id')
        .eq('session_id', sessionId)
        .single();

      const { error } = await supabase
        .from('cart_sessions')
        .update({
          converted_at: new Date().toISOString(),
          is_recovered: false // Reset recovery flag on conversion
        })
        .eq('session_id', sessionId);

      if (error) throw error;

      // Mark all items as purchased using UUID
      if (cartSession) {
        await supabase
          .from('enhanced_cart_tracking')
          .update({ purchased: true })
          .eq('cart_session_id', cartSession.id) // Use UUID, not text session_id
          .is('removed_at', null);
      }
    }
  });

  return {
    trackEnhancedCartEvent: trackEnhancedCartEvent.mutate,
    createOrUpdateCartSession: createOrUpdateCartSession.mutate,
    markCartAbandoned: markCartAbandoned.mutate,
    markCartConverted: markCartConverted.mutate,
    
    // Analytics data
    cartSessionAnalytics,
    abandonmentInsights,
    
    // Loading states
    isTracking: trackEnhancedCartEvent.isPending,
    isUpdatingSession: createOrUpdateCartSession.isPending,
  };
};