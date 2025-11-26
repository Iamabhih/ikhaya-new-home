import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingCart } from "lucide-react";
import { useEnhancedCart } from "@/hooks/useEnhancedCart";
import { useWishlistContext } from "@/contexts/WishlistContext";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { getSupabaseImageUrl } from "@/utils/imageUtils";
import { useEffect } from "react";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    slug: string;
    sku?: string;
    short_description?: string;
    compare_at_price?: number;
    average_rating?: number;
    review_count?: number;
    stock_quantity?: number;
    categories?: {
      id: string;
      name: string;
      slug: string;
    };
    product_images?: Array<{
      id?: string;
      image_url: string;
      alt_text?: string;
      is_primary?: boolean;
      sort_order?: number;
    }>;
  };
  viewMode?: "grid" | "list";
}

export const ProductCard = ({ product, viewMode = "grid" }: ProductCardProps) => {
  const { addToCart } = useEnhancedCart();
  const { isInWishlist, toggleWishlist, loading } = useWishlistContext();
  const { trackProductView, trackCartAdd } = useAnalytics();
  const { settings } = useSiteSettings();

  const inWishlist = isInWishlist(product.id);
  const isInStock = (product.stock_quantity || 0) > 0;
  const hidePricing = settings?.hide_pricing === true;
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;

  const sortedImages = product.product_images?.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)) || [];
  const primaryImage = sortedImages.find(img => img.is_primary) || sortedImages[0];
  const productUrl = `/products/${product.slug}`;

  useEffect(() => {
    trackProductView(product.id, product.categories?.id);
  }, [product.id, product.categories?.id, trackProductView]);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product.id, 1, product);
    trackCartAdd(product.id, 1);
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  // List View
  if (viewMode === "list") {
    return (
      <Card className="group overflow-hidden border border-border/30 bg-white shadow-sm hover:shadow-md transition-shadow duration-300 rounded-2xl">
        <Link to={productUrl} className="flex flex-row gap-4 p-4">
          {/* Image */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex-shrink-0 bg-[#F5F5F0] rounded-xl overflow-hidden">
            {primaryImage ? (
              <OptimizedImage
                src={getSupabaseImageUrl(primaryImage.image_url)}
                alt={primaryImage.alt_text || product.name}
                className="w-full h-full object-contain p-2"
                lazy={true}
                quality={85}
                fallbackSrc="/placeholder.svg"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <span className="text-xs">No image</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col justify-between min-w-0">
            <div>
              <h3 className="font-semibold text-sm sm:text-base text-foreground line-clamp-2 mb-1">
                {product.name}
              </h3>
              {product.sku && (
                <p className="text-xs text-muted-foreground mb-2">SKU: {product.sku}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              {!hidePricing ? (
                <span className="text-base sm:text-lg font-bold text-[#DC3545]">
                  R{product.price.toFixed(2)}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">Request Quote</span>
              )}
            </div>
          </div>
        </Link>
      </Card>
    );
  }

  // Grid View - New Design matching the catalog image
  return (
    <Card className="group overflow-hidden border border-border/30 bg-white shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl w-full max-w-[280px] mx-auto">
      <Link to={productUrl} className="block">
        {/* Image Section with Corner Badges */}
        <div className="relative bg-[#F5F5F0] aspect-square overflow-hidden">
          {/* Top Left Badge - WHOLESALE or SALE */}
          <div className="absolute top-3 left-3 z-10">
            <span className={`inline-block text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-md ${
              hasDiscount ? 'bg-[#DC3545]' : 'bg-[#DC3545]'
            }`}>
              {hasDiscount ? 'SALE' : 'WHOLESALE'}
            </span>
          </div>

          {/* Top Right Badge - Category */}
          {product.categories && (
            <div className="absolute top-3 right-3 z-10">
              <span className="inline-block bg-[#0D6EFD] text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-md uppercase truncate max-w-[100px]">
                {product.categories.name}
              </span>
            </div>
          )}

          {/* Product Image */}
          <div className="w-full h-full flex items-center justify-center p-6">
            {primaryImage ? (
              <OptimizedImage
                src={getSupabaseImageUrl(primaryImage.image_url)}
                alt={primaryImage.alt_text || product.name}
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                lazy={true}
                quality={85}
                fallbackSrc="/placeholder.svg"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <div className="w-16 h-16 bg-muted rounded mb-2" />
                <span className="text-sm">No image</span>
              </div>
            )}
          </div>

          {/* Bottom Left Badge - SKU */}
          {product.sku && (
            <div className="absolute bottom-3 left-3 z-10">
              <span className="inline-block bg-[#6C757D] text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-md">
                {product.sku}
              </span>
            </div>
          )}

          {/* Bottom Right Badge - Price */}
          <div className="absolute bottom-3 right-3 z-10">
            {!hidePricing ? (
              <span className="inline-block bg-[#DC3545] text-white text-sm font-bold px-4 py-2 rounded-full shadow-md">
                R{product.price.toFixed(2)}
              </span>
            ) : (
              <span className="inline-block bg-[#6C757D] text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-md">
                Quote
              </span>
            )}
          </div>

          {/* Wishlist Button - Shows on hover */}
          <Button
            variant="ghost"
            size="icon"
            className={`absolute top-12 right-3 h-8 w-8 bg-white/90 hover:bg-white shadow-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 ${
              inWishlist ? 'text-red-500 hover:text-red-600 opacity-100' : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={handleToggleWishlist}
            disabled={loading}
          >
            <Heart className={`h-4 w-4 ${inWishlist ? 'fill-current' : ''}`} />
          </Button>

          {/* Out of Stock Overlay */}
          {!isInStock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
              <span className="bg-white text-gray-800 text-xs font-bold px-4 py-2 rounded-full shadow-lg">
                Out of Stock
              </span>
            </div>
          )}
        </div>

        {/* Product Name Section */}
        <div className="p-4 bg-white border-t border-gray-100">
          <h3 className="font-semibold text-sm text-center text-foreground line-clamp-2 min-h-[2.5rem] uppercase tracking-wide">
            {product.name}
          </h3>

          {/* Quick Add to Cart - Shows on hover */}
          {isInStock && (
            <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <Button
                size="sm"
                className="w-full bg-[#DC3545] hover:bg-[#BB2D3B] text-white font-semibold rounded-full"
                onClick={handleAddToCart}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Add to Cart
              </Button>
            </div>
          )}
        </div>
      </Link>
    </Card>
  );
};
