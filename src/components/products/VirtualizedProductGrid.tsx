
import React, { useRef, useEffect, useState } from 'react';
import { ProductCard } from './ProductCard';
import { useVirtualizer } from '@/hooks/useVirtualizer';
import { UniversalLoading } from '@/components/ui/universal-loading';

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
  containerHeight: propHeight,
  itemHeight: propItemHeight
}: VirtualizedProductGridProps) => {
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const [columnsPerRow, setColumnsPerRow] = useState(4);

  // Responsive container and item heights
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const containerHeight = propHeight ?? (viewportWidth < 640 ? 500 : viewportWidth < 1024 ? 550 : 600);
  const itemHeight = propItemHeight ?? (viewportWidth < 480 ? 280 : viewportWidth < 640 ? 300 : 350);

  // Calculate columns based on container width
  useEffect(() => {
    const updateColumns = () => {
      if (!scrollElementRef.current) return;

      const containerWidth = scrollElementRef.current.clientWidth;

      // Responsive column calculation
      let columns: number;
      if (containerWidth < 375) columns = 1;
      else if (containerWidth < 640) columns = 2;
      else if (containerWidth < 768) columns = 2;
      else if (containerWidth < 1024) columns = 3;
      else if (containerWidth < 1280) columns = 3;
      else if (containerWidth < 1536) columns = 4;
      else columns = 5;

      setColumnsPerRow(columns);
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  // Calculate total rows needed
  const totalRows = Math.ceil(products.length / columnsPerRow);

  const { virtualItems, totalHeight, setScrollTop } = useVirtualizer({
    itemCount: totalRows,
    itemHeight,
    containerHeight,
    overscan: 3
  });

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  if (isLoading) {
    return (
      <UniversalLoading 
        variant="grid" 
        count={12} 
        className="grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
      />
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
        <div 
          className="absolute top-0 left-0 right-0"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columnsPerRow}, minmax(0, 1fr))`,
            gap: '1.5rem',
            padding: '0 0.5rem'
          }}
        >
          {virtualItems.map((virtualRow) => {
            const startIndex = virtualRow.index * columnsPerRow;
            const endIndex = Math.min(startIndex + columnsPerRow, products.length);
            const rowProducts = products.slice(startIndex, endIndex);

            return rowProducts.map((product, colIndex) => (
              <div
                key={product.id}
                style={{
                  transform: `translateY(${virtualRow.index * itemHeight}px)`,
                  gridColumn: colIndex + 1,
                }}
              >
                <ProductCard product={product} />
              </div>
            ));
          })}
        </div>
      </div>
    </div>
  );
};
