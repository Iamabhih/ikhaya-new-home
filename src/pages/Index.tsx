
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { OptimizedFeaturedProducts } from "@/components/home/OptimizedFeaturedProducts";
import { OptimizedCategoryGrid } from "@/components/home/OptimizedCategoryGrid";
import { Newsletter } from "@/components/home/Newsletter";
import { MobileErrorBoundary } from "@/components/common/MobileErrorBoundary";
import { MobileSafeLoader } from "@/components/common/MobileSafeLoader";
import { useIsMobile } from "@/hooks/use-mobile";
import { Suspense } from "react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

const Index = () => {
  const isMobile = useIsMobile();
  
  console.log('[Index Page] Rendering:', { isMobile, userAgent: navigator.userAgent });

  return (
    <MobileErrorBoundary>
      <div className="min-h-screen bg-background">
        <Header />
        <main className={`${isMobile ? 'mobile-optimized' : ''}`}>
          <MobileErrorBoundary>
            <Suspense fallback={
              <div className="h-96 flex items-center justify-center">
                <LoadingSpinner />
              </div>
            }>
              <MobileSafeLoader>
                <HeroSection />
              </MobileSafeLoader>
            </Suspense>
          </MobileErrorBoundary>
          
          <MobileErrorBoundary>
            <Suspense fallback={
              <div className="h-64 flex items-center justify-center">
                <LoadingSpinner />
              </div>
            }>
              <MobileSafeLoader>
                <OptimizedCategoryGrid />
              </MobileSafeLoader>
            </Suspense>
          </MobileErrorBoundary>
          
          <MobileErrorBoundary>
            <Suspense fallback={
              <div className="h-64 flex items-center justify-center">
                <LoadingSpinner />
              </div>
            }>
              <MobileSafeLoader>
                <OptimizedFeaturedProducts />
              </MobileSafeLoader>
            </Suspense>
          </MobileErrorBoundary>
          
          <MobileErrorBoundary>
            <Suspense fallback={
              <div className="h-32 flex items-center justify-center">
                <LoadingSpinner />
              </div>
            }>
              <MobileSafeLoader>
                <Newsletter />
              </MobileSafeLoader>
            </Suspense>
          </MobileErrorBoundary>
        </main>
        <Footer />
      </div>
    </MobileErrorBoundary>
  );
};

export default Index;
