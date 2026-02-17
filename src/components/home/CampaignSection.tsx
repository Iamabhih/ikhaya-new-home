import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, ShoppingCart, Heart, Clock, Tag, Flame } from "lucide-react";
import { UniversalLoading } from "@/components/ui/universal-loading";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useEnhancedCart } from "@/hooks/useEnhancedCart";
import { useWishlistContext } from "@/contexts/WishlistContext";
import { useAnalytics } from "@/hooks/useAnalytics";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { getSupabaseImageUrl } from "@/utils/imageUtils";
import { useEffect, useState } from "react";

interface CampaignProduct {
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

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  theme: string;
  banner_image_url: string | null;
  background_color: string;
  accent_color: string;
  text_color: string;
  badge_text: string;
  start_date: string | null;
  end_date: string | null;
  campaign_products: CampaignProduct[];
}

const CountdownTimer = ({ endDate, accentColor }: { endDate: string; accentColor: string }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

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
          { value: timeLeft.days, label: "D" },
          { value: timeLeft.hours, label: "H" },
          { value: timeLeft.minutes, label: "M" },
          { value: timeLeft.seconds, label: "S" },
        ].map((unit) => (
          <div
            key={unit.label}
            className="flex flex-col items-center min-w-[40px] rounded-lg px-2 py-1"
            style={{ backgroundColor: `${accentColor}30` }}
          >
            <span className="text-lg font-bold leading-tight tabular-nums">
              {String(unit.value).padStart(2, "0")}
            </span>
            <span className="text-[9px] uppercase tracking-wider opacity-70">{unit.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const CampaignProductCard = ({
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
  const hasDiscount = item.campaign_price != null && item.campaign_price < originalPrice;
  const discountPct = item.discount_percentage
    ?? (hasDiscount ? Math.round(((originalPrice - effectivePrice) / originalPrice) * 100) : null);

  const sortedImages = product.product_images?.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)) || [];
  const primaryImage = sortedImages.find((img) => img.is_primary) || sortedImages[0];

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
      className="group relative flex flex-col bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
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
          inWishlist ? "text-red-500" : "text-gray-400 opacity-0 group-hover:opacity-100"
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

        {/* Price Section */}
        <div className="flex items-center gap-2 mt-auto">
          {!hidePricing ? (
            <>
              <span className="text-base font-bold" style={{ color: hasDiscount ? accentColor : undefined }}>
                R{effectivePrice.toFixed(2)}
              </span>
              {hasDiscount && (
                <span className="text-xs text-muted-foreground line-through">
                  R{originalPrice.toFixed(2)}
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

export const CampaignSection = () => {
  const { settings } = useSiteSettings();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["active-campaigns", settings?.hide_products_without_images],
    queryFn: async () => {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("campaigns")
        .select(`
          id,
          name,
          description,
          theme,
          banner_image_url,
          background_color,
          accent_color,
          text_color,
          badge_text,
          start_date,
          end_date,
          campaign_products(
            id,
            campaign_price,
            discount_percentage,
            display_order,
            products:product_id(
              id, name, price, slug, compare_at_price, stock_quantity,
              categories:category_id(id, name, slug),
              product_images(image_url, alt_text, is_primary, sort_order)
            )
          )
        `)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) {
        console.error("Error fetching campaigns:", error);
        return [];
      }

      // Filter campaigns within date range
      const activeCampaigns = (data || []).filter((campaign: any) => {
        if (campaign.start_date && new Date(campaign.start_date) > new Date(now)) return false;
        if (campaign.end_date && new Date(campaign.end_date) < new Date(now)) return false;
        return true;
      });

      // Filter campaign_products for active items and hide products without images if needed
      return activeCampaigns.map((campaign: any) => ({
        ...campaign,
        campaign_products: (campaign.campaign_products || [])
          .filter((cp: any) => {
            if (!cp.products) return false;
            if (settings?.hide_products_without_images && (!cp.products.product_images || cp.products.product_images.length === 0)) {
              return false;
            }
            return true;
          })
          .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0)),
      }));
    },
    staleTime: 300000,
    gcTime: 600000,
  });

  if (isLoading) {
    return (
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="container mx-auto px-6 sm:px-8">
          <UniversalLoading variant="grid" count={8} className="grid-cols-2 sm:grid-cols-3 md:grid-cols-4" />
        </div>
      </section>
    );
  }

  if (!campaigns.length) return null;

  return (
    <>
      {campaigns.map((campaign: Campaign) => {
        if (!campaign.campaign_products?.length) return null;

        return (
          <section
            key={campaign.id}
            className="relative py-16 sm:py-20 lg:py-24 overflow-hidden"
            style={{ backgroundColor: campaign.background_color, color: campaign.text_color }}
          >
            {/* Decorative background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div
                className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-10 blur-3xl"
                style={{ backgroundColor: campaign.accent_color }}
              />
              <div
                className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full opacity-5 blur-3xl"
                style={{ backgroundColor: campaign.accent_color }}
              />
              {/* Subtle pattern overlay */}
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage: `radial-gradient(${campaign.accent_color} 1px, transparent 1px)`,
                  backgroundSize: "24px 24px",
                }}
              />
            </div>

            <div className="container mx-auto px-6 sm:px-8 relative z-10">
              {/* Campaign Header */}
              <div className="text-center mb-10 sm:mb-14">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 mb-4">
                  <span
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest"
                    style={{ backgroundColor: campaign.accent_color, color: "#fff" }}
                  >
                    <Flame className="h-3.5 w-3.5" />
                    {campaign.badge_text}
                  </span>
                </div>

                {/* Campaign Name */}
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 tracking-tight">
                  {campaign.name}
                </h2>

                {/* Description */}
                {campaign.description && (
                  <p className="text-sm sm:text-base max-w-xl mx-auto mb-5 opacity-80">
                    {campaign.description}
                  </p>
                )}

                {/* Countdown Timer */}
                {campaign.end_date && new Date(campaign.end_date) > new Date() && (
                  <div className="flex justify-center mb-2">
                    <CountdownTimer endDate={campaign.end_date} accentColor={campaign.accent_color} />
                  </div>
                )}

                {/* Decorative line */}
                <div className="flex items-center justify-center gap-3 mt-5">
                  <div className="h-px w-12 opacity-30" style={{ backgroundColor: campaign.text_color }} />
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: campaign.accent_color }}
                  />
                  <div className="h-px w-12 opacity-30" style={{ backgroundColor: campaign.text_color }} />
                </div>
              </div>

              {/* Product Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {campaign.campaign_products.map((item: CampaignProduct) => (
                  <CampaignProductCard
                    key={item.id}
                    item={item}
                    accentColor={campaign.accent_color}
                    textColor={campaign.text_color}
                  />
                ))}
              </div>

              {/* CTA */}
              <div className="mt-10 sm:mt-14 text-center">
                <Link to="/products">
                  <Button
                    variant="outline"
                    size="lg"
                    className="px-10 py-6 text-sm font-semibold uppercase tracking-wider transition-all border-2 rounded-lg hover:scale-105"
                    style={{
                      borderColor: campaign.text_color,
                      color: campaign.text_color,
                      backgroundColor: "transparent",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = campaign.text_color;
                      e.currentTarget.style.color = campaign.background_color;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = campaign.text_color;
                    }}
                  >
                    Shop All Products
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        );
      })}
    </>
  );
};
