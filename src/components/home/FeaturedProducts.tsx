
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/products/ProductCard";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export const FeaturedProducts = () => {
  const { settings } = useSiteSettings();
  
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['featured-products', settings?.hide_products_without_images],
    queryFn: async () => {
      let query = supabase
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
        query = query.not('product_images', 'is', null);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(8);
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Featured Products</h2>
          <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 xs:gap-3 sm:gap-4 md:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-48 xs:h-56 sm:h-64 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Featured Products</h2>
          <p className="text-muted-foreground text-lg">
            Discover our handpicked selection of premium homeware
          </p>
        </div>
        
        <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 xs:gap-3 sm:gap-4 md:gap-6 mb-8">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="text-center">
          <Link to="/products">
            <Button size="lg">
              View All Products
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
