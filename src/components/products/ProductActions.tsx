
import { Button } from "@/components/ui/button";
import { Heart, ShoppingCart } from "lucide-react";

interface ProductActionsProps {
  productId: string;
  inWishlist: boolean;
  onToggleWishlist: () => void;
  onAddToCart: () => void;
  isInStock: boolean;
  wishlistLoading: boolean;
  viewMode: "grid" | "list";
}

export const ProductActions = ({
  productId,
  inWishlist,
  onToggleWishlist,
  onAddToCart,
  isInStock,
  wishlistLoading,
  viewMode
}: ProductActionsProps) => {
  const wishlistClass = inWishlist
    ? 'text-sale bg-sale/10 hover:bg-sale/15'
    : 'text-muted-foreground hover:text-sale hover:bg-sale/10';

  if (viewMode === "list") {
    return (
      <div className="flex items-center gap-1 xs:gap-2">
        <Button
          variant="ghost"
          size="icon"
          className={`h-6 w-6 xs:h-7 xs:w-7 sm:h-8 sm:w-8 rounded-full transition-colors ${wishlistClass}`}
          onClick={onToggleWishlist}
          disabled={wishlistLoading}
        >
          <Heart className={`h-3 w-3 xs:h-3 xs:w-3 sm:h-4 sm:w-4 ${inWishlist ? 'fill-current' : ''}`} />
        </Button>
        <Button
          onClick={onAddToCart}
          disabled={!isInStock}
          size="sm"
          style={isInStock ? { background: 'var(--brand-gradient)' } : undefined}
          className={`text-xs px-1.5 xs:px-2 sm:px-3 h-6 xs:h-7 sm:h-8 rounded-md border-0 ${
            isInStock
              ? 'text-white hover:opacity-90 hover:shadow-glow transition-all'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          <ShoppingCart className="h-3 w-3 xs:h-3 xs:w-3 sm:h-4 sm:w-4 mr-1 xs:mr-1 sm:mr-2" />
          <span className="hidden xs:inline sm:hidden">
            {isInStock ? "Add" : "Out"}
          </span>
          <span className="hidden sm:inline">
            {isInStock ? "Add to Cart" : "Out of Stock"}
          </span>
          <span className="xs:hidden">
            {isInStock ? "+" : "×"}
          </span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 xs:gap-2 w-full">
      <Button
        variant="ghost"
        size="icon"
        className={`h-6 w-6 xs:h-7 xs:w-7 sm:h-8 sm:w-8 rounded-full transition-colors flex-shrink-0 ${wishlistClass}`}
        onClick={onToggleWishlist}
        disabled={wishlistLoading}
      >
        <Heart className={`h-3 w-3 xs:h-3 xs:w-3 sm:h-4 sm:w-4 ${inWishlist ? 'fill-current' : ''}`} />
      </Button>
      <Button
        className={`flex-1 text-xs h-6 xs:h-7 sm:h-8 min-w-0 rounded-md border-0 ${
          isInStock
            ? 'text-white hover:opacity-90 hover:shadow-glow transition-all'
            : 'bg-muted text-muted-foreground'
        }`}
        style={isInStock ? { background: 'var(--brand-gradient)' } : undefined}
        onClick={onAddToCart}
        disabled={!isInStock}
      >
        <ShoppingCart className="h-3 w-3 xs:h-3 xs:w-3 sm:h-4 sm:w-4 mr-1 xs:mr-1 sm:mr-2 flex-shrink-0" />
        <span className="hidden xs:inline sm:hidden truncate">
          {isInStock ? "Add" : "Out"}
        </span>
        <span className="hidden sm:inline truncate">
          {isInStock ? "Add to Cart" : "Out of Stock"}
        </span>
        <span className="xs:hidden">
          {isInStock ? "+" : "×"}
        </span>
      </Button>
    </div>
  );
};
