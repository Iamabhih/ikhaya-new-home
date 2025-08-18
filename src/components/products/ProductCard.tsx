
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useCart } from "@/hooks/useCart";
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
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist, loading } = useWishlistContext();
  
  const inWishlist = isInWishlist(product.id);
  const isInStock = (product.stock_quantity || 0) > 0;
  
  const handleAddToCart = () => addToCart({ productId: product.id });
  const handleToggleWishlist = () => toggleWishlist(product.id);
  
  if (viewMode === "list") {
  return (
    <Card className="group hover:shadow-premium hover:-translate-y-1 transition-all duration-300 ease-out glass-card border-gradient hover:border-primary/20 w-full">
      <CardContent className="p-0">
        <div className="flex flex-col xs:flex-row gap-3 xs:gap-4 sm:gap-6 p-3 xs:p-4 sm:p-6 min-h-[120px] xs:min-h-[140px] sm:min-h-[160px]">
            <ProductImage
              product={product}
              inWishlist={inWishlist}
              onToggleWishlist={handleToggleWishlist}
              loading={loading}
              viewMode={viewMode}
            />
            
            <div className="flex-1 flex flex-col justify-between space-y-2 xs:space-y-3 min-w-0">
              <ProductDetails product={product} viewMode={viewMode} />
              
              <div className="flex flex-col xs:flex-row xs:items-end xs:justify-between gap-2 mt-auto">
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
    <Card className="group hover:shadow-premium hover:-translate-y-1 transition-all duration-300 ease-out glass-card border-gradient hover:border-primary/20 h-full flex flex-col overflow-hidden w-full max-w-sm mx-auto">
      <CardContent className="p-0 flex-1 flex flex-col h-full">
        <div className="relative flex-shrink-0 overflow-hidden aspect-square">
          <ProductImage
            product={product}
            inWishlist={inWishlist}
            onToggleWishlist={handleToggleWishlist}
            loading={loading}
            viewMode={viewMode}
          />
        </div>
        
        <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between min-h-0">
          <div className="flex-1 space-y-2">
            <ProductDetails product={product} viewMode={viewMode} />
            <ProductPrice 
              price={product.price} 
              compareAtPrice={product.compare_at_price}
              viewMode={viewMode}
            />
          </div>
          
          <div className="mt-3 pt-2 border-t border-border/50">
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
