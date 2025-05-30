
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface AnalyticsEvent {
  event_type: string;
  event_name: string;
  page_path?: string;
  product_id?: string;
  category_id?: string;
  order_id?: string;
  metadata?: Record<string, any>;
}

export const useAnalytics = () => {
  const { user } = useAuth();
  const [sessionId] = useState(() => crypto.randomUUID());

  const trackEvent = async (event: AnalyticsEvent) => {
    try {
      await supabase
        .from('analytics_events')
        .insert({
          user_id: user?.id,
          session_id: sessionId,
          ...event,
        });
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  };

  // Track page views automatically
  useEffect(() => {
    const currentPath = window.location.pathname;
    trackEvent({
      event_type: 'page_view',
      event_name: 'page_visited',
      page_path: currentPath,
    });
  }, []);

  const trackProductView = (productId: string, categoryId?: string) => {
    trackEvent({
      event_type: 'product_view',
      event_name: 'product_viewed',
      product_id: productId,
      category_id: categoryId,
      page_path: window.location.pathname,
    });
  };

  const trackPurchase = (orderId: string, totalAmount: number) => {
    trackEvent({
      event_type: 'purchase',
      event_name: 'order_completed',
      order_id: orderId,
      metadata: { total_amount: totalAmount },
    });
  };

  const trackCartAdd = (productId: string, quantity: number) => {
    trackEvent({
      event_type: 'cart',
      event_name: 'item_added_to_cart',
      product_id: productId,
      metadata: { quantity },
    });
  };

  const trackSearch = (query: string, resultsCount: number) => {
    trackEvent({
      event_type: 'search',
      event_name: 'search_performed',
      metadata: { query, results_count: resultsCount },
    });
  };

  return {
    trackEvent,
    trackProductView,
    trackPurchase,
    trackCartAdd,
    trackSearch,
  };
};
