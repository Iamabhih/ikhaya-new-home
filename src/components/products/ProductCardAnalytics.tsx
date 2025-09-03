import { useEffect } from 'react';
import { useAnalyticsContext } from '@/contexts/AnalyticsContext';

interface ProductCardAnalyticsProps {
  productId: string;
  categoryId?: string;
  productName: string;
}

export const ProductCardAnalytics = ({ productId, categoryId, productName }: ProductCardAnalyticsProps) => {
  const { trackEvent } = useAnalyticsContext();

  useEffect(() => {
    // Track product impression when card is rendered
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            trackEvent({
              event_type: 'product_impression',
              event_name: 'product_card_viewed',
              product_id: productId,
              category_id: categoryId,
              metadata: {
                product_name: productName,
                timestamp: new Date().toISOString()
              }
            });
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 }
    );

    const element = document.getElementById(`product-card-${productId}`);
    if (element) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [productId, categoryId, productName, trackEvent]);

  return null;
};