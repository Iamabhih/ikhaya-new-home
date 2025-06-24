
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "./useDebounce";

interface UseOptimizedProductsOptions {
  searchQuery: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  page: number;
  pageSize: number;
}

export function useOptimizedProducts({
  searchQuery,
  categoryId,
  minPrice,
  maxPrice,
  inStockOnly,
  page,
  pageSize
}: UseOptimizedProductsOptions) {
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  return useQuery({
    queryKey: [
      'optimized-products',
      debouncedSearchQuery,
      categoryId,
      minPrice,
      maxPrice,
      inStockOnly,
      page,
      pageSize
    ],
    queryFn: async () => {
      console.log('Fetching optimized products with filters:', {
        searchQuery: debouncedSearchQuery,
        categoryId,
        minPrice,
        maxPrice,
        inStockOnly,
        page,
        pageSize
      });

      try {
        // Use the optimized search function
        const { data, error } = await supabase.rpc('search_products', {
          search_query: debouncedSearchQuery || null,
          category_filter: categoryId || null,
          min_price: minPrice || null,
          max_price: maxPrice || null,
          in_stock_only: inStockOnly || null,
          limit_count: pageSize,
          offset_count: (page - 1) * pageSize
        });

        if (error) {
          console.error('Error fetching optimized products:', error);
          throw error;
        }

        // Get total count for pagination
        const { count, error: countError } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        if (countError) {
          console.error('Error fetching product count:', countError);
        }

        return {
          products: data || [],
          totalCount: count || 0,
          hasNextPage: (page * pageSize) < (count || 0)
        };
      } catch (error) {
        console.error('Products query failed:', error);
        throw error;
      }
    },
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
    enabled: true,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
