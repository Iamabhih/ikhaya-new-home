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
      console.log('Fetching featured categories for homepage');

      const { data: featuredData, error: featuredError } = await supabase
        .from('homepage_featured_categories')
        .select(`
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
        const categoriesWithCounts = await Promise.all(
          featuredData.map(async (item) => {
            const category = item.categories;
            if (!category) return null;

            const { count } = await supabase
              .from('products')
              .select('*', { count: 'exact', head: true })
              .eq('category_id', category.id)
              .eq('is_active', true);

            return {
              ...category,
              product_count: count || 0
            };
          })
        );

        return categoriesWithCounts.filter(Boolean);
      }

      const { data, error } = await supabase
        .from('categories')
        .select(`
          id,
          name,
          slug,
          description,
          image_url,
          sort_order
        `)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(8);

      if (error) {
        console.error('Error fetching categories:', error);
        throw error;
      }

      const categoriesWithCounts = await Promise.all(
        (data || []).map(async (category) => {
          const { count } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', category.id)
            .eq('is_active', true);

          return {
            ...category,
            product_count: count || 0
          };
        })
      );

      return categoriesWithCounts;
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
      <section className="py-16 sm:py-20 lg:py-24 bg-muted/30">
        <div className="container mx-auto px-6 sm:px-8">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10 sm:mb-12">
            <div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2">
                Shop by Category
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base max-w-md">
                Explore our curated collections for every room in your home
              </p>
            </div>
            <Link to="/categories" className="hidden sm:block">
              <Button variant="ghost" className="group text-sm font-medium">
                All Categories
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          {/* Category Grid - Modern Card Layout */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/categories/${category.slug}`}
                className="group relative block overflow-hidden rounded-xl bg-background aspect-[4/3] shadow-sm hover:shadow-lg transition-all duration-300"
              >
                {/* Category Image */}
                {category.image_url ? (
                  <img
                    src={category.image_url}
                    alt={category.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5" />
                )}

                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                {/* Content */}
                <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-5">
                  <h3 className="font-semibold text-white text-base sm:text-lg mb-1 group-hover:translate-y-0 transition-transform">
                    {category.name}
                  </h3>
                  <p className="text-white/80 text-xs sm:text-sm">
                    {category.product_count} {category.product_count === 1 ? 'product' : 'products'}
                  </p>
                </div>

                {/* Hover Arrow */}
                <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                  <ArrowRight className="w-4 h-4 text-white" />
                </div>
              </Link>
            ))}
          </div>

          {/* Mobile CTA */}
          <div className="mt-10 text-center sm:hidden">
            <Link to="/categories">
              <Button variant="outline" size="lg" className="w-full max-w-xs">
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
