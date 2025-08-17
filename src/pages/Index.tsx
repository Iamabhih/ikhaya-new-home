import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { OptimizedFeaturedProducts } from "@/components/home/OptimizedFeaturedProducts";
import { OptimizedCategoryGrid } from "@/components/home/OptimizedCategoryGrid";
import { Newsletter } from "@/components/home/Newsletter";
import { PromotionalBanners } from "@/components/home/PromotionalBanners";
import { MobileSafeComponent } from "@/components/common/MobileSafeComponent";
import { Suspense } from "react";
import { UniversalLoading } from "@/components/ui/universal-loading";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-14 sm:pt-16"> {/* Add padding-top to account for fixed header */}
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