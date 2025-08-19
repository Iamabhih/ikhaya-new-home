import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface CartAnalyticsData {
  abandonedCarts: any[];
  customerSegments: any[];
  topAbandonedProducts: any[];
  recoveryOpportunities: any[];
  snapshots: any[];
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
  abandonment_stage?: string;
  device_info: any;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

export const useCartAnalytics = () => {
  // Fetch cart analytics overview
  const { data: analyticsData, isLoading: isLoadingAnalytics, refetch: refetchAnalytics } = useQuery({
    queryKey: ['cart-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('analyze-cart-abandonment');
      if (error) throw error;
      return data as CartAnalyticsData;
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Fetch abandoned carts
  const { data: abandonedCarts, isLoading: isLoadingCarts } = useQuery({
    queryKey: ['abandoned-carts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cart_sessions')
        .select(`
          *,
          enhanced_cart_tracking (
            product_id,
            product_name,
            product_price,
            quantity,
            added_at,
            abandonment_reason
          )
        `)
        .is('abandoned_at', null)
        .gt('item_count', 0)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data as CartSession[];
    },
  });

  // Fetch recovery campaigns history
  const { data: recoveryCampaigns, isLoading: isLoadingCampaigns } = useQuery({
    queryKey: ['recovery-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cart_abandonment_campaigns')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch customer engagement metrics
  const { data: customerMetrics, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['customer-engagement'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_engagement_metrics')
        .select('*')
        .order('lifetime_value', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch analytics snapshots for trends
  const { data: snapshots, isLoading: isLoadingSnapshots } = useQuery({
    queryKey: ['analytics-snapshots'],
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

  const queryClient = useQueryClient();

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
    onSuccess: (data) => {
      toast.success(`Recovery campaign sent to ${data.emailsSent} customers`);
      queryClient.invalidateQueries({ queryKey: ['recovery-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['cart-analytics'] });
    },
    onError: (error) => {
      toast.error('Failed to send recovery campaign: ' + error.message);
    },
  });

  // Track cart event
  const trackCartEvent = useMutation({
    mutationFn: async (eventData: {
      sessionId: string;
      userId?: string;
      email?: string;
      phone?: string;
      eventType: 'cart_created' | 'item_added' | 'item_removed' | 'checkout_initiated' | 'payment_attempted' | 'cart_abandoned' | 'cart_converted';
      productId?: string;
      productName?: string;
      productPrice?: number;
      quantity?: number;
      cartValue?: number;
      deviceInfo?: any;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
      pageUrl?: string;
      abandonmentReason?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('track-cart-events', {
        body: eventData
      });
      
      if (error) throw error;
      return data;
    },
    onError: (error) => {
      console.error('Failed to track cart event:', error);
    },
  });

  // Calculate key metrics
  const metrics = {
    totalAbandonedCarts: abandonedCarts?.length || 0,
    totalAbandonedValue: abandonedCarts?.reduce((sum, cart) => sum + cart.total_value, 0) || 0,
    avgCartValue: abandonedCarts?.length ? 
      (abandonedCarts.reduce((sum, cart) => sum + cart.total_value, 0) / abandonedCarts.length) : 0,
    highValueCarts: abandonedCarts?.filter(cart => cart.total_value > 100).length || 0,
    recentAbandonment: abandonedCarts?.filter(cart => {
      const hourAgo = Date.now() - 60 * 60 * 1000;
      return new Date(cart.updated_at).getTime() > hourAgo;
    }).length || 0,
  };

  // Get recovery opportunities
  const recoveryOpportunities = {
    oneHour: abandonedCarts?.filter(cart => {
      const hourAgo = Date.now() - 60 * 60 * 1000;
      const hourAndHalfAgo = Date.now() - 90 * 60 * 1000;
      const updatedTime = new Date(cart.updated_at).getTime();
      return updatedTime < hourAgo && updatedTime > hourAndHalfAgo && cart.email;
    }) || [],
    
    twentyFourHour: abandonedCarts?.filter(cart => {
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const dayAndHourAgo = Date.now() - 25 * 60 * 60 * 1000;
      const updatedTime = new Date(cart.updated_at).getTime();
      return updatedTime < dayAgo && updatedTime > dayAndHourAgo && cart.email;
    }) || [],
    
    seventyTwoHour: abandonedCarts?.filter(cart => {
      const threeDaysAgo = Date.now() - 72 * 60 * 60 * 1000;
      const threeDaysAndHourAgo = Date.now() - 73 * 60 * 60 * 1000;
      const updatedTime = new Date(cart.updated_at).getTime();
      return updatedTime < threeDaysAgo && updatedTime > threeDaysAndHourAgo && cart.email;
    }) || [],
    
    oneWeek: abandonedCarts?.filter(cart => {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const weekAndDayAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
      const updatedTime = new Date(cart.updated_at).getTime();
      return updatedTime < weekAgo && updatedTime > weekAndDayAgo && cart.email;
    }) || []
  };

  return {
    // Data
    analyticsData,
    abandonedCarts,
    recoveryCampaigns,
    customerMetrics,
    snapshots,
    
    // Loading states
    isLoadingAnalytics,
    isLoadingCarts,
    isLoadingCampaigns,
    isLoadingCustomers,
    isLoadingSnapshots,
    
    // Mutations
    triggerRecoveryCampaign,
    trackCartEvent,
    
    // Computed metrics
    metrics,
    recoveryOpportunities,
    
    // Actions
    refetchAnalytics,
  };
};