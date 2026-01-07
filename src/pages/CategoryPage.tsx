
import { useParams, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/products/ProductCard";
import { OptimizedProductGrid } from "@/components/products/OptimizedProductGrid";
import { StandardBreadcrumbs } from "@/components/common/StandardBreadcrumbs";
import { StandardPagination } from "@/components/common/StandardPagination";
import { AutocompleteSearch } from "@/components/products/AutocompleteSearch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Grid, List, Search, SlidersHorizontal } from "lucide-react";
import { UniversalLoading } from "@/components/ui/universal-loading";
import { ResponsiveGrid } from "@/components/ui/responsive-layout";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useAnalytics } from "@/hooks/useAnalytics";

const CategoryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { settings } = useSiteSettings();
  const { trackEvent, trackSearch } = useAnalytics();
  
  // State management
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [sortBy, setSortBy] = useState("name");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Update search query and reset page when URL changes
  useEffect(() => {
    const urlSearch = searchParams.get("search");
    if (urlSearch !== searchQuery) {
      setSearchQuery(urlSearch || "");
      setCurrentPage(1);
    }
  }, [searchParams]);

  const { data: category, isLoading: categoryLoading } = useQuery({
    queryKey: ['category', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', slug)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['category-products', category?.id, searchQuery, sortBy, currentPage, settings?.hide_products_without_images],
    queryFn: async () => {
      if (!category?.id) return { products: [], totalCount: 0 };
      
      let query = supabase
        .from('products')
        .select(`
          *,
          categories:category_id(id, name, slug),
          product_images(image_url, alt_text, is_primary, sort_order)
        `, { count: 'exact' })
        .eq('category_id', category.id)
        .eq('is_active', true);

      // Apply global site setting to hide products without images
      if (settings?.hide_products_without_images === true) {
        query = query.not('product_images', 'is', null);
      }

      // Apply search filter
      if (searchQuery.trim()) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%`);
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

      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;
      
      return {
        products: data || [],
        totalCount: count || 0
      };
    },
    enabled: !!category?.id,
  });

  const products = productsData?.products || [];
  const totalCount = productsData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Track category view and search analytics
  useEffect(() => {
    if (category?.id) {
      trackEvent({
        event_type: 'page_view',
        event_name: 'category_viewed',
        category_id: category.id,
        page_path: window.location.pathname,
        metadata: { category_name: category.name }
      });
    }
  }, [category, trackEvent]);

  useEffect(() => {
    if (searchQuery && totalCount !== undefined) {
      trackSearch(searchQuery, totalCount);
    }
  }, [searchQuery, totalCount, trackSearch]);

  // Handlers
  const handleSearch = (query: string) => {
    console.log('Category search query:', query);
    setSearchQuery(query);
    setCurrentPage(1);
    
    // Always update URL to reflect search state  
    const newParams = new URLSearchParams(searchParams);
    if (query.trim()) {
      newParams.set('search', query.trim());
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams);
    
    // Log for debugging
    console.log('Category search params updated:', newParams.toString());
  };

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSortBy("name");
    setSearchParams({});
    setCurrentPage(1);
  };

  if (categoryLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="h-8 w-48 bg-muted animate-pulse rounded mx-auto mb-4" />
            <div className="h-4 w-32 bg-muted animate-pulse rounded mx-auto" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Category not found</h1>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Categories", href: "/categories" },
    { label: category?.name || "", isActive: true }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-secondary/30 to-background py-16">
        <div className="container mx-auto px-4">
          <StandardBreadcrumbs items={breadcrumbItems} />

          <div className="text-center max-w-4xl mx-auto mb-8">
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              {category?.name || "Category"}
            </h1>
            {category?.description && (
              <p className="text-muted-foreground text-xl leading-relaxed mb-8">
                {category.description}
              </p>
            )}
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <Card className="border-0 bg-white/50 backdrop-blur-sm shadow-lg">
              <div className="p-6">
                <AutocompleteSearch
                  onSearch={handleSearch}
                  initialValue={searchQuery}
                  placeholder={`Search in ${category?.name || 'category'}...`}
                />
              </div>
            </Card>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-8">
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
                {searchQuery && (
                  <p className="text-sm text-muted-foreground">
                    Search results for "{searchQuery}"
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                {/* Sort */}
                <Select value={sortBy} onValueChange={handleSortChange}>
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

        {/* Optimized Product Grid */}
        <OptimizedProductGrid
          products={products}
          isLoading={isLoading}
          viewMode={viewMode}
          onClearFilters={clearSearch}
          searchQuery={searchQuery}
          hasActiveFilters={!!searchQuery}
        />

        {/* No Products Found */}
        {products.length === 0 && !isLoading && (
          <Card className="border-0 bg-white/50 backdrop-blur-sm shadow-lg">
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-primary/10 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Search className="h-8 w-8 text-primary/60" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Products Found</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {searchQuery 
                  ? `No products found matching "${searchQuery}" in this category.`
                  : `No products found in this category.`
                }
              </p>
              {searchQuery && (
                <Button onClick={clearSearch} className="bg-primary hover:bg-primary/90">
                  View All Products in Category
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Pagination */}
        <StandardPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          onPageChange={handlePageChange}
          className="mt-8"
        />
      </main>
      
      <Footer />
    </div>
  );
};

export default CategoryPage;
