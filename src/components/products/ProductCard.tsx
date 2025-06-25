
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Heart, ShoppingCart } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useWishlist } from "@/hooks/useWishlist";
import { StarRating } from "@/components/reviews/StarRating";

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
  
  // Sort images by sort_order and find primary image
  const sortedImages = product.product_images?.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)) || [];
  const primaryImage = sortedImages.find(img => img.is_primary) || sortedImages[0];
  
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
  const inWishlist = isInWishlist(product.id);
  const isInStock = (product.stock_quantity || 0) > 0;
  
  if (viewMode === "list") {
    return (
      <Card className="group hover:shadow-lg transition-all duration-300">
        <CardContent className="p-0">
          <div className="flex gap-4 p-4">
            <div className="relative overflow-hidden rounded-lg w-32 h-32 flex-shrink-0">
              <Link to={`/product/${product.slug}`}>
                <div className="w-full h-full bg-secondary/20 flex items-center justify-center">
                  {primaryImage ? (
                    <img
                      src={primaryImage.image_url}
                      alt={primaryImage.alt_text || product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <div className="w-8 h-8 bg-muted rounded mb-2"></div>
                      <span className="text-xs">No image</span>
                    </div>
                  )}
                </div>
              </Link>
              {hasDiscount && (
                <div className="absolute top-2 left-2 bg-destructive text-white px-2 py-1 rounded text-xs font-medium">
                  Sale
                </div>
              )}
              {!isInStock && (
                <div className="absolute top-2 right-2 bg-muted text-muted-foreground px-2 py-1 rounded text-xs font-medium">
                  Out of Stock
                </div>
              )}
            </div>
            
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <Link to={`/product/${product.slug}`}>
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-2 line-clamp-2">
                    {product.name}
                  </h3>
                </Link>
                
                {product.categories && (
                  <p className="text-xs text-muted-foreground mb-1">
                    {product.categories.name}
                  </p>
                )}
                
                {/* Rating */}
                {product.average_rating && product.review_count && product.review_count > 0 && (
                  <div className="flex items-center gap-1 mb-2">
                    <StarRating rating={product.average_rating} readonly size="sm" />
                    <span className="text-xs text-muted-foreground">
                      ({product.review_count})
                    </span>
                  </div>
                )}
                
                {product.short_description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                    {product.short_description}
                  </p>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-foreground">
                    R{product.price.toFixed(2)}
                  </span>
                  {hasDiscount && (
                    <span className="text-sm text-muted-foreground line-through">
                      R{product.compare_at_price!.toFixed(2)}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`bg-background/80 hover:bg-background ${
                      inWishlist ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground'
                    }`}
                    onClick={() => toggleWishlist(product.id)}
                    disabled={loading}
                  >
                    <Heart className={`h-4 w-4 ${inWishlist ? 'fill-current' : ''}`} />
                  </Button>
                  <Button 
                    onClick={() => addToCart({ productId: product.id })}
                    disabled={!isInStock}
                    variant={isInStock ? "default" : "secondary"}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {isInStock ? "Add to Cart" : "Out of Stock"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="group hover:shadow-lg transition-all duration-300">
      <CardContent className="p-0">
        <div className="relative overflow-hidden rounded-t-lg">
          <Link to={`/product/${product.slug}`}>
            <div className="aspect-square bg-secondary/20 flex items-center justify-center">
              {primaryImage ? (
                <img
                  src={primaryImage.image_url}
                  alt={primaryImage.alt_text || product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                  <div className="w-16 h-16 bg-muted rounded mb-2"></div>
                  <span className="text-sm">No image</span>
                </div>
              )}
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className={`absolute top-2 right-2 bg-background/80 hover:bg-background ${
              inWishlist ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground'
            }`}
            onClick={() => toggleWishlist(product.id)}
            disabled={loading}
          >
            <Heart className={`h-4 w-4 ${inWishlist ? 'fill-current' : ''}`} />
          </Button>
          {hasDiscount && (
            <div className="absolute top-2 left-2 bg-destructive text-white px-2 py-1 rounded text-xs font-medium">
              Sale
            </div>
          )}
          {!isInStock && (
            <div className="absolute bottom-2 left-2 bg-muted text-muted-foreground px-2 py-1 rounded text-xs font-medium">
              Out of Stock
            </div>
          )}
        </div>
        
        <div className="p-4">
          <Link to={`/product/${product.slug}`}>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-2 line-clamp-2">
              {product.name}
            </h3>
          </Link>
          
          {product.categories && (
            <p className="text-xs text-muted-foreground mb-2">
              {product.categories.name}
            </p>
          )}
          
          {/* Rating */}
          {product.average_rating && product.review_count && product.review_count > 0 && (
            <div className="flex items-center gap-1 mb-2">
              <StarRating rating={product.average_rating} readonly size="sm" />
              <span className="text-xs text-muted-foreground">
                ({product.review_count})
              </span>
            </div>
          )}
          
          {product.short_description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {product.short_description}
            </p>
          )}
          
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg font-bold text-foreground">
              R{product.price.toFixed(2)}
            </span>
            {hasDiscount && (
              <span className="text-sm text-muted-foreground line-through">
                R{product.compare_at_price!.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0">
        <Button 
          className="w-full" 
          onClick={() => addToCart({ productId: product.id })}
          disabled={!isInStock}
          variant={isInStock ? "default" : "secondary"}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          {isInStock ? "Add to Cart" : "Out of Stock"}
        </Button>
      </CardFooter>
    </Card>
  );
};
