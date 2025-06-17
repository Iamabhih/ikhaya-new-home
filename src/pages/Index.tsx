
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { OptimizedFeaturedProducts } from "@/components/home/OptimizedFeaturedProducts";
import { OptimizedCategoryGrid } from "@/components/home/OptimizedCategoryGrid";
import { Newsletter } from "@/components/home/Newsletter";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <OptimizedCategoryGrid />
        <OptimizedFeaturedProducts />
        <Newsletter />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
