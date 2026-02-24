import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { OptimizedProductGrid } from "@/components/products/OptimizedProductGrid";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { UniversalLoading } from "@/components/ui/universal-loading";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export const OptimizedFeaturedProducts = () => {
  const { settings } = useSiteSettings();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['featured-products-optimized', settings?.hide_products_without_images],
    queryFn: async () => {
      console.log('Fetching featured products for homepage (hybrid approach)');

      const [manualResult, flaggedResult] = await Promise.all([
        supabase
          .from('homepage_featured_products')
          .select(`
            display_order,
            products:product_id(
              *,
              categories:category_id(id, name, slug),
              product_images(image_url, alt_text, is_primary, sort_order)
            )
          `)
          .eq('is_active', true)
          .order('display_order', { ascending: true }),

        supabase
          .from('products')
          .select(`
            *,
            categories:category_id(id, name, slug),
            product_images(image_url, alt_text, is_primary, sort_order)
          `)
          .eq('is_active', true)
          .eq('is_featured', true)
          .order('created_at', { ascending: false })
          .limit(16)
      ]);

      if (manualResult.error) {
        console.error('Error fetching manual featured products:', manualResult.error);
      }
      if (flaggedResult.error) {
        console.error('Error fetching flagged featured products:', flaggedResult.error);
      }

      const manualProducts = (manualResult.data || [])
        .map(item => item.products)
        .filter(Boolean);

      const flaggedProducts = flaggedResult.data || [];

      const seenIds = new Set<string>();
      const combinedProducts: any[] = [];

      for (const product of manualProducts) {
        if (product && !seenIds.has(product.id)) {
          seenIds.add(product.id);
          combinedProducts.push(product);
        }
      }

      for (const product of flaggedProducts) {
        if (product && !seenIds.has(product.id)) {
          seenIds.add(product.id);
          combinedProducts.push(product);
        }
      }

      console.log(`Found ${manualProducts.length} manual + ${flaggedProducts.length} flagged = ${combinedProducts.length} unique featured products`);

      let finalProducts = combinedProducts;
      if (settings?.hide_products_without_images === true) {
        finalProducts = combinedProducts.filter((p: any) => p.product_images && p.product_images.length > 0);
      }

      return finalProducts.slice(0, 8);
    },
    staleTime: 300000,
    gcTime: 600000,
  });

  if (isLoading) {
    return (
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="container mx-auto px-6 sm:px-8">
          <UniversalLoading
            variant="grid"
            count={8}
            className="grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
          />
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-accent/40 via-accent/20 to-background border-t border-border/30">
      <div className="container mx-auto px-6 sm:px-8">
        {/* Section Header */}
        <div className="text-center mb-10 sm:mb-14">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-secondary mb-3 block">Curated for You</span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold gradient-text-brand mb-3">
            Featured Products
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto mb-4">
            Handpicked selection of quality homeware for every room in your home
          </p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="h-px w-16 bg-secondary/40" />
            <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
            <div className="h-px w-16 bg-secondary/40" />
          </div>
        </div>

        {/* Product Grid */}
        <OptimizedProductGrid
          products={products as any[]}
          isLoading={false}
          viewMode="grid"
        />

        {/* CTA - Centered */}
        <div className="mt-10 sm:mt-14 text-center">
          <Link to="/products">
            <Button
              size="lg"
              className="px-10 py-6 text-sm font-semibold uppercase tracking-wider bg-foreground text-background hover:bg-foreground/90 border-none transition-all"
            >
              View All Products
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
