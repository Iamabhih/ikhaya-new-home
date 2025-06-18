
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/products/ProductCard";
import { AutocompleteSearch } from "@/components/products/AutocompleteSearch";
import { FacetedFilters } from "@/components/products/FacetedFilters";
import { VirtualizedProductGrid } from "@/components/products/VirtualizedProductGrid";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Grid, List, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useOptimizedProducts } from "@/hooks/useOptimizedProducts";

const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [priceRange, setPriceRange] = useState<{ min?: number; max?: number }>({});
  const [inStockOnly, setInStockOnly] = useState<boolean | undefined>(undefined);
  const [sortBy, setSortBy] = useState("name");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [useVirtualization, setUseVirtualization] = useState(false);
  const [facetedFilters, setFacetedFilters] = useState<{
    categories?: string[];
    ratings?: number[];
    priceRanges?: string[];
    inStock?: boolean;
  }>({});
  const itemsPerPage = 20;

  // Update search query when URL changes
  useEffect(() => {
    const urlSearch = searchParams.get("search");
    if (urlSearch && urlSearch !== searchQuery) {
      setSearchQuery(urlSearch);
    }
  }, [searchParams]);

  // Parse price ranges from faceted filters
  useEffect(() => {
    if (facetedFilters.priceRanges?.length) {
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
      
      setPriceRange({ min: minPrice, max: maxPrice });
    } else {
      setPriceRange({});
    }
  }, [facetedFilters.priceRanges]);

  const { data: productsData, isLoading } = useOptimizedProducts({
    searchQuery,
    categoryId: facetedFilters.categories?.[0] || selectedCategory,
    minPrice: priceRange.min,
    maxPrice: priceRange.max,
    inStockOnly: facetedFilters.inStock || inStockOnly,
    page: currentPage,
    pageSize: itemsPerPage
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories-optimized'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    staleTime: 600000, // 10 minutes
  });

  const products = productsData?.products || [];
  const totalCount = productsData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

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
    setSelectedCategory(undefined);
    setPriceRange({});
    setInStockOnly(undefined);
    setSortBy("name");
    setFacetedFilters({});
    setSearchParams({});
    setCurrentPage(1);
  };

  // Enable virtualization for large result sets
  useEffect(() => {
    setUseVirtualization(totalCount > 100);
  }, [totalCount]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbPage>All Products</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Enhanced Search */}
        <div className="mb-6">
          <AutocompleteSearch
            onSearch={handleSearch}
            initialValue={searchQuery}
            placeholder="Search for products..."
          />
        </div>

        <div className="flex gap-6">
          {/* Desktop Filters */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <FacetedFilters
              selectedFilters={facetedFilters}
              onFiltersChange={handleFiltersChange}
            />
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold">
                  {searchQuery ? `Search Results` : 'All Products'}
                </h1>
                <p className="text-muted-foreground">
                  {totalCount.toLocaleString()} product{totalCount !== 1 ? 's' : ''} found
                  {useVirtualization && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Optimized View
                    </span>
                  )}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Mobile Filter Button */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="lg:hidden">
                      <SlidersHorizontal className="h-4 w-4 mr-2" />
                      Filters
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80">
                    <SheetHeader>
                      <SheetTitle>Filters</SheetTitle>
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
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name A-Z</SelectItem>
                    <SelectItem value="price-asc">Price: Low to High</SelectItem>
                    <SelectItem value="price-desc">Price: High to Low</SelectItem>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="featured">Featured</SelectItem>
                  </SelectContent>
                </Select>

                {/* View Mode */}
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Product Grid */}
            {useVirtualization && viewMode === "grid" ? (
              <VirtualizedProductGrid
                products={products}
                isLoading={isLoading}
                containerHeight={800}
                itemHeight={350}
              />
            ) : (
              <div className={`grid gap-6 ${
                viewMode === "grid" 
                  ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
                  : "grid-cols-1"
              }`}>
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} viewMode={viewMode} />
                ))}
              </div>
            )}

            {products.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {searchQuery 
                    ? `No products found matching "${searchQuery}". Try different keywords or browse our categories.`
                    : "No products found matching your criteria."
                  }
                </p>
                {searchQuery && (
                  <Button variant="outline" onClick={clearSearch} className="mt-4">
                    View All Products
                  </Button>
                )}
              </div>
            )}

            {/* Pagination */}
            {!useVirtualization && totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProductsPage;
