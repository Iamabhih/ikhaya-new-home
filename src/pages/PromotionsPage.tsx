import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { StandardBreadcrumbs } from "@/components/common/StandardBreadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileText, Calendar, Eye, Store, Users, Share2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { PDFPreview } from "@/components/common/PDFPreview";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

type PromotionType = "all" | "trader" | "retail";

const PromotionsPage = () => {
  const { settings, isLoading: settingsLoading } = useSiteSettings();
  const [activeTab, setActiveTab] = useState<PromotionType>("all");

  const { data: promotions, isLoading } = useQuery({
    queryKey: ['weekly-promotions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_promotions')
        .select('*')
        .eq('is_active', true)
        .order('week_start_date', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const updateDownloadCount = async (promotionId: string) => {
    try {
      const { data: current } = await supabase
        .from('weekly_promotions')
        .select('download_count')
        .eq('id', promotionId)
        .single();

      if (current) {
        await supabase
          .from('weekly_promotions')
          .update({ download_count: (current.download_count || 0) + 1 })
          .eq('id', promotionId);
      }
    } catch (error) {
      // Silently handle error
    }
  };

  const handleDownload = async (promotion: any) => {
    try {
      await updateDownloadCount(promotion.id);
      window.open(promotion.file_url, '_blank');
    } catch {
      window.open(promotion.file_url, '_blank');
    }
  };

  const handleShare = async (promotion: any) => {
    const shareData = {
      title: promotion.title,
      text: promotion.description || `Check out this promotion: ${promotion.title}`,
      url: promotion.file_url,
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast({ title: "Shared!", description: "Promotion shared successfully" });
      } else {
        // Fallback: copy link to clipboard
        await navigator.clipboard.writeText(promotion.file_url);
        toast({ title: "Link Copied!", description: "Promotion link copied to clipboard" });
      }
    } catch (error) {
      // User cancelled or error
      if ((error as Error).name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(promotion.file_url);
          toast({ title: "Link Copied!", description: "Promotion link copied to clipboard" });
        } catch {
          toast({ title: "Error", description: "Failed to share promotion", variant: "destructive" });
        }
      }
    }
  };

  // Filter promotions based on type using the promotion_type field
  const filterPromotions = (promos: any[] | undefined, type: PromotionType) => {
    if (!promos) return [];
    if (type === "all") return promos;

    return promos.filter(promo => {
      const promoType = promo.promotion_type || 'retail';
      return promoType.toLowerCase() === type;
    });
  };

  const filteredPromotions = filterPromotions(promotions, activeTab);

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Promotions", isActive: true }
  ];

  if (settingsLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-16 flex items-center justify-center min-h-[50vh]">
          <LoadingSpinner />
        </main>
        <Footer />
      </div>
    );
  }

  if (!settings?.promotions_page_enabled) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-16 container mx-auto px-4 py-8">
          <StandardBreadcrumbs items={breadcrumbItems} />
          <div className="text-center py-12">
            <h1 className="text-3xl font-bold mb-4">Promotions</h1>
            <p className="text-muted-foreground">Promotions are currently not available.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const pageTitle = settings?.promotions_page_title || "Weekly Promotions";
  const pageDescription = settings?.promotions_page_description || "Check out our latest weekly promotions and special offers!";

  const PromotionCard = ({ promotion }: { promotion: any }) => (
    <Card className="hover:shadow-lg transition-shadow duration-300 group">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold mb-2">
              {promotion.title}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Calendar className="h-4 w-4" />
              <span>
                {format(new Date(promotion.week_start_date), 'MMM d')} - {format(new Date(promotion.week_end_date), 'MMM d, yyyy')}
              </span>
            </div>
          </div>
          <Badge variant="secondary" className="ml-2">
            {promotion.file_type.toUpperCase()}
          </Badge>
        </div>
        {promotion.description && (
          <CardDescription className="text-sm">
            {promotion.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {promotion.file_type.toLowerCase() === 'pdf' && (
          <div className="flex justify-center">
            <PDFPreview
              fileUrl={promotion.file_url}
              fileName={promotion.title}
              width={280}
              height={200}
              className="border border-border/60"
            />
          </div>
        )}

        {['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(promotion.file_type.toLowerCase()) && (
          <div className="flex justify-center">
            <img
              src={promotion.file_url}
              alt={promotion.title}
              className="w-full max-w-[280px] h-[200px] object-cover rounded-md border border-border/60"
              loading="lazy"
            />
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{promotion.download_count || 0} downloads</span>
            {promotion.file_size && (
              <span>{(promotion.file_size / 1024 / 1024).toFixed(1)} MB</span>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => handleDownload(promotion)}
              className="flex-1"
              size="sm"
            >
              <Eye className="h-4 w-4 mr-2" />
              View
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleShare(promotion)}
              title="Share"
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload(promotion)}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const EmptyState = ({ type }: { type: PromotionType }) => {
    const messages = {
      all: "Check back soon for our latest weekly promotions and special offers!",
      trader: "No trader promotions available at the moment. Check back soon!",
      retail: "No retail promotions available at the moment. Check back soon!"
    };

    return (
      <div className="text-center py-12">
        <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">No Active Promotions</h3>
        <p className="text-muted-foreground">{messages[type]}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <title>{pageTitle} - OZZ Cash & Carry</title>
      <meta name="description" content={pageDescription} />
      <meta name="keywords" content="promotions, weekly specials, discounts, homeware offers, OZZ, trader, retail" />
      <meta property="og:title" content={`${pageTitle} - OZZ Cash & Carry`} />
      <meta property="og:description" content={pageDescription} />

      <Header />
      <main className="pt-16 pb-8">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <StandardBreadcrumbs items={breadcrumbItems} />

          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 text-foreground">{pageTitle}</h1>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              {pageDescription}
            </p>
          </div>

          {/* Promotion Type Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as PromotionType)} className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-8">
              <TabsTrigger value="all" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">All</span>
              </TabsTrigger>
              <TabsTrigger value="trader" className="flex items-center gap-2">
                <Store className="h-4 w-4" />
                <span className="hidden sm:inline">Trader</span>
              </TabsTrigger>
              <TabsTrigger value="retail" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Retail</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              {filteredPromotions.length === 0 ? (
                <EmptyState type="all" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPromotions.map((promotion) => (
                    <PromotionCard key={promotion.id} promotion={promotion} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="trader">
              <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Store className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold text-lg">Trader Promotions</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Exclusive deals for registered traders and wholesale customers.
                </p>
              </div>
              {filteredPromotions.length === 0 ? (
                <EmptyState type="trader" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPromotions.map((promotion) => (
                    <PromotionCard key={promotion.id} promotion={promotion} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="retail">
              <div className="mb-6 p-4 bg-secondary/20 rounded-lg border border-secondary/40">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold text-lg">Retail Promotions</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Special offers available for all our retail customers.
                </p>
              </div>
              {filteredPromotions.length === 0 ? (
                <EmptyState type="retail" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPromotions.map((promotion) => (
                    <PromotionCard key={promotion.id} promotion={promotion} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="mt-12 text-center">
            <Card className="max-w-2xl mx-auto">
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-2">Stay Updated</h3>
                <p className="text-muted-foreground text-sm">
                  New promotions are added weekly. Follow us on social media or subscribe to our newsletter to never miss a deal!
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PromotionsPage;
