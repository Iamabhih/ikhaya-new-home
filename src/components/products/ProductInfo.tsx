
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Minus, Plus, ShoppingCart, Share2 } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useWishlist } from "@/hooks/useWishlist";
import { StarRating } from "@/components/reviews/StarRating";

interface ProductInfoProps {
  product: {
    id: string;
    name: string;
    price: number;
    compare_at_price?: number;
    description?: string;
    short_description?: string;
    sku?: string;
    stock_quantity?: number;
    average_rating?: number;
    review_count?: number;
    categories?: {
      name: string;
    };
  };
}

export const ProductInfo = ({ product }: ProductInfoProps) => {
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist, loading } = useWishlist();
  
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
  const discountPercentage = hasDiscount 
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : 0;
  const inWishlist = isInWishlist(product.id);

  const incrementQuantity = () => {
    setQuantity(prev => prev + 1);
  };

  const decrementQuantity = () => {
    setQuantity(prev => Math.max(1, prev - 1));
  };

  const handleAddToCart = () => {
    addToCart({ productId: product.id, quantity });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: product.short_description || product.name,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <div className="space-y-8 sticky top-8">
      {/* Category */}
      {product.categories && (
        <Badge variant="outline" className="text-xs font-medium px-3 py-1">
          {product.categories.name}
        </Badge>
      )}

      {/* Title */}
      <div className="space-y-3">
        <h1 className="text-4xl lg:text-5xl font-bold text-foreground leading-tight tracking-tight">
          {product.name}
        </h1>
        
        {/* Rating */}
        {product.average_rating && product.review_count && Number(product.review_count) > 0 && (
          <div className="flex items-center gap-3">
            <StarRating rating={product.average_rating} readonly />
            <span className="text-sm text-muted-foreground">
              {product.average_rating.toFixed(1)} ({product.review_count} review{product.review_count !== 1 ? 's' : ''})
            </span>
          </div>
        )}
      </div>

      {/* Price */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-4">
          <span className="text-4xl font-bold text-foreground">
            R{product.price.toFixed(2)}
          </span>
          {hasDiscount && (
            <span className="text-2xl text-muted-foreground line-through">
              R{product.compare_at_price.toFixed(2)}
            </span>
          )}
        </div>
        {hasDiscount && (
          <Badge variant="destructive" className="text-sm font-medium">
            Save {discountPercentage}% (R{(product.compare_at_price - product.price).toFixed(2)})
          </Badge>
        )}
      </div>

      {/* Short Description */}
      {product.short_description && (
        <div className="space-y-2">
          <p className="text-lg text-muted-foreground leading-relaxed">
            {product.short_description}
          </p>
        </div>
      )}

      {/* Stock Status & SKU */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Badge 
          variant={(product.stock_quantity && Number(product.stock_quantity) > 0) ? "default" : "destructive"}
          className="w-fit text-sm font-medium px-3 py-1"
        >
          {product.stock_quantity && Number(product.stock_quantity) > 0
            ? `✓ ${product.stock_quantity} in stock` 
            : '✗ Out of stock'
          }
        </Badge>
        {product.sku && (
          <span className="text-sm text-muted-foreground font-mono">SKU: {product.sku}</span>
        )}
      </div>

      {/* Quantity & Actions Section */}
      <div className="space-y-6 pt-4 border-t border-border/50">
        {/* Quantity Selector */}
        <div className="flex items-center gap-6">
          <span className="font-medium text-base">Quantity</span>
          <div className="flex items-center border-2 rounded-lg overflow-hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={decrementQuantity}
              disabled={quantity <= 1}
              className="h-12 w-12 rounded-none hover:bg-muted"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="px-6 py-3 min-w-[4rem] text-center font-medium bg-muted/50">
              {quantity}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={incrementQuantity}
              className="h-12 w-12 rounded-none hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            size="lg" 
            className="w-full h-14 text-lg font-medium"
            onClick={handleAddToCart}
            disabled={!product.stock_quantity || Number(product.stock_quantity) <= 0}
          >
            <ShoppingCart className="h-5 w-5 mr-3" />
            {product.stock_quantity && Number(product.stock_quantity) > 0 ? 'Add to Cart' : 'Out of Stock'}
          </Button>
          
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              size="lg"
              className="flex-1 h-12"
              onClick={() => toggleWishlist(product.id)}
              disabled={loading}
            >
              <Heart className={`h-5 w-5 mr-2 ${inWishlist ? 'fill-current text-destructive' : ''}`} />
              {inWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
            </Button>
            
            <Button variant="outline" size="lg" className="h-12 px-4" onClick={handleShare}>
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Description */}
      {product.description && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-3">Description</h3>
          <div className="prose prose-sm max-w-none">
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
