
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { OptimizedFeaturedProducts } from "@/components/home/OptimizedFeaturedProducts";
import { OptimizedCategoryGrid } from "@/components/home/OptimizedCategoryGrid";
import { Newsletter } from "@/components/home/Newsletter";
import { MobileErrorBoundary } from "@/components/common/MobileErrorBoundary";
import { MobileSafeComponent } from "@/components/common/MobileSafeComponent";
import { useIsMobile } from "@/hooks/use-mobile";

const Index = () => {
  const isMobile = useIsMobile();
  
  console.log('[Index Page] Rendering:', { isMobile, userAgent: navigator.userAgent });

  return (
    <MobileErrorBoundary>
      <div className="min-h-screen bg-background">
        <Header />
        <main className={`${isMobile ? 'mobile-optimized' : ''}`}>
          <MobileSafeComponent name="Hero Section">
            <HeroSection />
          </MobileSafeComponent>
          
          <MobileSafeComponent name="Category Grid">
            <OptimizedCategoryGrid />
          </MobileSafeComponent>
          
          <MobileSafeComponent name="Featured Products">
            <OptimizedFeaturedProducts />
          </MobileSafeComponent>
          
          <MobileSafeComponent name="Newsletter">
            <Newsletter />
          </MobileSafeComponent>
        </main>
        <Footer />
      </div>
    </MobileErrorBoundary>
  );
};

export default Index;
