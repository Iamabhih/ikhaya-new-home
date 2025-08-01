
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
      <Card className="group hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out">
        <CardContent className="p-0">
          <div className="flex flex-col xs:flex-row gap-2 xs:gap-3 sm:gap-4 p-2 xs:p-3 sm:p-4">
            <ProductImage
              product={product}
              inWishlist={inWishlist}
              onToggleWishlist={handleToggleWishlist}
              loading={loading}
              viewMode={viewMode}
            />
            
            <div className="flex-1 flex flex-col justify-between space-y-1 xs:space-y-2 sm:space-y-0">
              <ProductDetails product={product} viewMode={viewMode} />
              
              <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-1 xs:gap-2 pt-1 xs:pt-2 sm:pt-0">
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
    <Card className="group hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out h-full flex flex-col">
      <CardContent className="p-0 flex-1">
        <ProductImage
          product={product}
          inWishlist={inWishlist}
          onToggleWishlist={handleToggleWishlist}
          loading={loading}
          viewMode={viewMode}
        />
        
        <div className="p-2 xs:p-3 sm:p-4 flex-1 flex flex-col">
          <ProductDetails product={product} viewMode={viewMode} />
          <ProductPrice 
            price={product.price} 
            compareAtPrice={product.compare_at_price}
            viewMode={viewMode}
          />
        </div>
      </CardContent>
      
      <CardFooter className="p-2 xs:p-3 sm:p-4 pt-0">
        <ProductActions
          productId={product.id}
          inWishlist={inWishlist}
          onToggleWishlist={handleToggleWishlist}
          onAddToCart={handleAddToCart}
          isInStock={isInStock}
          wishlistLoading={loading}
          viewMode={viewMode}
        />
      </CardFooter>
    </Card>
  );
};
