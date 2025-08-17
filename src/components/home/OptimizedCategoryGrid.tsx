import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { UniversalLoading } from "@/components/ui/universal-loading";

export const OptimizedCategoryGrid = () => {
  const { data: categories, isLoading, error } = useQuery({
    queryKey: ['categories-optimized-home'],
    queryFn: async () => {
      console.log('Fetching featured categories for homepage');
      
      // First try to fetch from homepage featured categories
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
      
      // If we have featured categories, use them
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
      
      // Fallback to regular categories if no featured categories are set
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
      
      // Get product counts for each category
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
    staleTime: 600000, // Cache for 10 minutes
    gcTime: 1200000, // Keep in cache for 20 minutes
  });

  if (error) {
    console.error('Category grid error:', error);
    return (
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Shop by Category</h2>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Unable to load categories. Please try again later.</p>
          </div>
        </div>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="py-8 sm:py-12 md:py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">Shop by Category</h2>
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
    return (
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Shop by Category</h2>
          <div className="text-center py-8">
            <p className="text-muted-foreground">No categories available at the moment.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <ErrorBoundary>
      <section className="py-8 sm:py-12 md:py-16 premium-spacing">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-12 gradient-text-brand">Shop by Category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
            {categories.map((category) => (
              <Link key={category.id} to={`/categories/${category.slug}`}>
                <Card className="glass-card hover-lift group border-0 shadow-soft">
                  <CardContent className="p-3 sm:p-4 md:p-6 text-center">
                    <div className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 lg:h-28 lg:w-28 rounded-full mx-auto mb-3 sm:mb-4 overflow-hidden group-hover:scale-105 transition-transform">
                      {category.image_url ? (
                        <img 
                          src={category.image_url} 
                          alt={category.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="bg-primary/10 h-full w-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <span className="text-lg sm:text-xl md:text-2xl font-bold text-primary">
                            {category.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <h3 className="font-semibold text-premium group-hover:text-primary transition-colors duration-300 text-sm sm:text-base">
                      {category.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-premium-muted mt-1 sm:mt-2">
                      {category.product_count} products
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </ErrorBoundary>
  );
};