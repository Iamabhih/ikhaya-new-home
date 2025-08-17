
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/products/ProductCard";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ResponsiveGrid, ResponsiveContainer } from "@/components/ui/responsive-layout";
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
        <ResponsiveContainer>
          <h2 className="text-3xl font-bold text-center mb-12">Featured Products</h2>
          <ResponsiveGrid variant="standard">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg" />
            ))}
          </ResponsiveGrid>
        </ResponsiveContainer>
      </section>
    );
  }

  return (
    <section className="py-16 bg-muted/30">
      <ResponsiveContainer>
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Featured Products</h2>
          <p className="text-muted-foreground text-lg">
            Discover our handpicked selection of premium homeware
          </p>
        </div>
        
        <ResponsiveGrid variant="standard" className="mb-8">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </ResponsiveGrid>

        <div className="text-center">
          <Link to="/products">
            <Button size="lg">
              View All Products
            </Button>
          </Link>
        </div>
      </ResponsiveContainer>
    </section>
  );
};
