import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/products/ProductCard";
import { AutocompleteSearch } from "@/components/products/AutocompleteSearch";
import { FacetedFilters } from "@/components/products/FacetedFilters";
import { VirtualizedProductGrid } from "@/components/products/VirtualizedProductGrid";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Grid, List, ChevronLeft, ChevronRight, SlidersHorizontal, Search, Filter } from "lucide-react";
import { StandardBreadcrumbs } from "@/components/common/StandardBreadcrumbs";
import { StandardPagination } from "@/components/common/StandardPagination";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";
import { UniversalLoading } from "@/components/ui/universal-loading";

const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [sortBy, setSortBy] = useState("name");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [facetedFilters, setFacetedFilters] = useState<{
    categories?: string[];
    brands?: string[];
    ratings?: number[];
    priceRanges?: string[];
    inStock?: boolean;
  }>({});
  const itemsPerPage = 20;
  
  const { settings } = useSiteSettings();

  // Update search query when URL changes
  useEffect(() => {
    const urlSearch = searchParams.get("search");
    if (urlSearch && urlSearch !== searchQuery) {
      setSearchQuery(urlSearch);
    }
  }, [searchParams]);

  // Parse price ranges from faceted filters
  const priceRange = (() => {
    if (!facetedFilters.priceRanges?.length) return {};
    
    let minPrice: number | undefined;
    let maxPrice: number | undefined;
    
    facetedFilters.priceRanges.forEach(range => {
      if (range === "0-100") {
        minPrice = Math.min(minPrice || Infinity, 0);
        maxPrice = Math.max(maxPrice || 0, 100);
      } else if (range === "100-500") {
        minPrice = Math.min(minPrice || Infinity, 100);
        maxPrice = Math.max(maxPrice || 0, 500);
      } else if (range === "500-1000") {
        minPrice = Math.min(minPrice || Infinity, 500);
        maxPrice = Math.max(maxPrice || 0, 1000);
      } else if (range === "1000-2000") {
        minPrice = Math.min(minPrice || Infinity, 1000);
        maxPrice = Math.max(maxPrice || 0, 2000);
      } else if (range === "2000+") {
        minPrice = Math.min(minPrice || Infinity, 2000);
      }
    });
    
    return { min: minPrice, max: maxPrice };
  })();

  // Check if filters are active to determine loading strategy
  const hasActiveFilters = searchQuery.trim() || 
    facetedFilters.categories?.length || 
    facetedFilters.brands?.length ||
    priceRange.min !== undefined || 
    priceRange.max !== undefined || 
    facetedFilters.inStock;

  // For filtered results, load all matching products
  // For unfiltered results, use pagination
  const shouldLoadAll = hasActiveFilters;

  // Enhanced query with proper sorting and filtering
  const { data: productsData, isLoading } = useQuery({
    queryKey: [
      'products-filtered',
      searchQuery,
      facetedFilters.categories,
      facetedFilters.brands,
      priceRange.min,
      priceRange.max,
      facetedFilters.inStock,
      sortBy,
      shouldLoadAll ? 'all' : currentPage,
      shouldLoadAll ? 'all' : itemsPerPage,
      settings?.hide_products_without_images
    ],
    queryFn: async () => {
      console.log('Fetching products with filters:', {
        searchQuery,
        categories: facetedFilters.categories,
        brands: facetedFilters.brands,
        priceRange,
        inStock: facetedFilters.inStock,
        sortBy,
        page: shouldLoadAll ? 'all' : currentPage,
        loadAll: shouldLoadAll,
        hideWithoutImages: settings?.hide_products_without_images
      });

      let query = supabase
        .from('products')
        .select(`
          *,
          categories:category_id(id, name, slug),
          product_images(id, image_url, alt_text, is_primary, sort_order)
        `, { count: 'exact' })
        .eq('is_active', true);

      // Apply global site setting to hide products without images
      if (settings?.hide_products_without_images === true) {
        query = query.not('product_images', 'is', null);
      }

      // Apply search filter
      if (searchQuery.trim()) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%`);
      }

      // Apply category filter
      if (facetedFilters.categories?.length) {
        query = query.in('category_id', facetedFilters.categories);
      }

      // Apply brand filter
      if (facetedFilters.brands?.length) {
        query = query.in('brand_id', facetedFilters.brands);
      }

      // Apply price filter
      if (priceRange.min !== undefined) {
        query = query.gte('price', priceRange.min);
      }
      if (priceRange.max !== undefined) {
        query = query.lte('price', priceRange.max);
      }

      // Apply stock filter
      if (facetedFilters.inStock) {
        query = query.gt('stock_quantity', 0);
      }

      // Apply sorting
      switch (sortBy) {
        case 'price-asc':
          query = query.order('price', { ascending: true });
          break;
        case 'price-desc':
          query = query.order('price', { ascending: false });
          break;
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'featured':
          query = query.order('is_featured', { ascending: false }).order('created_at', { ascending: false });
          break;
        default:
          query = query.order('name', { ascending: true });
      }

      // Apply pagination only if not loading all
      if (!shouldLoadAll) {
        const from = (currentPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;
      
      if (error) {
        console.error('Error fetching products:', error);
        throw error;
      }

      return {
        products: data || [],
        totalCount: count || 0,
        hasNextPage: shouldLoadAll ? false : (currentPage * itemsPerPage) < (count || 0)
      };
    },
    staleTime: 30000,
    gcTime: 300000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories-with-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select(`
          id, 
          name, 
          slug,
          products(count)
        `)
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      
      return data.map(category => ({
        ...category,
        product_count: Array.isArray(category.products) ? category.products.length : 0
      }));
    },
    staleTime: 600000,
  });

  const products = productsData?.products || [];
  const totalCount = productsData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const useVirtualization = shouldLoadAll && totalCount > 50;

  const handleSearch = (query: string) => {
    console.log('Search query:', query);
    setSearchQuery(query);
    setCurrentPage(1);
    
    if (query.trim()) {
      setSearchParams({ search: query.trim() });
    } else {
      setSearchParams({});
    }
  };

  const handleFiltersChange = (filters: typeof facetedFilters) => {
    console.log('Filters changed:', filters);
    setFacetedFilters(filters);
    setCurrentPage(1);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setFacetedFilters({});
    setSortBy("name");
    setSearchParams({});
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-secondary/30 to-background py-16">
        <div className="container mx-auto px-4">
          <StandardBreadcrumbs 
            items={[
              { label: "Home", href: "/" },
              { label: "All Products", isActive: true }
            ]} 
          />

          <div className="text-center max-w-4xl mx-auto mb-8">
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              {searchQuery ? `Search Results` : 'All Products'}
            </h1>
            <p className="text-muted-foreground text-xl leading-relaxed mb-8">
              Discover our complete collection of premium homeware. Find exactly what you need with our advanced search and filtering options.
            </p>
          </div>

          {/* Modern Search Bar */}
          <div className="max-w-2xl mx-auto">
            <Card className="border-0 bg-white/50 backdrop-blur-sm shadow-lg">
              <div className="p-6">
                <AutocompleteSearch
                  onSearch={handleSearch}
                  initialValue={searchQuery}
                  placeholder="Search for products..."
                />
              </div>
            </Card>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Desktop Filters */}
          <div className="hidden lg:block w-72 flex-shrink-0">
            <Card className="border-0 bg-white/50 backdrop-blur-sm shadow-lg sticky top-8">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">Filters</h3>
                </div>
                <FacetedFilters
                  selectedFilters={facetedFilters}
                  onFiltersChange={handleFiltersChange}
                />
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Results Header */}
            <Card className="border-0 bg-white/50 backdrop-blur-sm shadow-lg mb-8">
              <div className="p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Search className="h-5 w-5 text-primary" />
                      <span className="text-2xl font-bold">
                        {totalCount.toLocaleString()} 
                        <span className="text-lg font-medium text-muted-foreground ml-2">
                          product{totalCount !== 1 ? 's' : ''} found
                        </span>
                      </span>
                    </div>
                    {hasActiveFilters && products.length !== totalCount && !useVirtualization && (
                      <p className="text-sm text-muted-foreground">
                        Showing {products.length} results
                      </p>
                    )}
                    {useVirtualization && (
                      <div className="inline-flex items-center gap-2 mt-2">
                        <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">
                          Optimized View
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {/* Mobile Filter Button */}
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="outline" size="sm" className="lg:hidden bg-white/70 backdrop-blur-sm border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all duration-200">
                          <SlidersHorizontal className="h-4 w-4 mr-2" />
                          Filters
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="left" className="w-80 bg-white/95 backdrop-blur-md">
                        <SheetHeader>
                          <SheetTitle className="flex items-center gap-2">
                            <Filter className="h-5 w-5" />
                            Filters
                          </SheetTitle>
                        </SheetHeader>
                        <div className="mt-6">
                          <FacetedFilters
                            selectedFilters={facetedFilters}
                            onFiltersChange={handleFiltersChange}
                          />
                        </div>
                      </SheetContent>
                    </Sheet>

                    {/* Sort */}
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-48 bg-white/70 backdrop-blur-sm border-primary/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white/95 backdrop-blur-md">
                        <SelectItem value="name">Name A-Z</SelectItem>
                        <SelectItem value="price-asc">Price: Low to High</SelectItem>
                        <SelectItem value="price-desc">Price: High to Low</SelectItem>
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="featured">Featured</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* View Mode */}
                    <div className="flex rounded-lg overflow-hidden border border-primary/20">
                      <Button
                        variant={viewMode === "grid" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("grid")}
                        className="rounded-none"
                      >
                        <Grid className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === "list" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("list")}
                        className="rounded-none"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Product Grid */}
            {isLoading ? (
              <UniversalLoading 
                variant="grid" 
                count={12} 
                className={viewMode === "grid" 
                  ? "grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" 
                  : "grid-cols-1"
                }
              />
            ) : useVirtualization && viewMode === "grid" ? (
              <VirtualizedProductGrid
                products={products}
                isLoading={isLoading}
                containerHeight={800}
                itemHeight={350}
              />
            ) : (
              <div className={`grid gap-2 xs:gap-3 sm:gap-4 md:gap-6 ${
                viewMode === "grid" 
                  ? "grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6" 
                  : "grid-cols-1"
              }`}>
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} viewMode={viewMode} />
                ))}
              </div>
            )}

            {products.length === 0 && !isLoading && (
              <Card className="border-0 bg-white/50 backdrop-blur-sm shadow-lg">
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-primary/10 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Search className="h-8 w-8 text-primary/60" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No Products Found</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    {searchQuery 
                      ? `No products found matching "${searchQuery}". Try different keywords or browse our categories.`
                      : "No products found matching your criteria. Try adjusting your filters."
                    }
                  </p>
                  {(searchQuery || hasActiveFilters) && (
                    <Button onClick={clearSearch} className="bg-primary hover:bg-primary/90">
                      View All Products
                    </Button>
                  )}
                </div>
              </Card>
            )}

            {/* Pagination */}
            {!useVirtualization && (
              <StandardPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                onPageChange={setCurrentPage}
                className="mt-8"
              />
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ProductsPage;