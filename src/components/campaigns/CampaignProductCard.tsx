import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ShoppingCart, Heart, Clock, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEnhancedCart } from "@/hooks/useEnhancedCart";
import { useWishlistContext } from "@/contexts/WishlistContext";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { getSupabaseImageUrl } from "@/utils/imageUtils";

export interface CampaignProduct {
  id: string;
  campaign_price: number | null;
  discount_percentage: number | null;
  display_order: number;
  products: {
    id: string;
    name: string;
    price: number;
    slug: string;
    compare_at_price?: number;
    stock_quantity?: number;
    categories?: { id: string; name: string; slug: string };
    product_images?: Array<{
      image_url: string;
      alt_text?: string;
      is_primary?: boolean;
      sort_order?: number;
    }>;
  };
}

export const CountdownTimer = ({
  endDate,
  accentColor,
}: {
  endDate: string;
  accentColor: string;
}) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(endDate).getTime() - new Date().getTime();
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [endDate]);

  return (
    <div className="flex items-center gap-3">
      <Clock className="h-4 w-4 opacity-80" />
      <div className="flex gap-2">
        {[
          { value: timeLeft.days, label: "Days" },
          { value: timeLeft.hours, label: "Hrs" },
          { value: timeLeft.minutes, label: "Min" },
          { value: timeLeft.seconds, label: "Sec" },
        ].map((unit) => (
          <div
            key={unit.label}
            className="flex flex-col items-center min-w-[48px] rounded-lg px-2 py-1.5"
            style={{ backgroundColor: `${accentColor}30` }}
          >
            <span className="text-2xl font-bold leading-tight tabular-nums">
              {String(unit.value).padStart(2, "0")}
            </span>
            <span className="text-[9px] uppercase tracking-wider opacity-70">
              {unit.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const CampaignProductCard = ({
  item,
  accentColor,
  textColor,
}: {
  item: CampaignProduct;
  accentColor: string;
  textColor: string;
}) => {
  const { addToCart } = useEnhancedCart();
  const { isInWishlist, toggleWishlist, loading } = useWishlistContext();
  const { trackCartAdd } = useAnalytics();
  const { settings } = useSiteSettings();

  const product = item.products;
  if (!product) return null;

  const inWishlist = isInWishlist(product.id);
  const isInStock = (product.stock_quantity || 0) > 0;
  const hidePricing = settings?.hide_pricing === true;

  const effectivePrice = item.campaign_price ?? product.price;
  const originalPrice = product.price;
  const hasDiscount =
    item.campaign_price != null && item.campaign_price < originalPrice;
  const discountPct =
    item.discount_percentage ??
    (hasDiscount
      ? Math.round(((originalPrice - effectivePrice) / originalPrice) * 100)
      : null);

  const sortedImages =
    product.product_images?.sort(
      (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
    ) || [];
  const primaryImage =
    sortedImages.find((img) => img.is_primary) || sortedImages[0];

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product.id, 1, { ...product, price: effectivePrice });
    trackCartAdd(product.id, 1);
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group relative flex flex-col bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 touch-manipulation border-t-[3px]"
      style={{ borderTopColor: accentColor }}
    >
      {/* Discount Badge */}
      {discountPct != null && discountPct > 0 && (
        <div
          className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full text-white text-xs font-bold shadow-lg"
          style={{ backgroundColor: accentColor }}
        >
          <Tag className="h-3 w-3" />
          -{discountPct}%
        </div>
      )}

      {/* Wishlist */}
      <button
        className={`absolute top-3 right-3 z-10 h-8 w-8 flex items-center justify-center bg-white/90 hover:bg-white rounded-full shadow-sm transition-all duration-200 ${
          inWishlist
            ? "text-red-500"
            : "text-gray-400 opacity-0 group-hover:opacity-100"
        }`}
        onClick={handleToggleWishlist}
        disabled={loading}
      >
        <Heart className={`h-4 w-4 ${inWishlist ? "fill-current" : ""}`} />
      </button>

      {/* Image */}
      <div className="relative bg-[hsl(var(--product-image-bg))] aspect-square overflow-hidden">
        <div className="w-full h-full flex items-center justify-center p-4">
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
              <span className="text-xs">No image</span>
            </div>
          )}
        </div>

        {/* Out of Stock Overlay */}
        {!isInStock && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
            <span className="bg-gray-900 text-white text-xs font-semibold px-4 py-2 uppercase tracking-wider rounded">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 p-4 flex flex-col gap-2">
        {product.categories && (
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {product.categories.name}
          </span>
        )}

        <h3 className="font-medium text-sm text-foreground line-clamp-2 min-h-[2.5rem] leading-tight">
          {product.name}
        </h3>

        {/* Price Section — enhanced */}
        <div className="mt-auto pt-2 border-t border-border/10">
          {!hidePricing ? (
            <div className="flex items-baseline gap-2">
              <span
                className="text-lg font-bold"
                style={{ color: hasDiscount ? accentColor : "inherit" }}
              >
                R{effectivePrice.toFixed(2)}
              </span>
              {hasDiscount && (
                <span className="text-sm text-muted-foreground line-through">
                  R{originalPrice.toFixed(2)}
                </span>
              )}
              {hasDiscount && discountPct && (
                <span
                  className="text-xs font-semibold text-white px-1.5 py-0.5 rounded ml-auto"
                  style={{ backgroundColor: accentColor }}
                >
                  -{discountPct}%
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Request Quote
            </span>
          )}
        </div>

        {/* Add to Cart */}
        {isInStock && (
          <Button
            size="sm"
            className="w-full font-medium text-xs uppercase tracking-wider h-9 rounded-lg mt-1 transition-colors"
            style={{ backgroundColor: accentColor, color: "#fff" }}
            onClick={handleAddToCart}
          >
            <ShoppingCart className="h-3.5 w-3.5 mr-2" />
            Add to Cart
          </Button>
        )}
      </div>
    </Link>
  );
};
