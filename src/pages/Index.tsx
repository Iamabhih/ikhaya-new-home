import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MaintenanceBanner } from "@/components/common/MaintenanceBanner";
import { HeroSection } from "@/components/home/HeroSection";
import { OptimizedFeaturedProducts } from "@/components/home/OptimizedFeaturedProducts";
import { OptimizedCategoryGrid } from "@/components/home/OptimizedCategoryGrid";
import { Newsletter } from "@/components/home/Newsletter";
import { PromotionalBanners } from "@/components/home/PromotionalBanners";
import { MobileSafeComponent } from "@/components/common/MobileSafeComponent";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Suspense, useEffect } from "react";
import { UniversalLoading } from "@/components/ui/universal-loading";

const Index = () => {
  const { trackEvent } = useAnalytics();

  // Track homepage visit
  useEffect(() => {
    trackEvent({
      event_type: 'page_view',
      event_name: 'homepage_visited',
      page_path: '/',
      metadata: { page_title: 'Homepage' }
    });
  }, [trackEvent]);
  return (
    <div className="min-h-screen bg-background">
      <MaintenanceBanner />
      <Header />
      <main className="pt-12 xs:pt-14 sm:pt-16"> {/* Mobile responsive padding for header */}
        <MobileSafeComponent name="Promotional Banners">
          <Suspense fallback={<UniversalLoading size="lg" />}>
            <PromotionalBanners />
          </Suspense>
        </MobileSafeComponent>
        
        <HeroSection />
        
        <MobileSafeComponent name="Featured Products">
          <Suspense fallback={<UniversalLoading size="lg" />}>
            <OptimizedFeaturedProducts />
          </Suspense>
        </MobileSafeComponent>
        
        <MobileSafeComponent name="Category Grid">
          <Suspense fallback={<UniversalLoading size="lg" />}>
            <OptimizedCategoryGrid />
          </Suspense>
        </MobileSafeComponent>
        
        <MobileSafeComponent name="Newsletter">
          <Newsletter />
        </MobileSafeComponent>
      </main>
      <Footer />
    </div>
  );
};

export default Index;