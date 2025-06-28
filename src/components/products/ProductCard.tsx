
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
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4">
            <div className="relative overflow-hidden rounded-lg w-full sm:w-24 md:w-32 h-48 sm:h-24 md:h-32 flex-shrink-0">
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
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-muted rounded mb-2"></div>
                      <span className="text-xs">No image</span>
                    </div>
                  )}
                </div>
              </Link>
              {hasDiscount && (
                <div className="absolute top-1 sm:top-2 left-1 sm:left-2 bg-destructive text-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs font-medium">
                  Sale
                </div>
              )}
              {!isInStock && (
                <div className="absolute top-1 sm:top-2 right-1 sm:right-2 bg-muted text-muted-foreground px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs font-medium">
                  Out of Stock
                </div>
              )}
            </div>
            
            <div className="flex-1 flex flex-col justify-between space-y-2 sm:space-y-0">
              <div className="space-y-1 sm:space-y-2">
                <Link to={`/product/${product.slug}`}>
                  <h3 className="font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {product.name}
                  </h3>
                </Link>
                
                {product.categories && (
                  <p className="text-xs text-muted-foreground">
                    {product.categories.name}
                  </p>
                )}
                
                {/* Rating */}
                {product.average_rating && product.review_count && product.review_count > 0 && (
                  <div className="flex items-center gap-1">
                    <StarRating rating={product.average_rating} readonly size="sm" />
                    <span className="text-xs text-muted-foreground">
                      ({product.review_count})
                    </span>
                  </div>
                )}
                
                {product.short_description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 sm:line-clamp-3 hidden sm:block">
                    {product.short_description}
                  </p>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 sm:pt-0">
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg font-bold text-foreground">
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
                    className={`h-8 w-8 sm:h-9 sm:w-9 bg-background/80 hover:bg-background ${
                      inWishlist ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground'
                    }`}
                    onClick={() => toggleWishlist(product.id)}
                    disabled={loading}
                  >
                    <Heart className={`h-3 w-3 sm:h-4 sm:w-4 ${inWishlist ? 'fill-current' : ''}`} />
                  </Button>
                  <Button 
                    onClick={() => addToCart({ productId: product.id })}
                    disabled={!isInStock}
                    variant={isInStock ? "default" : "secondary"}
                    size="sm"
                    className="text-xs sm:text-sm px-2 sm:px-4"
                  >
                    <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">
                      {isInStock ? "Add to Cart" : "Out of Stock"}
                    </span>
                    <span className="sm:hidden">
                      {isInStock ? "Add" : "Out"}
                    </span>
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
    <Card className="group hover:shadow-lg transition-all duration-300 h-full flex flex-col">
      <CardContent className="p-0 flex-1">
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
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded mb-2"></div>
                  <span className="text-sm">No image</span>
                </div>
              )}
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className={`absolute top-2 right-2 h-8 w-8 sm:h-9 sm:w-9 bg-background/80 hover:bg-background ${
              inWishlist ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground'
            }`}
            onClick={() => toggleWishlist(product.id)}
            disabled={loading}
          >
            <Heart className={`h-3 w-3 sm:h-4 sm:w-4 ${inWishlist ? 'fill-current' : ''}`} />
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
        
        <div className="p-3 sm:p-4 flex-1 flex flex-col">
          <Link to={`/product/${product.slug}`}>
            <h3 className="font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors mb-1 sm:mb-2 line-clamp-2">
              {product.name}
            </h3>
          </Link>
          
          {product.categories && (
            <p className="text-xs text-muted-foreground mb-1 sm:mb-2">
              {product.categories.name}
            </p>
          )}
          
          {/* Rating */}
          {product.average_rating && product.review_count && product.review_count > 0 && (
            <div className="flex items-center gap-1 mb-1 sm:mb-2">
              <StarRating rating={product.average_rating} readonly size="sm" />
              <span className="text-xs text-muted-foreground">
                ({product.review_count})
              </span>
            </div>
          )}
          
          {product.short_description && (
            <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 line-clamp-2 flex-1">
              {product.short_description}
            </p>
          )}
          
          <div className="flex items-center gap-2 mt-auto">
            <span className="text-base sm:text-lg font-bold text-foreground">
              R{product.price.toFixed(2)}
            </span>
            {hasDiscount && (
              <span className="text-xs sm:text-sm text-muted-foreground line-through">
                R{product.compare_at_price!.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-3 sm:p-4 pt-0">
        <Button 
          className="w-full text-xs sm:text-sm h-8 sm:h-10" 
          onClick={() => addToCart({ productId: product.id })}
          disabled={!isInStock}
          variant={isInStock ? "default" : "secondary"}
        >
          <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">
            {isInStock ? "Add to Cart" : "Out of Stock"}
          </span>
          <span className="sm:hidden">
            {isInStock ? "Add" : "Out of Stock"}
          </span>
        </Button>
      </CardFooter>
    </Card>
  );
};
