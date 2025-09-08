import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAnalytics } from './useAnalytics';

interface RealTimeEvent {
  type: 'page_view' | 'product_view' | 'cart_event' | 'order_created' | 'user_signup';
  data: any;
  timestamp: string;
  session_id?: string;
  user_id?: string;
}

export const useRealTimeAnalytics = () => {
  const queryClient = useQueryClient();
  const { trackEvent } = useAnalytics();
  const channelRef = useRef<any>(null);

  // Real-time event stream
  const { data: realtimeEvents = [], isLoading } = useQuery({
    queryKey: ['realtime-events'],
    queryFn: async () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      
      const { data } = await supabase
        .from('analytics_events')
        .select('*')
        .gte('created_at', tenMinutesAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      return data || [];
    },
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  // Set up real-time subscription
  useEffect(() => {
    // Create real-time channel for analytics events
    channelRef.current = supabase
      .channel('analytics-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'analytics_events'
        },
        (payload) => {
          console.log('Real-time analytics event:', payload);
          
          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['realtime-events'] });
          queryClient.invalidateQueries({ queryKey: ['real-time-metrics'] });
          queryClient.invalidateQueries({ queryKey: ['analytics-overview'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('New order created:', payload);
          
          // Invalidate relevant queries
          queryClient.invalidateQueries({ queryKey: ['real-time-metrics'] });
          queryClient.invalidateQueries({ queryKey: ['conversion-funnel'] });
          queryClient.invalidateQueries({ queryKey: ['customer-insights'] });
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [queryClient]);

  // Track page view automatically
  const trackPageView = (path: string, title?: string) => {
    trackEvent({
      event_type: 'page_view',
      event_name: 'page_visited',
      page_path: path,
      metadata: { page_title: title }
    });
  };

  // Track product interactions
  const trackProductInteraction = (productId: string, action: string, metadata?: any) => {
    trackEvent({
      event_type: 'product_interaction',
      event_name: action,
      product_id: productId,
      metadata
    });
  };

  // Track conversion events
  const trackConversion = (conversionType: string, value?: number, metadata?: any) => {
    trackEvent({
      event_type: 'conversion',
      event_name: conversionType,
      metadata: {
        ...metadata,
        conversion_value: value
      }
    });
  };

  // Track user engagement
  const trackEngagement = (engagementType: string, duration?: number, metadata?: any) => {
    trackEvent({
      event_type: 'engagement',
      event_name: engagementType,
      metadata: {
        ...metadata,
        duration_seconds: duration
      }
    });
  };

  // Get real-time activity feed
  const getActivityFeed = () => {
    return realtimeEvents.slice(0, 20).map(event => ({
      id: event.id,
      type: event.event_type,
      action: event.event_name,
      timestamp: event.created_at,
      user_id: event.user_id,
      session_id: event.session_id,
      metadata: event.metadata,
      page_path: event.page_path,
      product_id: event.product_id
    }));
  };

  // Get real-time metrics summary
  const getMetricsSummary = () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const recentEvents = realtimeEvents.filter(event => 
      new Date(event.created_at) >= oneHourAgo
    );

    return {
      totalEvents: recentEvents.length,
      uniqueUsers: new Set(recentEvents.map(e => e.user_id).filter(Boolean)).size,
      pageViews: recentEvents.filter(e => e.event_type === 'page_view').length,
      productViews: recentEvents.filter(e => e.event_type === 'product_view').length,
      cartEvents: recentEvents.filter(e => e.event_type === 'cart').length,
      conversions: recentEvents.filter(e => e.event_type === 'conversion').length
    };
  };

  return {
    realtimeEvents,
    isLoading,
    trackPageView,
    trackProductInteraction,
    trackConversion,
    trackEngagement,
    getActivityFeed,
    getMetricsSummary
  };
};