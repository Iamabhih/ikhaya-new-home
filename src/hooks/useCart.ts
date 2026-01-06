import { useCart } from '@/hooks/useCart';
import { useCartAnalytics } from '@/hooks/useCartAnalytics';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';

// Enhanced cart hook that includes analytics tracking
export const useCart = () => {
  const cart = useCart();
  const { trackCartEvent } = useCartAnalytics();
  const { user } = useAuth();
  
  // Memoize user ID to prevent auth loops
  const userId = useMemo(() => user?.id, [user?.id]);
  
  const [sessionId] = useState(() => {
    // Get or create session ID from localStorage
    let storedSessionId = localStorage.getItem('cart_session_id');
    if (!storedSessionId) {
      storedSessionId = crypto.randomUUID();
      localStorage.setItem('cart_session_id', storedSessionId);
    }
    return storedSessionId;
  });

  const lastCartState = useRef<any>(null);
  const addToCartStartTime = useRef<number | null>(null);

  // Track cart creation when first item is added - optimized to prevent loops
  useEffect(() => {
    if (cart.items && cart.items.length > 0 && (!lastCartState.current || lastCartState.current.length === 0)) {
      trackCartEvent.mutate({
        sessionId,
        userId,
        eventType: 'cart_created',
        cartValue: cart.total,
        pageUrl: window.location.pathname,
        deviceInfo: {
          userAgent: navigator.userAgent,
          screenResolution: `${screen.width}x${screen.height}`,
          language: navigator.language,
          timestamp: Date.now()
        },
        utmSource: new URLSearchParams(window.location.search).get('utm_source') || undefined,
        utmMedium: new URLSearchParams(window.location.search).get('utm_medium') || undefined,
        utmCampaign: new URLSearchParams(window.location.search).get('utm_campaign') || undefined,
      });
    }
    lastCartState.current = cart.items;
  }, [cart.items, cart.total, sessionId, userId, trackCartEvent]);

  // Track cart abandonment on page unload - memoized handlers to prevent loops
  const handleBeforeUnload = useCallback(() => {
    if (cart.items && cart.items.length > 0) {
      // Use navigator.sendBeacon for reliable tracking on page unload
      const eventData = {
        sessionId,
        userId,
        eventType: 'cart_abandoned',
        cartValue: cart.total,
        abandonmentReason: 'page_exit',
        pageUrl: window.location.pathname
      };

      const blob = new Blob([JSON.stringify(eventData)], { type: 'application/json' });
      navigator.sendBeacon(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-cart-events`,
        blob
      );
    }
  }, [cart.items, cart.total, sessionId, userId]);

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden && cart.items && cart.items.length > 0) {
      trackCartEvent.mutate({
        sessionId,
        userId,
        eventType: 'cart_abandoned',
        cartValue: cart.total,
        abandonmentReason: 'tab_hidden',
        pageUrl: window.location.pathname
      });
    }
  }, [cart.items, cart.total, sessionId, userId, trackCartEvent]);

  useEffect(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleBeforeUnload, handleVisibilityChange]);

  // Enhanced add to cart with analytics - memoized to prevent loops
  const enhancedAddToCart = useCallback(async (productId: string, quantity: number = 1, productData?: any) => {
    try {
      cart.addToCart({ productId, quantity });
      
      // Track successful add to cart
      trackCartEvent.mutate({
        sessionId,
        userId,
        eventType: 'item_added',
        productId,
        productName: productData?.name,
        productPrice: productData?.price,
        quantity,
        cartValue: cart.total + (productData?.price * quantity),
        pageUrl: window.location.pathname
      });
    } catch (error) {
      console.error('Failed to add to cart:', error);
      throw error;
    }
  }, [cart, sessionId, userId, trackCartEvent]);

  // Enhanced remove from cart with analytics - memoized to prevent loops
  const enhancedRemoveFromCart = useCallback(async (itemId: string, productData?: any) => {
    try {
      cart.removeItem(itemId);
      
      trackCartEvent.mutate({
        sessionId,
        userId,
        eventType: 'item_removed',
        productId: productData?.product_id,
        productName: productData?.name,
        productPrice: productData?.price,
        cartValue: cart.total,
        pageUrl: window.location.pathname
      });

    } catch (error) {
      console.error('Failed to remove from cart:', error);
      throw error;
    }
  }, [cart, sessionId, userId, trackCartEvent]);

  // Track checkout initiation - memoized to prevent loops with debounce
  const trackCheckoutInitiated = useCallback(() => {
    // Prevent duplicate tracking within 5 seconds
    const lastTracked = localStorage.getItem('last_checkout_track');
    const now = Date.now();
    if (lastTracked && (now - parseInt(lastTracked)) < 5000) {
      return;
    }
    localStorage.setItem('last_checkout_track', now.toString());
    
    trackCartEvent.mutate({
      sessionId,
      userId,
      eventType: 'checkout_initiated',
      cartValue: cart.total,
      pageUrl: window.location.pathname
    });
  }, [sessionId, userId, trackCartEvent, cart.total]);

  // Track payment attempt - memoized to prevent loops
  const trackPaymentAttempted = useCallback(() => {
    trackCartEvent.mutate({
      sessionId,
      userId,
      eventType: 'payment_attempted',
      cartValue: cart.total,
      pageUrl: window.location.pathname
    });
  }, [sessionId, userId, trackCartEvent, cart.total]);

  // Track cart conversion - memoized to prevent loops
  const trackCartConverted = useCallback((orderId?: string) => {
    trackCartEvent.mutate({
      sessionId,
      userId,
      eventType: 'cart_converted',
      cartValue: cart.total,
      pageUrl: window.location.pathname
    });

    // Clear session after successful conversion
    localStorage.removeItem('cart_session_id');
  }, [sessionId, userId, trackCartEvent, cart.total]);

  // Get email for abandoned cart recovery - memoized to prevent loops
  const captureEmailForRecovery = useCallback((email: string) => {
    if (cart.items && cart.items.length > 0) {
      trackCartEvent.mutate({
        sessionId,
        userId,
        email,
        eventType: 'cart_created', // Update existing session with email
        cartValue: cart.total,
        pageUrl: window.location.pathname
      });
    }
  }, [cart.items, cart.total, sessionId, userId, trackCartEvent]);

  return {
    ...cart,
    sessionId,
    
    // Enhanced actions with analytics
    addToCart: enhancedAddToCart,
    removeFromCart: enhancedRemoveFromCart,
    
    // Analytics tracking methods
    trackCheckoutInitiated,
    trackPaymentAttempted,
    trackCartConverted,
    captureEmailForRecovery,
    
    // Metrics
    sessionStartTime: addToCartStartTime.current,
  };
};