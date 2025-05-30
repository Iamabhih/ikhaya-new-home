
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Minus, Plus, ShoppingCart, Share2 } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useWishlist } from "@/hooks/useWishlist";

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
    <div className="space-y-6">
      {/* Category */}
      {product.categories && (
        <Badge variant="outline">{product.categories.name}</Badge>
      )}

      {/* Title */}
      <h1 className="text-3xl font-bold text-foreground">{product.name}</h1>

      {/* Price */}
      <div className="flex items-center gap-3">
        <span className="text-3xl font-bold text-foreground">
          R{product.price.toFixed(2)}
        </span>
        {hasDiscount && (
          <>
            <span className="text-xl text-muted-foreground line-through">
              R{product.compare_at_price.toFixed(2)}
            </span>
            <Badge variant="destructive" className="text-sm">
              {discountPercentage}% OFF
            </Badge>
          </>
        )}
      </div>

      {/* Short Description */}
      {product.short_description && (
        <p className="text-lg text-muted-foreground leading-relaxed">
          {product.short_description}
        </p>
      )}

      {/* Stock Status */}
      <div className="flex items-center gap-2">
        <Badge variant={product.stock_quantity && product.stock_quantity > 0 ? "default" : "destructive"}>
          {product.stock_quantity && product.stock_quantity > 0 
            ? `${product.stock_quantity} in stock` 
            : 'Out of stock'
          }
        </Badge>
        {product.sku && (
          <span className="text-sm text-muted-foreground">SKU: {product.sku}</span>
        )}
      </div>

      {/* Quantity Selector */}
      <div className="flex items-center gap-4">
        <span className="font-medium">Quantity:</span>
        <div className="flex items-center border rounded-lg">
          <Button
            variant="ghost"
            size="icon"
            onClick={decrementQuantity}
            disabled={quantity <= 1}
            className="h-10 w-10"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="px-4 py-2 min-w-[3rem] text-center">{quantity}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={incrementQuantity}
            className="h-10 w-10"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button 
          size="lg" 
          className="flex-1"
          onClick={handleAddToCart}
          disabled={!product.stock_quantity || product.stock_quantity <= 0}
        >
          <ShoppingCart className="h-5 w-5 mr-2" />
          Add to Cart
        </Button>
        
        <Button 
          variant="outline" 
          size="lg"
          onClick={() => toggleWishlist(product.id)}
          disabled={loading}
          className={inWishlist ? 'text-red-500 border-red-500 hover:bg-red-50' : ''}
        >
          <Heart className={`h-5 w-5 ${inWishlist ? 'fill-current' : ''}`} />
        </Button>
        
        <Button variant="outline" size="lg" onClick={handleShare}>
          <Share2 className="h-5 w-5" />
        </Button>
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
