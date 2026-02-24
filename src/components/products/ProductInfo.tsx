
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Heart, Minus, Plus, ShoppingCart, Share2, Truck, RotateCcw, ShieldCheck } from "lucide-react";
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
  const isInStock = product.stock_quantity && Number(product.stock_quantity) > 0;
  const isLowStock = isInStock && Number(product.stock_quantity) <= 5;

  const incrementQuantity = () => setQuantity(prev => prev + 1);
  const decrementQuantity = () => setQuantity(prev => Math.max(1, prev - 1));

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
      } catch {
        // cancelled or unsupported — silently ignore
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <div className="space-y-6 sticky top-8">
      {/* Category */}
      {product.categories && (
        <p className="text-xs font-semibold text-secondary uppercase tracking-widest">
          {product.categories.name}
        </p>
      )}

      {/* Product Title */}
      <h1 className="text-3xl lg:text-4xl xl:text-[2.6rem] font-bold text-foreground leading-tight tracking-tight">
        {product.name}
      </h1>

      <Separator />

      {/* Price Block */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="text-3xl font-bold text-foreground">
            R{product.price.toFixed(2)}
          </span>
          {hasDiscount && (
            <span className="text-xl text-muted-foreground line-through">
              R{product.compare_at_price.toFixed(2)}
            </span>
          )}
          {hasDiscount && (
            <Badge variant="destructive" className="text-xs font-bold px-2 py-0.5 uppercase tracking-wider">
              Save {discountPercentage}%
            </Badge>
          )}
        </div>
        {hasDiscount && (
          <p className="text-sm text-muted-foreground">
            You save{" "}
            <span className="font-semibold text-sale">
              R{(product.compare_at_price - product.price).toFixed(2)}
            </span>
          </p>
        )}
      </div>

      {/* Short Description */}
      {product.short_description && (
        <p className="text-base text-muted-foreground leading-relaxed">
          {product.short_description}
        </p>
      )}

      {/* Stock & SKU */}
      <div className="flex flex-wrap items-center gap-3">
        {isInStock ? (
          <Badge
            variant="outline"
            className="border-green-200 bg-green-50 text-green-700 text-xs font-semibold px-3 py-1"
          >
            {isLowStock
              ? `Only ${product.stock_quantity} left`
              : "In Stock"}
          </Badge>
        ) : (
          <Badge variant="destructive" className="text-xs font-semibold px-3 py-1">
            Out of Stock
          </Badge>
        )}
        {product.sku && (
          <span className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded">
            SKU: {product.sku}
          </span>
        )}
      </div>

      <Separator />

      {/* Quantity + Actions */}
      <div className="space-y-4">
        {/* Quantity Selector */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-foreground w-16">Quantity</span>
          <div className="flex items-center border border-border rounded-lg overflow-hidden shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={decrementQuantity}
              disabled={quantity <= 1}
              className="h-10 w-10 rounded-none hover:bg-muted border-r border-border"
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <span className="px-5 py-2 min-w-[3.5rem] text-center text-sm font-semibold bg-background">
              {quantity}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={incrementQuantity}
              className="h-10 w-10 rounded-none hover:bg-muted border-l border-border"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            size="lg"
            className="flex-1 h-12 text-sm font-semibold uppercase tracking-wider"
            onClick={handleAddToCart}
            disabled={!isInStock}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            {isInStock ? "Add to Cart" : "Out of Stock"}
          </Button>

          <Button
            variant="outline"
            size="lg"
            className={`h-12 w-12 p-0 border-border ${inWishlist ? "text-destructive border-destructive/30 bg-destructive/5" : ""}`}
            onClick={() => toggleWishlist(product.id)}
            disabled={loading}
            title={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart className={`h-4 w-4 ${inWishlist ? "fill-current" : ""}`} />
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="h-12 w-12 p-0 border-border"
            onClick={handleShare}
            title="Share this product"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Trust Signals */}
      <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
        <div className="flex items-start gap-3 text-sm text-muted-foreground">
          <Truck className="h-4 w-4 mt-0.5 flex-shrink-0 text-foreground/60" />
          <span>Free delivery on orders over R1,000</span>
        </div>
        <div className="flex items-start gap-3 text-sm text-muted-foreground">
          <RotateCcw className="h-4 w-4 mt-0.5 flex-shrink-0 text-foreground/60" />
          <span>Easy 30-day returns & exchanges</span>
        </div>
        <div className="flex items-start gap-3 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 mt-0.5 flex-shrink-0 text-foreground/60" />
          <span>Secure checkout — your data is protected</span>
        </div>
      </div>

      {/* Description */}
      {product.description && (
        <div className="pt-2">
          <Separator className="mb-5" />
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">
            Description
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {product.description}
          </p>
        </div>
      )}
    </div>
  );
};
