
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
  if (viewMode === "list") {
    return (
      <div className="flex items-center gap-1 xs:gap-2">
        <Button
          variant="ghost"
          size="icon"
          className={`h-7 w-7 xs:h-8 xs:w-8 sm:h-9 sm:w-9 bg-background/80 hover:bg-background ${
            inWishlist ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground'
          }`}
          onClick={onToggleWishlist}
          disabled={wishlistLoading}
        >
          <Heart className={`h-3 w-3 xs:h-3 xs:w-3 sm:h-4 sm:w-4 ${inWishlist ? 'fill-current' : ''}`} />
        </Button>
        <Button 
          onClick={onAddToCart}
          disabled={!isInStock}
          variant={isInStock ? "default" : "secondary"}
          size="sm"
          className="text-xs xs:text-xs sm:text-sm px-1.5 xs:px-2 sm:px-4 h-7 xs:h-8 sm:h-9"
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
        className={`h-7 w-7 xs:h-8 xs:w-8 sm:h-9 sm:w-9 bg-background/80 hover:bg-background ${
          inWishlist ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground'
        } flex-shrink-0`}
        onClick={onToggleWishlist}
        disabled={wishlistLoading}
      >
        <Heart className={`h-3 w-3 xs:h-3 xs:w-3 sm:h-4 sm:w-4 ${inWishlist ? 'fill-current' : ''}`} />
      </Button>
      <Button 
        className="flex-1 text-xs xs:text-xs sm:text-sm h-7 xs:h-8 sm:h-10 min-w-0" 
        onClick={onAddToCart}
        disabled={!isInStock}
        variant={isInStock ? "default" : "secondary"}
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
