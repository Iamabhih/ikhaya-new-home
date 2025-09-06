
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
      <Card className="group relative overflow-hidden border-0 bg-white/60 backdrop-blur-sm shadow-soft hover:shadow-premium transition-all duration-500 hover:scale-[1.02] rounded-xl">
        <CardContent className="p-0">
          <div className="flex flex-col xs:flex-row gap-4 p-4 sm:p-6 min-h-[140px] bg-gradient-to-r from-card/80 via-card/60 to-card/80">
            <div className="flex-shrink-0">
              <ProductImage
                product={product}
                inWishlist={inWishlist}
                onToggleWishlist={handleToggleWishlist}
                loading={loading}
                viewMode={viewMode}
              />
            </div>
            
            <div className="flex-1 flex flex-col justify-between space-y-3 min-w-0">
              <div className="space-y-2">
                <ProductDetails product={product} viewMode={viewMode} />
                <ProductPrice 
                  price={product.price} 
                  compareAtPrice={product.compare_at_price}
                  viewMode={viewMode}
                />
              </div>
              
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/20">
                <div className="flex items-center gap-2">
                  {product.categories && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-secondary/20 text-secondary border border-secondary/30 shadow-glow-secondary/50 hover:bg-secondary/30 transition-all duration-300 uppercase tracking-widest">
                      {product.categories.name}
                    </span>
                  )}
                  {isInStock ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                      In Stock
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                      Out of Stock
                    </span>
                  )}
                </div>
                
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
        
        {/* Subtle hover gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      </Card>
    );
  }
  
  return (
    <Card className="group relative h-full flex flex-col overflow-hidden w-full max-w-[320px] mx-auto border-0 bg-white/70 backdrop-blur-sm shadow-soft hover:shadow-premium transition-all duration-500 hover:scale-[1.05] hover:-translate-y-1 rounded-xl">
      <CardContent className="p-0 flex-1 flex flex-col h-full">
        {/* Enhanced Image Section */}
        <div className="relative flex-shrink-0 overflow-hidden aspect-[4/3] bg-gradient-to-br from-primary/5 via-background/50 to-secondary/5 group-hover:from-primary/10 group-hover:to-secondary/10 transition-all duration-500">
          <ProductImage
            product={product}
            inWishlist={inWishlist}
            onToggleWishlist={handleToggleWishlist}
            loading={loading}
            viewMode={viewMode}
          />
          
          {/* Stock Status Badge */}
          <div className="absolute top-3 left-3">
            {isInStock ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/90 text-white backdrop-blur-sm border border-green-400/50 shadow-lg">
                In Stock
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500/90 text-white backdrop-blur-sm border border-red-400/50 shadow-lg">
                Out of Stock
              </span>
            )}
          </div>
          
          {/* Category Badge */}
          {product.categories && (
            <div className="absolute top-3 right-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-secondary/95 text-white backdrop-blur-sm border border-secondary shadow-glow-secondary shadow-lg hover:scale-105 transition-all duration-300 uppercase tracking-widest">
                {product.categories.name}
              </span>
            </div>
          )}
          
          {/* Hover overlay with gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>
        
        {/* Enhanced Content Section */}
        <div className="p-4 flex-1 flex flex-col justify-between min-h-0 bg-gradient-to-b from-card/95 to-white/95 backdrop-blur-sm group-hover:from-card group-hover:to-white transition-all duration-300">
          <div className="flex-1 space-y-3">
            <ProductDetails product={product} viewMode={viewMode} />
            
            {/* Price Section with Enhanced Styling */}
            <div className="space-y-1">
              <ProductPrice 
                price={product.price} 
                compareAtPrice={product.compare_at_price}
                viewMode={viewMode}
              />
              
              {/* SKU Display */}
              {product.sku && (
                <p className="text-xs text-muted-foreground font-mono opacity-70 group-hover:opacity-100 transition-opacity duration-300">
                  SKU: {product.sku}
                </p>
              )}
            </div>
          </div>
          
          {/* Enhanced Actions Section */}
          <div className="mt-4 pt-4 border-t border-gradient-to-r from-transparent via-border/30 to-transparent">
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
      
      {/* Premium glow effect on hover */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/10 via-transparent to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      {/* Subtle shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />
    </Card>
  );
};
