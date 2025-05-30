
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Heart, ShoppingCart } from "lucide-react";
import { useCart } from "@/hooks/useCart";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    slug: string;
    short_description?: string;
    compare_at_price?: number;
    product_images?: Array<{
      image_url: string;
      alt_text?: string;
      is_primary?: boolean;
    }>;
  };
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const { addToCart } = useCart();
  
  const primaryImage = product.product_images?.find(img => img.is_primary) || product.product_images?.[0];
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
  
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
                />
              ) : (
                <span className="text-muted-foreground">No image</span>
              )}
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 bg-background/80 hover:bg-background"
          >
            <Heart className="h-4 w-4" />
          </Button>
          {hasDiscount && (
            <div className="absolute top-2 left-2 bg-destructive text-white px-2 py-1 rounded text-xs font-medium">
              Sale
            </div>
          )}
        </div>
        
        <div className="p-4">
          <Link to={`/product/${product.slug}`}>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-2 line-clamp-2">
              {product.name}
            </h3>
          </Link>
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
                R{product.compare_at_price.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0">
        <Button 
          className="w-full" 
          onClick={() => addToCart({ productId: product.id })}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Add to Cart
        </Button>
      </CardFooter>
    </Card>
  );
};
