import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/products/ProductCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Star, ArrowRight, Sparkles } from "lucide-react";
import { UniversalLoading } from "@/components/ui/universal-loading";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export const OptimizedFeaturedProducts = () => {
  const { settings } = useSiteSettings();
  
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['featured-products-optimized', settings?.hide_products_without_images],
    queryFn: async () => {
      console.log('Fetching featured products for homepage');
      
      // First try to fetch from homepage featured products
      let featuredQuery = supabase
        .from('homepage_featured_products')
        .select(`
          products:product_id(
            *,
            categories:category_id(id, name, slug),
            product_images(image_url, alt_text, is_primary, sort_order)
          )
        `)
        .eq('is_active', true);

      // Apply global site setting to hide products without images
      if (settings?.hide_products_without_images === true) {
        featuredQuery = featuredQuery.not('products.product_images', 'is', null);
      }

      const { data: featuredData, error: featuredError } = await featuredQuery
        .order('display_order', { ascending: true });
      
      if (featuredError) {
        console.error('Error fetching featured products:', featuredError);
        throw featuredError;
      }
      
      // If we have featured products, use them
      if (featuredData && featuredData.length > 0) {
        return featuredData.map(item => item.products).filter(Boolean);
      }
      
      // Fallback to products marked as featured if no manual selection
      let fallbackQuery = supabase
        .from('products')
        .select(`
          *,
          categories:category_id(id, name, slug),
          product_images(image_url, alt_text, is_primary, sort_order)
        `)
        .eq('is_active', true)
        .eq('is_featured', true);

      // Apply global site setting to hide products without images
      if (settings?.hide_products_without_images === true) {
        fallbackQuery = fallbackQuery.not('product_images', 'is', null);
      }

      const { data, error } = await fallbackQuery
        .limit(8)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching featured products:', error);
        throw error;
      }
      
      return data || [];
    },
    staleTime: 300000, // Cache for 5 minutes
    gcTime: 600000, // Keep in cache for 10 minutes
  });

  if (isLoading) {
    return (
      <section className="py-8 sm:py-12 md:py-16 lg:py-20 bg-gradient-to-b from-background to-secondary/10">
        <div className="container mx-auto px-4">
          <UniversalLoading 
            variant="grid" 
            count={8} 
            className="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
          />
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 sm:py-12 md:py-16 lg:py-20 bg-gradient-to-b from-background to-secondary/10 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 sm:top-40 right-5 sm:right-10 w-32 sm:w-48 md:w-64 h-32 sm:h-48 md:h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 sm:bottom-20 left-5 sm:left-10 w-24 sm:w-36 md:w-48 h-24 sm:h-36 md:h-48 bg-secondary/15 rounded-full blur-2xl animate-pulse" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <div className="glass-card rounded-full px-4 sm:px-6 py-2 sm:py-3 mb-4 sm:mb-6 shadow-glass hover-glow inline-flex items-center gap-2">
            <Star className="w-3 h-3 sm:w-4 sm:h-4 text-secondary animate-pulse" />
            <span className="text-xs sm:text-sm font-medium gradient-text-brand">
              Handpicked Selection
            </span>
          </div>
          
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 gradient-text-brand">
            Featured Products
          </h2>
          <p className="text-premium text-sm sm:text-base md:text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed px-2 sm:px-0">
            Discover our carefully curated selection of premium homeware that combines style, quality, and functionality
          </p>
        </div>
        
        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6 mb-8 sm:mb-12">
          {products.map((product, index) => (
            <div 
              key={product.id}
              className="opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'forwards' }}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center px-4 sm:px-0">
          <Card className="glass-card inline-block border-0 shadow-premium hover-lift">
            <div className="p-4 sm:p-6 md:p-8">
              <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4 flex-wrap">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-secondary animate-pulse" />
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold gradient-text-primary text-center">Explore Our Full Collection</h3>
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-secondary animate-pulse" />
              </div>
              <p className="text-premium-muted mb-4 sm:mb-6 max-w-md mx-auto text-sm sm:text-base">
                Browse through hundreds of carefully selected products to find exactly what you need for your home
              </p>
              <Link to="/products">
                <Button 
                  variant="premium"
                  size="lg" 
                  className="hover-glow group px-6 sm:px-8 py-3 sm:py-4 w-full sm:w-auto text-sm sm:text-base"
                >
                  View All Products
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform duration-300" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};