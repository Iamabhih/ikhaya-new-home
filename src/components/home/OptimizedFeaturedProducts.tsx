import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/products/ProductCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Star, ArrowRight, Sparkles } from "lucide-react";
import { UniversalLoading } from "@/components/ui/universal-loading";

export const OptimizedFeaturedProducts = () => {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['featured-products-optimized'],
    queryFn: async () => {
      console.log('Fetching featured products for homepage');
      
      // First try to fetch from homepage featured products
      const { data: featuredData, error: featuredError } = await supabase
        .from('homepage_featured_products')
        .select(`
          products:product_id(
            *,
            categories:category_id(id, name, slug),
            product_images(image_url, alt_text, is_primary, sort_order)
          )
        `)
        .eq('is_active', true)
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
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories:category_id(id, name, slug),
          product_images(image_url, alt_text, is_primary, sort_order)
        `)
        .eq('is_active', true)
        .eq('is_featured', true)
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
      <section className="py-20 bg-gradient-to-b from-background to-secondary/10">
        <div className="container mx-auto px-4">
          <UniversalLoading 
            variant="grid" 
            count={8} 
            className="grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
          />
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-gradient-to-b from-background to-secondary/10 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-40 right-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-10 w-48 h-48 bg-secondary/15 rounded-full blur-2xl animate-pulse" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="glass-card rounded-full px-6 py-3 mb-6 shadow-glass hover-glow">
            <Star className="w-4 h-4 text-secondary animate-pulse" />
            <span className="text-sm font-medium gradient-text-brand">
              Handpicked Selection
            </span>
          </div>
          
          <h2 className="text-5xl font-bold mb-6 gradient-text-brand">
            Featured Products
          </h2>
          <p className="text-premium text-xl max-w-2xl mx-auto leading-relaxed">
            Discover our carefully curated selection of premium homeware that combines style, quality, and functionality
          </p>
        </div>
        
        {/* Products Grid */}
        <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 xs:gap-3 sm:gap-4 md:gap-6 mb-12">
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
        <div className="text-center">
          <Card className="glass-card inline-block border-0 shadow-premium hover-lift">
            <div className="p-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Sparkles className="w-6 h-6 text-secondary animate-pulse" />
                <h3 className="text-2xl font-bold gradient-text-primary">Explore Our Full Collection</h3>
                <Sparkles className="w-6 h-6 text-secondary animate-pulse" />
              </div>
              <p className="text-premium-muted mb-6 max-w-md mx-auto">
                Browse through hundreds of carefully selected products to find exactly what you need for your home
              </p>
              <Link to="/products">
                <Button 
                  variant="premium"
                  size="lg" 
                  className="hover-glow group px-8 py-4"
                >
                  View All Products
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};