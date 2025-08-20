import React, { useMemo, useCallback } from 'react';
import { ProductCard } from './ProductCard';
import { UniversalLoading } from '@/components/ui/universal-loading';
import { Card } from '@/components/ui/card';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Product {
  id: string;
  name: string;
  price: number;
  slug: string;
  sku?: string;
  short_description?: string;
  compare_at_price?: number;
  average_rating?: number;
  review_count?: number;
  stock_quantity?: number;
  categories?: {
    id: string;
    name: string;
    slug: string;
  };
  product_images?: Array<{
    id?: string;
    image_url: string;
    alt_text?: string;
    is_primary?: boolean;
    sort_order?: number;
  }>;
}

interface OptimizedProductGridProps {
  products: Product[];
  isLoading: boolean;
  viewMode?: 'grid' | 'list';
  onClearFilters?: () => void;
  searchQuery?: string;
  hasActiveFilters?: boolean;
  className?: string;
}

export const OptimizedProductGrid = ({
  products,
  isLoading,
  viewMode = 'grid',
  onClearFilters,
  searchQuery,
  hasActiveFilters,
  className = ''
}: OptimizedProductGridProps) => {
  
  // Optimized grid styles based on view mode
  const gridStyles = useMemo(() => {
    if (viewMode === 'list') {
      return {
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '1rem',
        alignItems: 'stretch'
      };
    }
    
    // Fluid grid with optimal card sizes
    return {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, calc(50% - 0.5rem)), 1fr))',
      gap: 'clamp(0.75rem, 2.5vw, 1.5rem)',
      alignItems: 'stretch',
      justifyItems: 'center'
    };
  }, [viewMode]);

  // Mobile-specific grid adjustments
  const mobileGridClass = viewMode === 'grid' 
    ? 'grid-mobile-optimized' 
    : 'grid-list-mobile-optimized';

  const renderLoadingState = useCallback(() => (
    <div className={`${mobileGridClass}`} style={gridStyles}>
      {Array.from({ length: 12 }).map((_, index) => (
        <div key={index} className="w-full">
          <UniversalLoading 
            variant="card" 
            className="w-full h-full min-h-[350px]"
          />
        </div>
      ))}
    </div>
  ), [gridStyles, mobileGridClass]);

  const renderEmptyState = useCallback(() => (
    <Card className="border-0 bg-white/50 backdrop-blur-sm shadow-lg">
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-primary/10 rounded-full mx-auto mb-4 flex items-center justify-center">
          <Search className="h-8 w-8 text-primary/60" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No Products Found</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          {searchQuery 
            ? `No products found matching "${searchQuery}". Try different keywords or browse our categories.`
            : "No products found matching your criteria. Try adjusting your filters."
          }
        </p>
        {(searchQuery || hasActiveFilters) && onClearFilters && (
          <Button onClick={onClearFilters} className="bg-primary hover:bg-primary/90">
            View All Products
          </Button>
        )}
      </div>
    </Card>
  ), [searchQuery, hasActiveFilters, onClearFilters]);

  if (isLoading) {
    return renderLoadingState();
  }

  if (products.length === 0) {
    return renderEmptyState();
  }

  return (
    <div 
      className={`w-full ${mobileGridClass} ${className}`}
      style={gridStyles}
    >
      {products.map((product) => (
        <div key={product.id} className="w-full flex justify-center">
          <ProductCard 
            product={product} 
            viewMode={viewMode}
          />
        </div>
      ))}
    </div>
  );
};