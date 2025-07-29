
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
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 sm:h-9 sm:w-9 bg-background/80 hover:bg-background ${
            inWishlist ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground'
          }`}
          onClick={onToggleWishlist}
          disabled={wishlistLoading}
        >
          <Heart className={`h-3 w-3 sm:h-4 sm:w-4 ${inWishlist ? 'fill-current' : ''}`} />
        </Button>
        <Button 
          onClick={onAddToCart}
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
    );
  }

  return (
    <Button 
      className="w-full text-xs sm:text-sm h-8 sm:h-10" 
      onClick={onAddToCart}
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
  );
};
