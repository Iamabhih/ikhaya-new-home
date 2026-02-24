import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Flame } from "lucide-react";
import { UniversalLoading } from "@/components/ui/universal-loading";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { CampaignProductCard, CountdownTimer } from "@/components/campaigns/CampaignProductCard";
import type { CampaignProduct } from "@/components/campaigns/CampaignProductCard";

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
                <div className="inline-flex items-center gap-2 mb-6">
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
                  <div className="h-px w-20 opacity-30" style={{ backgroundColor: campaign.text_color }} />
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: campaign.accent_color }}
                  />
                  <div className="h-px w-20 opacity-30" style={{ backgroundColor: campaign.text_color }} />
                </div>
              </div>

              {/* Product Grid — show up to 8 on homepage */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {campaign.campaign_products.slice(0, 8).map((item: CampaignProduct) => (
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
                <Link to={`/campaigns/${campaign.id}`}>
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
                    View All {campaign.name} Products
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
