
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
    <div className={`relative overflow-hidden rounded-lg ${viewMode === "grid" ? "rounded-t-lg" : ""}`}>
      <Link to={productUrl}>
        <div className={`${imageClasses} bg-[hsl(var(--product-image-bg))] flex items-center justify-center overflow-hidden`}>
          {primaryImage ? (
            <OptimizedImage
              src={primaryImage.image_url}
              alt={primaryImage.alt_text || product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              lazy={true}
              quality={85}
              fallbackSrc="/placeholder.svg"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <div className={`${viewMode === "list" ? "w-6 h-6 sm:w-8 sm:h-8" : "w-12 h-12 sm:w-16 sm:h-16"} bg-muted rounded mb-2`}></div>
              <span className={`${viewMode === "list" ? "text-xs" : "text-sm"}`}>No image</span>
            </div>
          )}
        </div>
      </Link>
      
      {viewMode === "grid" && (
        <Button
          variant="ghost"
          size="icon"
          className={`absolute top-2 right-2 h-8 w-8 sm:h-9 sm:w-9 bg-background/80 hover:bg-background ${
            inWishlist ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground'
          }`}
          onClick={onToggleWishlist}
          disabled={loading}
        >
          <Heart className={`h-3 w-3 sm:h-4 sm:w-4 ${inWishlist ? 'fill-current' : ''}`} />
        </Button>
      )}
      
      {hasDiscount && (
        <div className={`absolute ${viewMode === "list" ? "top-1 sm:top-2 left-1 sm:left-2" : "top-2 left-2"} bg-destructive text-destructive-foreground px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs font-medium`}>
          Sale
        </div>
      )}
      
      {!isInStock && (
        <div className={`absolute ${viewMode === "list" ? "top-1 sm:top-2 right-1 sm:right-2" : "bottom-2 left-2"} bg-muted text-muted-foreground px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs font-medium`}>
          {viewMode === "list" ? "Out of Stock" : "Out of Stock"}
        </div>
      )}
    </div>
  );
};
