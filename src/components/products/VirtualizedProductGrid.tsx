
import React, { useRef, useEffect, useState } from 'react';
import { ProductCard } from './ProductCard';
import { useVirtualizer } from '@/hooks/useVirtualizer';
import { Loading } from '@/components/ui/loading';

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
  const [columnsPerRow, setColumnsPerRow] = useState(4);

  // Calculate columns based on container width
  useEffect(() => {
    const updateColumns = () => {
      if (!scrollElementRef.current) return;
      
      const containerWidth = scrollElementRef.current.clientWidth;
      
      // Calculate columns based on screen width and minimum card width
      const minCardWidth = 280; // Minimum card width in pixels
      const gap = 24; // Gap between cards in pixels
      
      let columns = Math.floor((containerWidth + gap) / (minCardWidth + gap));
      
      // Apply responsive breakpoints
      if (containerWidth < 480) columns = Math.min(columns, 1); // xs
      else if (containerWidth < 640) columns = Math.min(columns, 2); // sm
      else if (containerWidth < 768) columns = Math.min(columns, 2); // md
      else if (containerWidth < 1024) columns = Math.min(columns, 3); // lg
      else if (containerWidth < 1280) columns = Math.min(columns, 3); // xl
      else if (containerWidth < 1536) columns = Math.min(columns, 4); // 2xl
      else columns = Math.min(columns, 5); // larger screens
      
      columns = Math.max(1, Math.min(columns, 5)); // Ensure between 1-5 columns
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
      <Loading 
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
