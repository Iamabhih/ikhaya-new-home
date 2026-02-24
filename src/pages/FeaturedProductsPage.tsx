import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { StandardBreadcrumbs } from "@/components/common/StandardBreadcrumbs";
import { OptimizedProductGrid } from "@/components/products/OptimizedProductGrid";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const FeaturedProductsPage = () => {
  const { settings } = useSiteSettings();
  const [sortBy, setSortBy] = useState("featured");

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["featured-products-full", settings?.hide_products_without_images],
    queryFn: async () => {
      const [manualResult, flaggedResult] = await Promise.all([
        supabase
          .from("homepage_featured_products")
          .select(
            `
            display_order,
            products:product_id(
              *,
              categories:category_id(id, name, slug),
              product_images(image_url, alt_text, is_primary, sort_order)
            )
          `
          )
          .eq("is_active", true)
          .order("display_order", { ascending: true }),

        supabase
          .from("products")
          .select(
            `
            *,
            categories:category_id(id, name, slug),
            product_images(image_url, alt_text, is_primary, sort_order)
          `
          )
          .eq("is_active", true)
          .eq("is_featured", true)
          .order("created_at", { ascending: false }),
      ]);

      const manualProducts = (manualResult.data || [])
        .map((item: any) => item.products)
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

      let finalProducts = combinedProducts;
      if (settings?.hide_products_without_images === true) {
        finalProducts = combinedProducts.filter(
          (p: any) => p.product_images && p.product_images.length > 0
        );
      }

      return finalProducts;
    },
    staleTime: 300000,
    gcTime: 600000,
  });

  const sortedProducts = [...products].sort((a: any, b: any) => {
    switch (sortBy) {
      case "price-asc":
        return (a.price || 0) - (b.price || 0);
      case "price-desc":
        return (b.price || 0) - (a.price || 0);
      case "name":
        return (a.name || "").localeCompare(b.name || "");
      case "newest":
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      default:
        return 0; // featured order preserved
    }
  });

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Featured Products", isActive: true },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="bg-gradient-to-b from-accent/40 via-accent/20 to-background py-16">
        <div className="container mx-auto px-4">
          <StandardBreadcrumbs items={breadcrumbItems} />
          <div className="text-center max-w-2xl mx-auto mt-6">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-secondary mb-3 block">
              Curated for You
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold gradient-text-brand mb-3">
              Featured Products
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto">
              Handpicked selection of quality homeware for every room in your home
            </p>
            <div className="flex items-center justify-center gap-3 mt-4">
              <div className="h-px w-16 bg-secondary/40" />
              <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
              <div className="h-px w-16 bg-secondary/40" />
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-8">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-8">
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Loading..." : `${sortedProducts.length} product${sortedProducts.length !== 1 ? "s" : ""}`}
          </p>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="featured">Featured Order</SelectItem>
              <SelectItem value="name">Name A–Z</SelectItem>
              <SelectItem value="price-asc">Price: Low to High</SelectItem>
              <SelectItem value="price-desc">Price: High to Low</SelectItem>
              <SelectItem value="newest">Newest First</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <OptimizedProductGrid
          products={sortedProducts}
          isLoading={isLoading}
          viewMode="grid"
        />
      </main>

      <Footer />
    </div>
  );
};

export default FeaturedProductsPage;
