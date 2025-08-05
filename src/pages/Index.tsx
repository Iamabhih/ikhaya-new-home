
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { PromotionalBanners } from "@/components/home/PromotionalBanners";
import { OptimizedFeaturedProducts } from "@/components/home/OptimizedFeaturedProducts";
import { OptimizedCategoryGrid } from "@/components/home/OptimizedCategoryGrid";
import { Newsletter } from "@/components/home/Newsletter";
import { MobileErrorBoundary } from "@/components/common/MobileErrorBoundary";
import { MobileSafeComponent } from "@/components/common/MobileSafeComponent";
import { useIsMobile } from "@/hooks/use-mobile";
import { Suspense } from "react";
import { UniversalLoading } from "@/components/ui/universal-loading";

const Index = () => {
  const isMobile = useIsMobile();
  
  console.log('[Index Page] Rendering:', { isMobile, userAgent: navigator.userAgent });

  return (
    <MobileErrorBoundary>
      <div className="min-h-screen bg-background">
        <Header />
        <main className={`${isMobile ? 'mobile-optimized' : ''}`}>
          <Suspense fallback={<UniversalLoading variant="spinner" text="Loading banners..." />}>
            <MobileSafeComponent name="Promotional Banners">
              <PromotionalBanners />
            </MobileSafeComponent>
          </Suspense>
          
          <Suspense fallback={<UniversalLoading variant="page" />}>
            <MobileSafeComponent name="Hero Section">
              <HeroSection />
            </MobileSafeComponent>
          </Suspense>
          
          <Suspense fallback={<UniversalLoading variant="grid" count={8} className="grid-cols-2 md:grid-cols-4" />}>
            <MobileSafeComponent name="Category Grid">
              <OptimizedCategoryGrid />
            </MobileSafeComponent>
          </Suspense>

          <Suspense fallback={<UniversalLoading variant="grid" count={8} className="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" />}>
            <MobileSafeComponent name="Featured Products">
              <OptimizedFeaturedProducts />
            </MobileSafeComponent>
          </Suspense>

          <Suspense fallback={<UniversalLoading variant="card" />}>
            <MobileSafeComponent name="Newsletter">
              <Newsletter />
            </MobileSafeComponent>
          </Suspense>
        </main>
        <Footer />
      </div>
    </MobileErrorBoundary>
  );
};

export default Index;
