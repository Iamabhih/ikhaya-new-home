import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { StandardBreadcrumbs } from "@/components/common/StandardBreadcrumbs";
import { UniversalLoading } from "@/components/ui/universal-loading";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Flame } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import {
  CampaignProductCard,
  CountdownTimer,
} from "@/components/campaigns/CampaignProductCard";
import type { CampaignProduct } from "@/components/campaigns/CampaignProductCard";

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  background_color: string;
  accent_color: string;
  text_color: string;
  badge_text: string;
  end_date: string | null;
  campaign_products: CampaignProduct[];
}

const CampaignProductsPage = () => {
  const { id } = useParams<{ id: string }>();
  const { settings } = useSiteSettings();

  const { data: campaign, isLoading } = useQuery({
    queryKey: ["campaign-page", id, settings?.hide_products_without_images],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("campaigns")
        .select(
          `
          id, name, description, background_color, accent_color, text_color,
          badge_text, end_date,
          campaign_products(
            id, campaign_price, discount_percentage, display_order,
            products:product_id(
              id, name, price, slug, compare_at_price, stock_quantity,
              categories:category_id(id, name, slug),
              product_images(image_url, alt_text, is_primary, sort_order)
            )
          )
        `
        )
        .eq("id", id)
        .eq("is_active", true)
        .single();

      if (error) return null;
      if (!data) return null;

      const filteredProducts = (data.campaign_products || [])
        .filter((cp: any) => {
          if (!cp.products) return false;
          if (
            settings?.hide_products_without_images &&
            (!cp.products.product_images ||
              cp.products.product_images.length === 0)
          ) {
            return false;
          }
          return true;
        })
        .sort(
          (a: any, b: any) => (a.display_order || 0) - (b.display_order || 0)
        );

      return { ...data, campaign_products: filteredProducts } as unknown as Campaign;
    },
    staleTime: 300000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <UniversalLoading
            variant="grid"
            count={8}
            className="grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
          />
        </main>
        <Footer />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Campaign not found</h1>
          <p className="text-muted-foreground mb-8">
            This campaign may have ended or is no longer active.
          </p>
          <Link to="/products">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Browse All Products
            </Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: campaign.name, isActive: true },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Campaign Hero — themed with campaign colors */}
      <section
        className="relative py-16 sm:py-20 overflow-hidden"
        style={{
          backgroundColor: campaign.background_color,
          color: campaign.text_color,
        }}
      >
        {/* Decorative blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-10 blur-3xl"
            style={{ backgroundColor: campaign.accent_color }}
          />
          <div
            className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full opacity-5 blur-3xl"
            style={{ backgroundColor: campaign.accent_color }}
          />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `radial-gradient(${campaign.accent_color} 1px, transparent 1px)`,
              backgroundSize: "24px 24px",
            }}
          />
        </div>

        <div className="container mx-auto px-6 sm:px-8 relative z-10">
          <div
            className="mb-6"
            style={{ color: `${campaign.text_color}99` }}
          >
            <StandardBreadcrumbs items={breadcrumbItems} />
          </div>

          <div className="text-center">
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

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 tracking-tight">
              {campaign.name}
            </h1>

            {campaign.description && (
              <p className="text-sm sm:text-base max-w-xl mx-auto mb-5 opacity-80">
                {campaign.description}
              </p>
            )}

            {/* Countdown Timer */}
            {campaign.end_date && new Date(campaign.end_date) > new Date() && (
              <div className="flex justify-center mb-2">
                <CountdownTimer
                  endDate={campaign.end_date}
                  accentColor={campaign.accent_color}
                />
              </div>
            )}

            {/* Product count */}
            <p className="text-sm opacity-60 mt-4">
              {campaign.campaign_products.length} product
              {campaign.campaign_products.length !== 1 ? "s" : ""} in this
              campaign
            </p>

            {/* Decorative line — matches homepage CampaignSection */}
            <div className="flex items-center justify-center gap-3 mt-5">
              <div className="h-px w-20 opacity-30" style={{ backgroundColor: campaign.text_color }} />
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: campaign.accent_color }} />
              <div className="h-px w-20 opacity-30" style={{ backgroundColor: campaign.text_color }} />
            </div>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <main className="container mx-auto px-4 py-12">
        {campaign.campaign_products.length === 0 ? (
          <div className="text-center py-16">
            <h2 className="text-xl font-semibold mb-2">No products available</h2>
            <p className="text-muted-foreground mb-8">
              Check back soon for products in this campaign.
            </p>
            <Link to="/products">
              <Button variant="outline">Browse All Products</Button>
            </Link>
          </div>
        ) : (
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
        )}
      </main>

      <Footer />
    </div>
  );
};

export default CampaignProductsPage;
