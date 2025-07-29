
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { OptimizedImage } from "@/components/common/OptimizedImage";

interface ProductImageProps {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    compare_at_price?: number;
    stock_quantity?: number;
    product_images?: Array<{
      id?: string;
      image_url: string;
      alt_text?: string;
      is_primary?: boolean;
      sort_order?: number;
    }>;
  };
  inWishlist: boolean;
  onToggleWishlist: () => void;
  loading: boolean;
  viewMode: "grid" | "list";
}

export const ProductImage = ({
  product,
  inWishlist,
  onToggleWishlist,
  loading,
  viewMode
}: ProductImageProps) => {
  const sortedImages = product.product_images?.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)) || [];
  const primaryImage = sortedImages.find(img => img.is_primary) || sortedImages[0];
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
  const isInStock = (product.stock_quantity || 0) > 0;
  const productUrl = `/products/${product.slug}`;

  const imageClasses = viewMode === "list" 
    ? "w-full sm:w-24 md:w-32 h-48 sm:h-24 md:h-32 flex-shrink-0"
    : "aspect-square";

  return (
    <div className={`relative overflow-hidden ${viewMode === "grid" ? "rounded-t-lg" : "rounded-lg"}`}>
      <Link to={productUrl} className="block">
        <div className={`${imageClasses} bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/10 flex items-center justify-center overflow-hidden hover-lift group-hover:scale-[1.02] transition-all duration-500`}>
          {primaryImage ? (
            <OptimizedImage
              src={primaryImage.image_url}
              alt={primaryImage.alt_text || product.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
              lazy={true}
              quality={90}
              fallbackSrc="/placeholder.svg"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-premium/60">
              <div className={`${viewMode === "list" ? "w-8 h-8 sm:w-10 sm:h-10" : "w-16 h-16 sm:w-20 sm:h-20"} bg-muted/50 rounded-lg mb-3 shadow-inner`}></div>
              <span className={`${viewMode === "list" ? "text-xs" : "text-sm"} font-medium`}>No image</span>
            </div>
          )}
        </div>
      </Link>
      
      {viewMode === "grid" && (
        <Button
          variant="ghost"
          size="icon"
          className={`absolute top-3 right-3 h-9 w-9 sm:h-10 sm:w-10 glass hover:bg-background/90 shadow-soft backdrop-blur-md transition-all duration-300 hover:scale-110 ${
            inWishlist ? 'text-red-500 hover:text-red-600' : 'text-premium hover:text-primary'
          }`}
          onClick={onToggleWishlist}
          disabled={loading}
        >
          <Heart className={`h-4 w-4 sm:h-5 sm:w-5 ${inWishlist ? 'fill-current' : ''} transition-transform duration-200`} />
        </Button>
      )}
      
      {hasDiscount && (
        <div className={`absolute ${viewMode === "list" ? "top-2 left-2" : "top-3 left-3"} bg-gradient-to-r from-destructive to-destructive/80 text-destructive-foreground px-2.5 py-1 rounded-full text-xs font-semibold shadow-soft backdrop-blur-sm border border-destructive/20`}>
          Sale
        </div>
      )}
      
      {!isInStock && (
        <div className={`absolute ${viewMode === "list" ? "top-2 right-2" : "bottom-3 left-3"} bg-muted/90 text-muted-foreground px-2.5 py-1 rounded-full text-xs font-semibold shadow-soft backdrop-blur-sm border border-muted/30`}>
          Out of Stock
        </div>
      )}
    </div>
  );
};
