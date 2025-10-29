import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { StandardBreadcrumbs } from "@/components/common/StandardBreadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, FileText, Calendar, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { PDFPreview } from "@/components/common/PDFPreview";
import { format } from "date-fns";

const PromotionsPage = () => {
  const { settings, isLoading: settingsLoading } = useSiteSettings();
  
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
      // Simple update approach - get current value and increment
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
      console.error('Error updating download count:', error);
    }
  };

  const handleDownload = async (promotion: any) => {
    try {
      await updateDownloadCount(promotion.id);
      
      // Open the file in a new tab for viewing/downloading
      window.open(promotion.file_url, '_blank');
    } catch (error) {
      console.error('Error tracking download:', error);
      // Still allow download even if tracking fails
      window.open(promotion.file_url, '_blank');
    }
  };

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

  // Check if promotions are enabled
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

  return (
    <div className="min-h-screen bg-background">
      {/* SEO Meta Tags */}
      <title>{pageTitle} - OZZ Cash & Carry</title>
      <meta name="description" content={pageDescription} />
      <meta name="keywords" content="promotions, weekly specials, discounts, homeware offers, OZZ" />
      <meta property="og:title" content={`${pageTitle} - OZZ Cash & Carry`} />
      <meta property="og:description" content={pageDescription} />
      
      <Header />
      <main className="pt-16 pb-8">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <StandardBreadcrumbs items={breadcrumbItems} />
          
          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 text-foreground">{pageTitle}</h1>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              {pageDescription}
            </p>
          </div>

          {/* Promotions Grid */}
          {!promotions || promotions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Active Promotions</h3>
              <p className="text-muted-foreground">
                Check back soon for our latest weekly promotions and special offers!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {promotions.map((promotion) => (
                <Card key={promotion.id} className="hover:shadow-lg transition-shadow duration-300 group">
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
                    {/* PDF Preview */}
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
                    
                    {/* Image Preview */}
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
                          onClick={() => handleDownload(promotion)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Additional Info */}
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