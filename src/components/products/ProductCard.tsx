
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useCart } from "@/hooks/useCart";
import { useWishlist } from "@/hooks/useWishlist";
import { ProductImage } from "./ProductImage";
import { ProductDetails } from "./ProductDetails";
import { ProductPrice } from "./ProductPrice";
import { ProductActions } from "./ProductActions";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    slug: string;
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
  const { isInWishlist, toggleWishlist, loading } = useWishlist();
  
  const inWishlist = isInWishlist(product.id);
  const isInStock = (product.stock_quantity || 0) > 0;
  
  const handleAddToCart = () => addToCart({ productId: product.id });
  const handleToggleWishlist = () => toggleWishlist(product.id);
  
  if (viewMode === "list") {
    return (
      <Card className="group glass-card hover-glow border-0 shadow-soft hover:shadow-premium transition-all duration-500 ease-out">
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 sm:p-6">
            <ProductImage
              product={product}
              inWishlist={inWishlist}
              onToggleWishlist={handleToggleWishlist}
              loading={loading}
              viewMode={viewMode}
            />
            
            <div className="flex-1 flex flex-col justify-between space-y-3 sm:space-y-4">
              <ProductDetails product={product} viewMode={viewMode} />
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                <ProductPrice 
                  price={product.price} 
                  compareAtPrice={product.compare_at_price}
                  viewMode={viewMode}
                />
                
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
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="group glass-card hover-glow border-0 shadow-soft hover:shadow-premium transition-all duration-500 ease-out h-full flex flex-col overflow-hidden">
      <CardContent className="p-0 flex-1 flex flex-col">
        <ProductImage
          product={product}
          inWishlist={inWishlist}
          onToggleWishlist={handleToggleWishlist}
          loading={loading}
          viewMode={viewMode}
        />
        
        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <ProductDetails product={product} viewMode={viewMode} />
            <ProductPrice 
              price={product.price} 
              compareAtPrice={product.compare_at_price}
              viewMode={viewMode}
            />
          </div>
          
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
      </CardContent>
    </Card>
  );
};
