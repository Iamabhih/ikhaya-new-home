import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/products/ProductCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Star, ArrowRight, Sparkles } from "lucide-react";

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
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-4">
              <div className="w-4 h-4 bg-primary/20 rounded animate-pulse" />
              <div className="w-20 h-3 bg-primary/20 rounded animate-pulse" />
            </div>
            <div className="w-80 h-10 bg-secondary/20 rounded mx-auto mb-4 animate-pulse" />
            <div className="w-96 h-6 bg-secondary/15 rounded mx-auto animate-pulse" />
          </div>

          {/* Loading Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="border-0 bg-white/50 backdrop-blur-sm shadow-lg overflow-hidden animate-pulse">
                <div className="h-64 bg-gradient-to-br from-secondary/20 to-secondary/40" />
                <div className="p-6 space-y-3">
                  <div className="h-4 bg-secondary/30 rounded animate-pulse" />
                  <div className="h-3 bg-secondary/20 rounded w-3/4 animate-pulse" />
                  <div className="h-5 bg-secondary/30 rounded w-1/2 animate-pulse" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-gradient-to-b from-background to-secondary/10 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-40 right-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse delay-300" />
        <div className="absolute bottom-20 left-10 w-48 h-48 bg-secondary/15 rounded-full blur-2xl animate-pulse delay-700" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 backdrop-blur-sm rounded-full px-6 py-3 mb-6 border border-primary/20">
            <Star className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-sm font-medium text-primary">
              Handpicked Selection
            </span>
          </div>
          
          <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary via-primary/90 to-secondary bg-clip-text text-transparent">
            Featured Products
          </h2>
          <p className="text-muted-foreground text-xl max-w-2xl mx-auto leading-relaxed">
            Discover our carefully curated selection of premium homeware that combines style, quality, and functionality
          </p>
        </div>
        
        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
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
          <Card className="inline-block border-0 bg-white/20 backdrop-blur-md shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105">
            <div className="p-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                <h3 className="text-2xl font-bold">Explore Our Full Collection</h3>
                <Sparkles className="w-6 h-6 text-primary animate-pulse" />
              </div>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Browse through hundreds of carefully selected products to find exactly what you need for your home
              </p>
              <Link to="/products">
                <Button 
                  size="lg" 
                  className="bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group px-8 py-4"
                >
                  View All Products
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out;
        }
      `}</style>
    </section>
  );
};