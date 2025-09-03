
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useEnhancedCart } from "@/hooks/useEnhancedCart";
import { useWishlistContext } from "@/contexts/WishlistContext";
import { ProductImage } from "./ProductImage";
import { ProductDetails } from "./ProductDetails";
import { ProductPrice } from "./ProductPrice";
import { ProductActions } from "./ProductActions";
import { useState, useEffect } from "react";
import { UniversalLoading } from "@/components/ui/universal-loading";

interface ProductCardProps {
  product: {
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
  };
  viewMode?: "grid" | "list";
}

export const ProductCard = ({ product, viewMode = "grid" }: ProductCardProps) => {
  const { addToCart } = useEnhancedCart();
  const { isInWishlist, toggleWishlist, loading } = useWishlistContext();
  
  const inWishlist = isInWishlist(product.id);
  const isInStock = (product.stock_quantity || 0) > 0;
  
  const handleAddToCart = () => addToCart(product.id, 1, product);
  const handleToggleWishlist = () => toggleWishlist(product.id);
  
  if (viewMode === "list") {
  return (
    <Card className="group glass-card hover-lift hover-glow border-gradient w-full product-card-mobile overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col xs:flex-row gap-2 xs:gap-3 sm:gap-4 p-3 xs:p-3 sm:p-4 min-h-[120px] xs:min-h-[130px] sm:min-h-[140px] bg-gradient-subtle">
            <ProductImage
              product={product}
              inWishlist={inWishlist}
              onToggleWishlist={handleToggleWishlist}
              loading={loading}
              viewMode={viewMode}
            />
            
            <div className="flex-1 flex flex-col justify-between space-y-1 xs:space-y-2 min-w-0">
              <ProductDetails product={product} viewMode={viewMode} />
              
              <div className="flex flex-col xs:flex-row xs:items-end xs:justify-between gap-1 xs:gap-2 mt-auto">
                <ProductPrice 
                  price={product.price} 
                  compareAtPrice={product.compare_at_price}
                  viewMode={viewMode}
                />
                
                <div className="flex-shrink-0">
                  <ProductActions
                    productId={product.id}
                    inWishlist={inWishlist}
                    onToggleWishlist={handleToggleWishlist}
                    onAddToCart={handleAddToCart}
                    isInStock={isInStock}
                    wishlistLoading={loading}
                    viewMode={viewMode}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="group glass-card hover-lift hover-glow border-gradient h-full flex flex-col overflow-hidden w-full max-w-[280px] mx-auto product-card-mobile shadow-elegant transition-all duration-300">
      <CardContent className="p-0 flex-1 flex flex-col h-full">
        <div className="relative flex-shrink-0 overflow-hidden aspect-[3/2] product-image rounded-t-lg bg-gradient-to-br from-background/50 to-background/80">
          <ProductImage
            product={product}
            inWishlist={inWishlist}
            onToggleWishlist={handleToggleWishlist}
            loading={loading}
            viewMode={viewMode}
          />
        </div>
        
        <div className="p-3 flex-1 flex flex-col justify-between min-h-0 bg-gradient-to-b from-card to-card/95">
          <div className="flex-1 space-y-2">
            <ProductDetails product={product} viewMode={viewMode} />
            <ProductPrice 
              price={product.price} 
              compareAtPrice={product.compare_at_price}
              viewMode={viewMode}
            />
          </div>
          
          <div className="mt-3 pt-2 border-t border-border/10">
            <ProductActions
              productId={product.id}
              inWishlist={inWishlist}
              onToggleWishlist={handleToggleWishlist}
              onAddToCart={handleAddToCart}
              isInStock={isInStock}
              wishlistLoading={loading}
              viewMode={viewMode}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
