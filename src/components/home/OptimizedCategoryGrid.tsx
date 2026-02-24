import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { UniversalLoading } from "@/components/ui/universal-loading";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const OptimizedCategoryGrid = () => {
  const { data: categories, isLoading, error } = useQuery({
    queryKey: ['categories-optimized-home'],
    queryFn: async () => {
      // Check for featured categories first
      const { data: featuredData, error: featuredError } = await supabase
        .from('homepage_featured_categories')
        .select(`
          display_order,
          categories:category_id(
            id,
            name,
            slug,
            description,
            image_url
          )
        `)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (featuredError) {
        console.error('Error fetching featured categories:', featuredError);
        throw featuredError;
      }

      if (featuredData && featuredData.length > 0) {
        // Extract category IDs from featured list
        const categoryIds = featuredData
          .map((item) => item.categories?.id)
          .filter(Boolean) as string[];

        // Single aggregated query for product counts across all featured categories
        const { data: countData } = await supabase
          .from('products')
          .select('category_id')
          .in('category_id', categoryIds)
          .eq('is_active', true);

        const countMap: Record<string, number> = {};
        (countData || []).forEach((p) => {
          if (p.category_id) countMap[p.category_id] = (countMap[p.category_id] || 0) + 1;
        });

        return featuredData
          .map((item) => {
            const category = item.categories;
            if (!category) return null;
            return { ...category, product_count: countMap[category.id] || 0 };
          })
          .filter(Boolean);
      }

      // Fallback: all active categories (single query with aggregated count)
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, description, image_url, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(8);

      if (error) {
        console.error('Error fetching categories:', error);
        throw error;
      }

      const categoryIds = (data || []).map((c) => c.id);

      // Single aggregated count query — replaces N separate queries
      const { data: countData } = await supabase
        .from('products')
        .select('category_id')
        .in('category_id', categoryIds)
        .eq('is_active', true);

      const countMap: Record<string, number> = {};
      (countData || []).forEach((p) => {
        if (p.category_id) countMap[p.category_id] = (countMap[p.category_id] || 0) + 1;
      });

      return (data || []).map((category) => ({
        ...category,
        product_count: countMap[category.id] || 0,
      }));
    },
    staleTime: 600000,
    gcTime: 1200000,
  });

  if (error) {
    console.error('Category grid error:', error);
    return null;
  }

  if (isLoading) {
    return (
      <section className="py-16 sm:py-20 lg:py-24 bg-muted/30">
        <div className="container mx-auto px-6 sm:px-8">
          <UniversalLoading
            variant="grid"
            count={8}
            className="grid-cols-2 md:grid-cols-4"
          />
        </div>
      </section>
    );
  }

  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <ErrorBoundary>
      <section className="py-16 sm:py-20 lg:py-24 bg-background">
        <div className="container mx-auto px-6 sm:px-8">
          {/* Section Header */}
          <div className="text-center mb-10 sm:mb-14">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-secondary mb-3 block">Collections</span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold gradient-text-brand mb-3">
              Shop by Category
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto mb-4">
              Explore our curated collections for every room in your home
            </p>
            <div className="flex items-center justify-center gap-3 mt-4">
              <div className="h-px w-16 bg-secondary/40" />
              <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
              <div className="h-px w-16 bg-secondary/40" />
            </div>
          </div>

          {/* Category Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/categories/${category.slug}`}
                className="group relative block overflow-hidden rounded-xl bg-background aspect-[4/3] transition-all duration-500 touch-manipulation shadow-modern-sm hover:shadow-modern-lg hover:-translate-y-1 border border-white/0 hover:border-secondary/30"
              >
                {/* Category Image */}
                {category.image_url ? (
                  <img
                    src={category.image_url}
                    alt={category.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 bg-muted" />
                )}

                {/* Overlay - gradient from bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent group-hover:from-black/70 transition-all duration-500" />

                {/* Content - Bottom aligned */}
                <div className="absolute inset-0 flex flex-col items-center justify-end text-center p-4 pb-5">
                  <h3 className="font-bold text-white text-sm sm:text-base lg:text-lg uppercase tracking-wider mb-1 drop-shadow-md">
                    {category.name}
                  </h3>
                  <span className="inline-block px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs mt-1">
                    {category.product_count} {category.product_count === 1 ? 'item' : 'items'}
                  </span>
                  {/* Underline on hover */}
                  <div className="w-0 group-hover:w-12 h-0.5 bg-secondary mt-2.5 transition-all duration-500 rounded-full" />
                </div>
              </Link>
            ))}
          </div>

          {/* CTA - Centered */}
          <div className="mt-10 sm:mt-14 text-center">
            <Link to="/categories">
              <Button
                size="lg"
                className="px-10 py-6 text-sm font-semibold uppercase tracking-wider bg-secondary text-secondary-foreground hover:bg-secondary-glow border-none shadow-glow hover:shadow-glow transition-all"
              >
                View All Categories
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </ErrorBoundary>
  );
};
