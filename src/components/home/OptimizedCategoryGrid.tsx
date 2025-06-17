
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const OptimizedCategoryGrid = () => {
  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories-optimized-home'],
    queryFn: async () => {
      console.log('Fetching optimized categories for homepage');
      
      const { data, error } = await supabase
        .from('category_product_counts')
        .select('*')
        .order('product_count', { ascending: false })
        .limit(8);
      
      if (error) {
        console.error('Error fetching categories:', error);
        throw error;
      }
      
      return data;
    },
    staleTime: 600000, // Cache for 10 minutes
    gcTime: 1200000, // Keep in cache for 20 minutes
  });

  if (isLoading) {
    return (
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Shop by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <Skeleton className="h-16 w-16 rounded-full mx-auto mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-3 w-3/4 mx-auto" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">Shop by Category</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {categories?.map((category) => (
            <Link key={category.id} to={`/category/${category.slug}`}>
              <Card className="hover:shadow-lg transition-shadow duration-300 group">
                <CardContent className="p-6 text-center">
                  <div className="bg-primary/10 h-16 w-16 rounded-full mx-auto mb-4 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <span className="text-2xl font-bold text-primary">
                      {category.name.charAt(0)}
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {category.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    {category.product_count} products
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
