import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAnalytics } from '@/hooks/useAnalytics';

interface AnalyticsContextType {
  trackPageView: (path: string, title?: string) => void;
  trackProductView: (productId: string, categoryId?: string) => void;
  trackSearch: (query: string, resultsCount: number) => void;
  trackCartAdd: (productId: string, quantity: number) => void;
  trackPurchase: (orderId: string, totalAmount: number) => void;
  trackEvent: (event: any) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export const useAnalyticsContext = () => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalyticsContext must be used within AnalyticsProvider');
  }
  return context;
};

interface AnalyticsProviderProps {
  children: ReactNode;
}

export const AnalyticsProvider = ({ children }: AnalyticsProviderProps) => {
  const location = useLocation();
  const analytics = useAnalytics();

  // Track page views on route changes
  useEffect(() => {
    const path = location.pathname + location.search;
    analytics.trackEvent({
      event_type: 'page_view',
      event_name: 'page_visited',
      page_path: path,
      metadata: {
        referrer: document.referrer,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString()
      }
    });
  }, [location.pathname, location.search, analytics]);

  const trackPageView = (path: string, title?: string) => {
    analytics.trackEvent({
      event_type: 'page_view',
      event_name: 'page_visited',
      page_path: path,
      metadata: { title }
    });
  };

  const value: AnalyticsContextType = {
    trackPageView,
    trackProductView: analytics.trackProductView,
    trackSearch: analytics.trackSearch,
    trackCartAdd: analytics.trackCartAdd,
    trackPurchase: analytics.trackPurchase,
    trackEvent: analytics.trackEvent
  };

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
};