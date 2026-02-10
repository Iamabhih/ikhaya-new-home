import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MaintenanceBanner } from "@/components/common/MaintenanceBanner";
import { OptimizedFeaturedProducts } from "@/components/home/OptimizedFeaturedProducts";
import { OptimizedCategoryGrid } from "@/components/home/OptimizedCategoryGrid";
import { Newsletter } from "@/components/home/Newsletter";
import { PromotionalBanners } from "@/components/home/PromotionalBanners";
import { ValueProposition } from "@/components/home/ValueProposition";

import { MobileSafeComponent } from "@/components/common/MobileSafeComponent";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Suspense, useEffect } from "react";
import { UniversalLoading } from "@/components/ui/universal-loading";

const Index = () => {
  const { trackEvent } = useAnalytics();

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

      <main>
        {/* Hero Banner - Full viewport hero */}
        <MobileSafeComponent name="Hero Banner">
          <Suspense fallback={<div className="h-[60vh] sm:h-[70vh] lg:h-[80vh] bg-muted/30 animate-pulse" />}>
            <PromotionalBanners />
          </Suspense>
        </MobileSafeComponent>

        {/* Value Proposition Strip */}
        <ValueProposition />

        {/* Shop by Category */}
        <MobileSafeComponent name="Category Grid">
          <Suspense fallback={<UniversalLoading size="lg" className="py-20" />}>
            <OptimizedCategoryGrid />
          </Suspense>
        </MobileSafeComponent>

        {/* Featured Products */}
        <MobileSafeComponent name="Featured Products">
          <Suspense fallback={<UniversalLoading size="lg" className="py-20" />}>
            <OptimizedFeaturedProducts />
          </Suspense>
        </MobileSafeComponent>

        {/* Newsletter Signup */}
        <MobileSafeComponent name="Newsletter">
          <Newsletter />
        </MobileSafeComponent>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
