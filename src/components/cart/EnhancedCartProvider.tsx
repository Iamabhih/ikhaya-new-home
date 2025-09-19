import React, { createContext, useContext, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/hooks/useCart';
import { useCartMigration } from '@/hooks/useCartMigration';
import { useEnhancedCartAnalytics } from '@/hooks/useEnhancedCartAnalytics';

interface EnhancedCartContextType {
  // Cart functionality
  cart: ReturnType<typeof useCart>;
  
  // Migration
  migration: ReturnType<typeof useCartMigration>;
  
  // Enhanced analytics
  analytics: ReturnType<typeof useEnhancedCartAnalytics>;
  
  // Enhanced methods
  addToCartWithAnalytics: (productId: string, quantity: number, productData?: any) => Promise<void>;
  removeFromCartWithAnalytics: (itemId: string, productData?: any) => Promise<void>;
  trackCheckoutInitiated: () => void;
  trackPaymentAttempted: () => void;
  trackCartConverted: (orderId?: string) => void;
  captureEmailForRecovery: (email: string) => void;
}

const EnhancedCartContext = createContext<EnhancedCartContextType | undefined>(undefined);

export const useEnhancedCart = () => {
  const context = useContext(EnhancedCartContext);
  if (!context) {
    throw new Error('useEnhancedCart must be used within an EnhancedCartProvider');
  }
  return context;
};

interface EnhancedCartProviderProps {
  children: React.ReactNode;
}

export const EnhancedCartProvider: React.FC<EnhancedCartProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const cart = useCart();
  const migration = useCartMigration();
  const analytics = useEnhancedCartAnalytics();
  
  const sessionId = React.useMemo(() => {
    if (typeof window === 'undefined') return '';
    
    let id = localStorage.getItem('cart_session_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('cart_session_id', id);
    }
    return id;
  }, []);

  // Enhanced add to cart with comprehensive analytics
  const addToCartWithAnalytics = async (productId: string, quantity: number = 1, productData?: any) => {
    try {
      // Add to cart first
      cart.addToCart({ productId, quantity });
      
      // Track analytics
      analytics.trackEnhancedCartEvent({
        sessionId,
        userId: user?.id,
        eventType: 'item_added',
        productId,
        productName: productData?.name,
        productPrice: productData?.price,
        productCategory: productData?.category,
        productSku: productData?.sku,
        quantity,
        cartValue: cart.total + (productData?.price * quantity || 0),
        pageUrl: window.location.pathname,
        deviceInfo: {
          userAgent: navigator.userAgent,
          screenResolution: `${screen.width}x${screen.height}`,
          language: navigator.language,
          timestamp: Date.now()
        },
        utmSource: new URLSearchParams(window.location.search).get('utm_source') || undefined,
        utmMedium: new URLSearchParams(window.location.search).get('utm_medium') || undefined,
        utmCampaign: new URLSearchParams(window.location.search).get('utm_campaign') || undefined
      });

    } catch (error) {
      console.error('Failed to add to cart with analytics:', error);
      throw error;
    }
  };

  // Enhanced remove from cart with analytics
  const removeFromCartWithAnalytics = async (itemId: string, productData?: any) => {
    try {
      // Remove from cart first
      cart.removeItem(itemId);
      
      // Track analytics
      analytics.trackEnhancedCartEvent({
        sessionId,
        userId: user?.id,
        eventType: 'item_removed',
        productId: productData?.product_id,
        productName: productData?.product?.name || productData?.name,
        productPrice: productData?.product?.price || productData?.price,
        cartValue: cart.total,
        pageUrl: window.location.pathname
      });

    } catch (error) {
      console.error('Failed to remove from cart with analytics:', error);
      throw error;
    }
  };

  // Track checkout initiation
  const trackCheckoutInitiated = () => {
    analytics.trackEnhancedCartEvent({
      sessionId,
      userId: user?.id,
      eventType: 'checkout_initiated',
      cartValue: cart.total,
      pageUrl: window.location.pathname
    });
  };

  // Track payment attempt
  const trackPaymentAttempted = () => {
    analytics.trackEnhancedCartEvent({
      sessionId,
      userId: user?.id,
      eventType: 'payment_attempted',
      cartValue: cart.total,
      pageUrl: window.location.pathname
    });
  };

  // Track successful conversion
  const trackCartConverted = (orderId?: string) => {
    analytics.trackEnhancedCartEvent({
      sessionId,
      userId: user?.id,
      eventType: 'cart_converted',
      cartValue: cart.total,
      pageUrl: window.location.pathname
    });

    analytics.markCartConverted({ sessionId, orderId });

    // Clear session after successful conversion
    localStorage.removeItem('cart_session_id');
  };

  // Capture email for abandoned cart recovery
  const captureEmailForRecovery = (email: string) => {
    if (cart.items && cart.items.length > 0) {
      analytics.createOrUpdateCartSession({
        sessionId,
        userId: user?.id,
        email,
        totalValue: cart.total,
        itemCount: cart.itemCount
      });
    }
  };

  // Track cart abandonment on page visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && cart.items && cart.items.length > 0) {
        analytics.markCartAbandoned({
          sessionId,
          stage: 'browse',
          reason: 'tab_hidden'
        });
      }
    };

    // Track abandonment on page unload
    const handleBeforeUnload = () => {
      if (cart.items && cart.items.length > 0) {
        analytics.markCartAbandoned({
          sessionId,
          stage: 'browse',
          reason: 'page_exit'
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [cart.items, cart.total, sessionId, analytics]);

  // Create cart session on first load if cart has items
  useEffect(() => {
    if (cart.items && cart.items.length > 0) {
      analytics.createOrUpdateCartSession({
        sessionId,
        userId: user?.id,
        totalValue: cart.total,
        itemCount: cart.itemCount,
        utmSource: new URLSearchParams(window.location.search).get('utm_source') || undefined,
        utmMedium: new URLSearchParams(window.location.search).get('utm_medium') || undefined,
        utmCampaign: new URLSearchParams(window.location.search).get('utm_campaign') || undefined,
        deviceInfo: {
          userAgent: navigator.userAgent,
          screenResolution: `${screen.width}x${screen.height}`,
          language: navigator.language
        }
      });
    }
  }, [cart.items.length, cart.total, sessionId, user?.id, analytics]);

  const contextValue: EnhancedCartContextType = {
    cart,
    migration,
    analytics,
    addToCartWithAnalytics,
    removeFromCartWithAnalytics,
    trackCheckoutInitiated,
    trackPaymentAttempted,
    trackCartConverted,
    captureEmailForRecovery
  };

  return (
    <EnhancedCartContext.Provider value={contextValue}>
      {children}
    </EnhancedCartContext.Provider>
  );
};