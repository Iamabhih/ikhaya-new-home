
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
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className={`h-10 w-10 glass hover:bg-background/90 shadow-soft backdrop-blur-md transition-all duration-300 hover:scale-110 ${
            inWishlist ? 'text-red-500 hover:text-red-600' : 'text-premium hover:text-primary'
          }`}
          onClick={onToggleWishlist}
          disabled={wishlistLoading}
        >
          <Heart className={`h-4 w-4 ${inWishlist ? 'fill-current' : ''} transition-transform duration-200`} />
        </Button>
        <Button 
          onClick={onAddToCart}
          disabled={!isInStock}
          variant={isInStock ? "default" : "secondary"}
          size="sm"
          className="text-sm px-4 py-2 font-semibold shadow-soft hover:shadow-premium transition-all duration-300 hover:scale-105"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          <span>
            {isInStock ? "Add to Cart" : "Out of Stock"}
          </span>
        </Button>
      </div>
    );
  }

  return (
    <Button 
      className="w-full text-sm font-semibold h-11 shadow-soft hover:shadow-premium transition-all duration-300 hover:scale-105" 
      onClick={onAddToCart}
      disabled={!isInStock}
      variant={isInStock ? "default" : "secondary"}
    >
      <ShoppingCart className="h-4 w-4 mr-2" />
      <span>
        {isInStock ? "Add to Cart" : "Out of Stock"}
      </span>
    </Button>
  );
};
