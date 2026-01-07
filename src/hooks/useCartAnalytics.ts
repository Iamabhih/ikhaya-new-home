import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';

export interface CartAnalyticsEvent {
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
    timestamp?: number;
  };
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface CartSessionData {
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

interface CartSession {
  id: string;
  session_id: string;
  user_id?: string;
  email?: string;
  phone?: string;
  total_value: number;
  item_count: number;
  created_at: string;
  updated_at: string;
  abandoned_at?: string;
  converted_at?: string;
  checkout_initiated_at?: string;
  payment_attempted_at?: string;
  abandonment_stage?: string;
  device_info?: any;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

interface RecoveryCampaign {
  id: string;
  cart_session_id: string;
  campaign_type: string;
  sent_at: string;
  status: string;
  discount_code?: string;
  discount_percentage?: number;
}

/**
 * Enhanced cart analytics hook with comprehensive tracking
 */
export const useCartAnalytics = () => {
  const { user } = useAuth();

  // Fetch abandoned carts
  const { data: abandonedCarts, isLoading: isLoadingCarts, refetch: refetchCarts } = useQuery({
    queryKey: ['abandoned-carts'],
    queryFn: async () => {
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
        .not('abandoned_at', 'is', null)
        .is('converted_at', null)
        .order('abandoned_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as CartSession[];
    },
  });

  // Fetch recovery campaigns
  const { data: recoveryCampaigns, isLoading: isLoadingCampaigns, refetch: refetchCampaigns } = useQuery({
    queryKey: ['recovery-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cart_abandonment_campaigns')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as RecoveryCampaign[];
    },
  });

  // Fetch customer engagement metrics
  const { data: customerMetrics } = useQuery({
    queryKey: ['customer-engagement-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_engagement_metrics')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });

  // Fetch analytics snapshots
  const { data: snapshots } = useQuery({
    queryKey: ['cart-analytics-snapshots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cart_analytics_snapshots')
        .select('*')
        .order('snapshot_date', { ascending: false })
        .limit(30);

      if (error) throw error;
      return data;
    },
  });

  // Calculate metrics from abandoned carts
  const metrics = useMemo(() => {
    const carts = abandonedCarts || [];
    const totalAbandonedCarts = carts.length;
    const totalAbandonedValue = carts.reduce((sum, cart) => sum + (cart.total_value || 0), 0);
    const avgCartValue = totalAbandonedCarts > 0 ? totalAbandonedValue / totalAbandonedCarts : 0;
    const highValueCarts = carts.filter(cart => (cart.total_value || 0) >= 500).length;

    return {
      totalAbandonedCarts,
      totalAbandonedValue,
      avgCartValue,
      highValueCarts
    };
  }, [abandonedCarts]);

  // Calculate recovery opportunities by time window
  const recoveryOpportunities = useMemo(() => {
    const carts = abandonedCarts || [];
    const now = Date.now();

    const oneHourAgo = now - 60 * 60 * 1000;
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
    const seventyTwoHoursAgo = now - 72 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    return {
      oneHour: carts.filter(cart => {
        const abandonedAt = new Date(cart.abandoned_at!).getTime();
        return abandonedAt >= oneHourAgo && cart.email;
      }),
      twentyFourHour: carts.filter(cart => {
        const abandonedAt = new Date(cart.abandoned_at!).getTime();
        return abandonedAt < oneHourAgo && abandonedAt >= twentyFourHoursAgo && cart.email;
      }),
      seventyTwoHour: carts.filter(cart => {
        const abandonedAt = new Date(cart.abandoned_at!).getTime();
        return abandonedAt < twentyFourHoursAgo && abandonedAt >= seventyTwoHoursAgo && cart.email;
      }),
      oneWeek: carts.filter(cart => {
        const abandonedAt = new Date(cart.abandoned_at!).getTime();
        return abandonedAt < seventyTwoHoursAgo && abandonedAt >= oneWeekAgo && cart.email;
      })
    };
  }, [abandonedCarts]);

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
        itemCount: 1,
        utmSource: event.utmSource,
        utmMedium: event.utmMedium,
        utmCampaign: event.utmCampaign,
        deviceInfo: event.deviceInfo
      });

      // Get the actual UUID id from cart_sessions
      const { data: cartSession, error: sessionError } = await supabase
        .from('cart_sessions')
        .select('id')
        .eq('session_id', event.sessionId)
        .single();

      if (sessionError || !cartSession) {
        console.error('Failed to get cart session UUID:', sessionError);
        return;
      }

      // Track the specific cart event
      const { error } = await supabase
        .from('enhanced_cart_tracking')
        .insert({
          cart_session_id: cartSession.id,
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
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
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

      if (reason && cartSession) {
        await supabase
          .from('enhanced_cart_tracking')
          .update({ abandonment_reason: reason })
          .eq('cart_session_id', cartSession.id)
          .is('removed_at', null);
      }
    }
  });

  // Mark cart as converted
  const markCartConverted = useMutation({
    mutationFn: async ({ sessionId, orderId }: { sessionId: string; orderId?: string }) => {
      const { data: cartSession } = await supabase
        .from('cart_sessions')
        .select('id')
        .eq('session_id', sessionId)
        .single();

      const { error } = await supabase
        .from('cart_sessions')
        .update({
          converted_at: new Date().toISOString(),
          is_recovered: false
        })
        .eq('session_id', sessionId);

      if (error) throw error;

      if (cartSession) {
        await supabase
          .from('enhanced_cart_tracking')
          .update({ purchased: true })
          .eq('cart_session_id', cartSession.id)
          .is('removed_at', null);
      }
    }
  });

  // Trigger recovery campaign
  const triggerRecoveryCampaign = useMutation({
    mutationFn: async ({ 
      campaignType, 
      cartSessionIds,
      includeDiscount,
      discountPercentage
    }: { 
      campaignType: '1hr' | '24hr' | '72hr' | '1week' | 'manual';
      cartSessionIds?: string[];
      includeDiscount?: boolean;
      discountPercentage?: number;
    }) => {
      const { data, error } = await supabase.functions.invoke('trigger-recovery-campaigns', {
        body: {
          campaignType,
          cartSessionIds,
          includeDiscount,
          discountPercentage
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      refetchCarts();
      refetchCampaigns();
    }
  });

  // Refetch all analytics
  const refetchAnalytics = () => {
    refetchCarts();
    refetchCampaigns();
  };

  return {
    // Mutations
    trackEnhancedCartEvent: trackEnhancedCartEvent.mutate,
    createOrUpdateCartSession: createOrUpdateCartSession.mutate,
    markCartAbandoned: markCartAbandoned.mutate,
    markCartConverted: markCartConverted.mutate,
    triggerRecoveryCampaign,
    
    // Analytics data
    abandonedCarts,
    recoveryCampaigns,
    customerMetrics,
    snapshots,
    cartSessionAnalytics,
    abandonmentInsights,
    metrics,
    recoveryOpportunities,
    
    // Loading states
    isLoadingCarts,
    isLoadingCampaigns,
    isTracking: trackEnhancedCartEvent.isPending,
    isUpdatingSession: createOrUpdateCartSession.isPending,
    
    // Refetch
    refetchAnalytics
  };
};
