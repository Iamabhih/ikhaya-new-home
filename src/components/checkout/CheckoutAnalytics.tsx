import { useEffect } from 'react';
import { useAnalyticsContext } from '@/contexts/AnalyticsContext';

interface CheckoutAnalyticsProps {
  step: 'initiated' | 'completed';
  orderId?: string;
  totalAmount?: number;
  items?: Array<{
    product_id: string;
    quantity: number;
    price: number;
  }>;
}

export const CheckoutAnalytics = ({ step, orderId, totalAmount, items }: CheckoutAnalyticsProps) => {
  const { trackEvent, trackPurchase } = useAnalyticsContext();

  useEffect(() => {
    if (step === 'initiated') {
      trackEvent({
        event_type: 'checkout',
        event_name: 'checkout_initiated',
        metadata: {
          total_amount: totalAmount,
          item_count: items?.length || 0,
          timestamp: new Date().toISOString()
        }
      });
    } else if (step === 'completed' && orderId && totalAmount) {
      trackPurchase(orderId, totalAmount);
      
      // Track individual item purchases
      items?.forEach(item => {
        trackEvent({
          event_type: 'purchase_item',
          event_name: 'item_purchased',
          product_id: item.product_id,
          order_id: orderId,
          metadata: {
            quantity: item.quantity,
            unit_price: item.price,
            total_price: item.quantity * item.price
          }
        });
      });
    }
  }, [step, orderId, totalAmount, items, trackEvent, trackPurchase]);

  return null;
};