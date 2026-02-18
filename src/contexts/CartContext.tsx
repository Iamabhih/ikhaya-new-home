// Cart context - single source of truth via useEnhancedCart hook
// EnhancedCartProvider is NOT re-exported here to prevent double session tracking.
// Both EnhancedCartProvider and useEnhancedCart hook previously created separate
// cart_session_ids and visibilitychange listeners — this consolidation stops that.
export { useEnhancedCart } from '@/hooks/useEnhancedCart';

// Legacy compatibility exports
export { useCart, type CartItem } from '@/hooks/useCart';
