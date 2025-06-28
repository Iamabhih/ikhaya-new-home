
import React, { useRef, useEffect } from 'react';
import { ProductCard } from './ProductCard';
import { useVirtualizer } from '@/hooks/useVirtualizer';
import { Skeleton } from '@/components/ui/skeleton';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_at_price?: number;
  stock_quantity: number;
  is_active: boolean;
  is_featured: boolean;
  category_id?: string;
  created_at: string;
  category_name?: string;
  image_url?: string;
}

interface VirtualizedProductGridProps {
  products: Product[];
  isLoading: boolean;
  containerHeight?: number;
  itemHeight?: number;
}

export const VirtualizedProductGrid = ({
  products,
  isLoading,
  containerHeight = 600,
  itemHeight = 350
}: VirtualizedProductGridProps) => {
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const { virtualItems, totalHeight, setScrollTop } = useVirtualizer({
    itemCount: products.length,
    itemHeight,
    containerHeight,
    overscan: 5
  });

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-square w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No products found</p>
      </div>
    );
  }

  return (
    <div
      ref={scrollElementRef}
      className="overflow-auto"
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 absolute top-0 left-0 right-0">
          {virtualItems.map((virtualItem) => {
            const product = products[virtualItem.index];
            if (!product) return null;

            return (
              <div
                key={product.id}
                style={{
                  transform: `translateY(${Math.floor(virtualItem.index / 4) * itemHeight}px)`,
                }}
              >
                <ProductCard product={product} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
