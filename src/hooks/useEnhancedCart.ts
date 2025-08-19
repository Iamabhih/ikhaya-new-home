import { useCart } from '@/hooks/useCart';
import { useCartAnalytics } from '@/hooks/useCartAnalytics';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useRef, useState } from 'react';

// Enhanced cart hook that includes analytics tracking
export const useEnhancedCart = () => {
  const cart = useCart();
  const { trackCartEvent } = useCartAnalytics();
  const { user } = useAuth();
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

  // Track cart creation when first item is added
  useEffect(() => {
    if (cart.items && cart.items.length > 0 && (!lastCartState.current || lastCartState.current.length === 0)) {
      trackCartEvent.mutate({
        sessionId,
        userId: user?.id,
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
  }, [cart.items, cart.total, sessionId, user?.id, trackCartEvent]);

  // Track cart abandonment on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (cart.items && cart.items.length > 0) {
        // Use navigator.sendBeacon for reliable tracking on page unload
        const eventData = {
          sessionId,
          userId: user?.id,
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
    };

    // Track abandonment on page visibility change (mobile)
    const handleVisibilityChange = () => {
      if (document.hidden && cart.items && cart.items.length > 0) {
        trackCartEvent.mutate({
          sessionId,
          userId: user?.id,
          eventType: 'cart_abandoned',
          cartValue: cart.total,
          abandonmentReason: 'tab_hidden',
          pageUrl: window.location.pathname
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [cart.items, cart.total, sessionId, user?.id, trackCartEvent]);

  // Enhanced add to cart with analytics
  const enhancedAddToCart = async (productId: string, quantity: number = 1, productData?: any) => {
    addToCartStartTime.current = Date.now();
    
    try {
      cart.addToCart({ productId, quantity });
      
      // Track successful add to cart
      trackCartEvent.mutate({
        sessionId,
        userId: user?.id,
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
  };

  // Enhanced remove from cart with analytics
  const enhancedRemoveFromCart = async (itemId: string, productData?: any) => {
    try {
      cart.removeItem(itemId);
      
      trackCartEvent.mutate({
        sessionId,
        userId: user?.id,
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
  };

  // Track checkout initiation
  const trackCheckoutInitiated = () => {
    trackCartEvent.mutate({
      sessionId,
      userId: user?.id,
      eventType: 'checkout_initiated',
      cartValue: cart.total,
      pageUrl: window.location.pathname
    });
  };

  // Track payment attempt
  const trackPaymentAttempted = () => {
    trackCartEvent.mutate({
      sessionId,
      userId: user?.id,
      eventType: 'payment_attempted',
      cartValue: cart.total,
      pageUrl: window.location.pathname
    });
  };

  // Track cart conversion
  const trackCartConverted = (orderId?: string) => {
    trackCartEvent.mutate({
      sessionId,
      userId: user?.id,
      eventType: 'cart_converted',
      cartValue: cart.total,
      pageUrl: window.location.pathname
    });

    // Clear session after successful conversion
    localStorage.removeItem('cart_session_id');
  };

  // Get email for abandoned cart recovery
  const captureEmailForRecovery = (email: string) => {
    if (cart.items && cart.items.length > 0) {
      trackCartEvent.mutate({
        sessionId,
        userId: user?.id,
        email,
        eventType: 'cart_created', // Update existing session with email
        cartValue: cart.total,
        pageUrl: window.location.pathname
      });
    }
  };

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