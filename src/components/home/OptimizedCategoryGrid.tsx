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
      <section className="py-16 sm:py-20 lg:py-24 bg-white">
        <div className="container mx-auto px-6 sm:px-8">
          {/* Section Header - Centered Decofurn style */}
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3">
              Shop by Category
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto mb-6">
              Explore our curated collections for every room in your home
            </p>
            <div className="w-12 h-0.5 bg-secondary mx-auto" />
          </div>

          {/* Category Grid - Clean card layout */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/categories/${category.slug}`}
                className="group relative block overflow-hidden bg-background aspect-[4/3] transition-all duration-300"
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

                {/* Overlay */}
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors duration-300" />

                {/* Content - Centered */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                  <h3 className="font-bold text-white text-sm sm:text-base lg:text-lg uppercase tracking-wider mb-1">
                    {category.name}
                  </h3>
                  <p className="text-white/70 text-xs">
                    {category.product_count} {category.product_count === 1 ? 'item' : 'items'}
                  </p>
                  {/* Underline on hover */}
                  <div className="w-0 group-hover:w-8 h-0.5 bg-white mt-2 transition-all duration-300" />
                </div>
              </Link>
            ))}
          </div>

          {/* CTA - Centered */}
          <div className="mt-10 sm:mt-14 text-center">
            <Link to="/categories">
              <Button
                variant="outline"
                size="lg"
                className="px-10 py-6 text-sm font-semibold uppercase tracking-wider border-foreground text-foreground hover:bg-foreground hover:text-background transition-all"
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
