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

  /* ─── List View ─────────────────────────────────────────── */
  if (viewMode === "list") {
    return (
      <Card className="group overflow-hidden border border-border/40 bg-card shadow-card hover:shadow-premium transition-all duration-300 rounded-xl w-full">
        <Link to={productUrl} className="flex flex-row gap-4 p-4 touch-manipulation">
          {/* Image */}
          <div className="relative w-28 h-28 sm:w-36 sm:h-36 flex-shrink-0 bg-[hsl(var(--product-image-bg))] rounded-xl overflow-hidden">
            {primaryImage ? (
              <OptimizedImage
                src={getSupabaseImageUrl(primaryImage.image_url)}
                alt={primaryImage.alt_text || product.name}
                className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500"
                lazy={true}
                quality={85}
                fallbackSrc="/placeholder.svg"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <span className="text-xs">No image</span>
              </div>
            )}
            {hasDiscount && (
              <div className="absolute top-2 left-2 z-10">
                <span className="inline-block bg-sale text-sale-foreground text-[10px] font-bold px-2 py-1 rounded">
                  SALE
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col justify-between min-w-0 py-1">
            <div>
              {product.categories && (
                <span className="inline-block text-[10px] uppercase tracking-wider font-semibold text-secondary mb-1">
                  {product.categories.name}
                </span>
              )}
              <h3 className="font-semibold text-sm sm:text-base text-foreground line-clamp-2 mb-1">
                {product.name}
              </h3>
              {product.short_description && (
                <p className="text-xs text-muted-foreground line-clamp-2 hidden sm:block">
                  {product.short_description}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-4 mt-2">
              <div className="flex items-center gap-2">
                {!hidePricing ? (
                  <>
                    <span className={`text-base sm:text-lg font-bold ${hasDiscount ? 'text-sale' : 'text-foreground'}`}>
                      R{product.price.toFixed(2)}
                    </span>
                    {hasDiscount && product.compare_at_price && (
                      <span className="text-xs sm:text-sm text-muted-foreground line-through">
                        R{product.compare_at_price.toFixed(2)}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">Request Quote</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-9 w-9 rounded-full transition-colors ${
                    inWishlist
                      ? 'text-sale bg-sale/8 hover:bg-sale/12'
                      : 'text-muted-foreground hover:text-sale hover:bg-sale/8'
                  }`}
                  onClick={handleToggleWishlist}
                  disabled={loading}
                >
                  <Heart className={`h-4 w-4 ${inWishlist ? 'fill-current' : ''}`} />
                </Button>
                {isInStock && (
                  <Button
                    size="sm"
                    style={{ background: 'var(--brand-gradient)' }}
                    className="text-white font-semibold h-9 px-4 text-xs rounded-lg border-0 hover:opacity-90 hover:shadow-glow transition-all"
                    onClick={handleAddToCart}
                  >
                    <ShoppingCart className="h-3.5 w-3.5 sm:mr-1.5" />
                    <span className="hidden sm:inline">Add</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Link>
      </Card>
    );
  }

  /* ─── Grid View ──────────────────────────────────────────── */
  return (
    <Card className="group overflow-hidden border border-border/40 bg-card hover:shadow-premium hover:-translate-y-0.5 transition-all duration-300 rounded-xl w-full">
      <Link to={productUrl} className="block touch-manipulation">
        {/* Image Section */}
        <div className="relative bg-[hsl(var(--product-image-bg))] aspect-square overflow-hidden rounded-t-xl">
          {/* Sale badge */}
          {hasDiscount && (
            <div className="absolute top-3 left-3 z-10">
              <span className="inline-block bg-sale text-sale-foreground text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wider">
                Sale
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
                <div className="w-16 h-16 bg-muted rounded-lg mb-2" />
                <span className="text-xs">No image</span>
              </div>
            )}
          </div>

          {/* Wishlist button — top-right, appears on hover */}
          <Button
            variant="ghost"
            size="icon"
            className={`absolute top-3 right-3 h-9 w-9 bg-white/95 hover:bg-white shadow-sm rounded-full z-20 transition-all duration-200 ${
              inWishlist
                ? 'text-sale opacity-100'
                : 'text-muted-foreground hover:text-sale opacity-0 group-hover:opacity-100'
            }`}
            onClick={handleToggleWishlist}
            disabled={loading}
          >
            <Heart className={`h-4 w-4 ${inWishlist ? 'fill-current' : ''}`} />
          </Button>

          {/* Out of Stock Overlay */}
          {!isInStock && (
            <div className="absolute inset-0 bg-background/75 flex items-center justify-center z-10 rounded-t-xl">
              <span
                className="text-xs font-bold px-4 py-2 rounded-lg uppercase tracking-wider text-white"
                style={{ background: 'var(--brand-gradient)' }}
              >
                Out of Stock
              </span>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="p-3.5 space-y-1.5">
          {/* Category */}
          {product.categories && (
            <span className="block text-[10px] uppercase tracking-widest font-semibold text-secondary">
              {product.categories.name}
            </span>
          )}

          {/* Product Name */}
          <h3 className="font-semibold text-sm text-foreground line-clamp-2 min-h-[2.5rem] leading-snug">
            {product.name}
          </h3>

          {/* Price */}
          <div className="flex items-center gap-2">
            {!hidePricing ? (
              <>
                <span className={`text-sm font-bold ${hasDiscount ? 'text-sale' : 'text-foreground'}`}>
                  R{product.price.toFixed(2)}
                </span>
                {hasDiscount && product.compare_at_price && (
                  <span className="text-xs text-muted-foreground line-through">
                    R{product.compare_at_price.toFixed(2)}
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Request Quote</span>
            )}
          </div>

          {/* Add to Cart */}
          {isInStock && (
            <Button
              size="sm"
              style={{ background: 'var(--brand-gradient)' }}
              className="w-full text-white font-semibold text-xs uppercase tracking-wider h-9 rounded-lg mt-1 border-0 hover:opacity-90 hover:shadow-glow transition-all duration-200"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="h-3.5 w-3.5 mr-2" />
              Add to Cart
            </Button>
          )}
        </div>
      </Link>
    </Card>
  );
};
