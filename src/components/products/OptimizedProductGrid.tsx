import React, { useCallback } from 'react';
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

  const renderLoadingState = useCallback(() => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
      {Array.from({ length: 12 }).map((_, index) => (
        <UniversalLoading
          key={index}
          variant="card"
          className="w-full h-full min-h-[350px]"
        />
      ))}
    </div>
  ), []);

  const renderEmptyState = useCallback(() => (
    <Card className="border border-border/40 bg-white">
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No Products Found</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          {searchQuery
            ? `No products found matching "${searchQuery}". Try different keywords or browse our categories.`
            : "No products found matching your criteria. Try adjusting your filters."
          }
        </p>
        {(searchQuery || hasActiveFilters) && onClearFilters && (
          <Button onClick={onClearFilters} className="bg-foreground hover:bg-foreground/90 text-background">
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

  if (viewMode === 'list') {
    return (
      <div className={`flex flex-col gap-4 w-full ${className}`}>
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            viewMode={viewMode}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 w-full ${className}`}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          viewMode={viewMode}
        />
      ))}
    </div>
  );
};
