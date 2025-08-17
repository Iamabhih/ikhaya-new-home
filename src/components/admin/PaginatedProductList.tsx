
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, Edit, Eye, Package, Search } from "lucide-react";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";
import { BulkProductActions } from "./BulkProductActions";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock_quantity: number;
  is_active: boolean;
  is_featured: boolean;
  category_id: string;
  categories?: { name: string };
  created_at: string;
}

interface PaginatedProductListProps {
  onEditProduct: (productId: string) => void;
  onProductSelect: (productId: string, selected: boolean) => void;
  selectedProducts: string[];
  refreshTrigger: number;
  searchFilters?: any;
}

const ITEMS_PER_PAGE = 20;

export const PaginatedProductList = ({ 
  onEditProduct, 
  onProductSelect, 
  selectedProducts, 
  refreshTrigger,
  searchFilters 
}: PaginatedProductListProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Debounce search term for better performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Use external search filters if provided, otherwise use internal filters
  const effectiveSearchTerm = searchFilters?.query ?? debouncedSearchTerm;
  const effectiveCategoryFilter = searchFilters?.categoryId ?? categoryFilter;
  const effectiveStatusFilter = searchFilters?.inStockOnly ? 'in-stock' : 
                                searchFilters?.featuredOnly ? 'featured' : statusFilter;
  const hideWithoutImages = searchFilters?.hideWithoutImages ?? false;

  // Optimized query with consistent caching
  const { data: productsData, isLoading, error } = useQuery({
    queryKey: ['admin-paginated-products', currentPage, effectiveSearchTerm, effectiveCategoryFilter, effectiveStatusFilter, hideWithoutImages, refreshTrigger, searchFilters],
    queryFn: async () => {
      console.log('Fetching admin products with filters:', {
        searchTerm: effectiveSearchTerm,
        categoryFilter: effectiveCategoryFilter,
        statusFilter: effectiveStatusFilter,
        hideWithoutImages,
        page: currentPage,
        externalFilters: searchFilters
      });

      let query = supabase
        .from('products')
        .select(`
          id, name, sku, price, stock_quantity, is_active, is_featured, 
          category_id, created_at,
          categories:category_id(name),
          product_images!left(id)
        `, { count: 'exact' });

      // Filter out products without images if requested
      if (hideWithoutImages) {
        query = query.not('product_images', 'is', null);
      }

      // Apply search filters
      if (effectiveSearchTerm) {
        query = query.or(`name.ilike.%${effectiveSearchTerm}%,sku.ilike.%${effectiveSearchTerm}%`);
      }

      if (effectiveCategoryFilter && effectiveCategoryFilter !== "all") {
        query = query.eq('category_id', effectiveCategoryFilter);
      }

      // Apply status filters
      if (effectiveStatusFilter === "active") {
        query = query.eq('is_active', true);
      } else if (effectiveStatusFilter === "inactive") {
        query = query.eq('is_active', false);
      } else if (effectiveStatusFilter === "featured") {
        query = query.eq('is_featured', true);
      } else if (effectiveStatusFilter === "low-stock" || effectiveStatusFilter === "in-stock") {
        query = query.gt('stock_quantity', 0);
      }

      // Apply price filters from searchFilters
      if (searchFilters?.minPrice !== undefined) {
        query = query.gte('price', searchFilters.minPrice);
      }
      if (searchFilters?.maxPrice !== undefined) {
        query = query.lte('price', searchFilters.maxPrice);
      }

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      
      // Apply sorting
      const sortBy = searchFilters?.sortBy || 'created_at';
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
        case 'name':
          query = query.order('name', { ascending: true });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }
      
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        products: data as Product[],
        totalCount: count || 0
      };
    },
    staleTime: 30000,
  });

  // Categories query with proper caching
  const { data: categories = [] } = useQuery({
    queryKey: ['categories-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    staleTime: 300000,
  });

  const products = productsData?.products || [];
  const totalCount = productsData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Event handlers - only show internal filters if no external search filters
  const showInternalFilters = !searchFilters;

  const handleSearch = (value: string) => {
    if (showInternalFilters) {
      setSearchTerm(value);
      setCurrentPage(1);
    }
  };

  const handleCategoryFilter = (value: string) => {
    if (showInternalFilters) {
      setCategoryFilter(value);
      setCurrentPage(1);
    }
  };

  const handleStatusFilter = (value: string) => {
    if (showInternalFilters) {
      setStatusFilter(value);
      setCurrentPage(1);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      products.forEach(product => onProductSelect(product.id, true));
    } else {
      products.forEach(product => onProductSelect(product.id, false));
    }
  };

  const handleSelectProduct = (productId: string, checked: boolean) => {
    onProductSelect(productId, checked);
  };

  if (error) {
    toast.error('Failed to load products');
    return <div className="text-center py-8 text-destructive">Failed to load products</div>;
  }

  const isAllSelected = selectedProducts.length === products.length && products.length > 0;
  const isPartiallySelected = selectedProducts.length > 0 && selectedProducts.length < products.length;

  return (
    <div className="space-y-4">
      {/* Filters - only show if no external search filters */}
      {showInternalFilters && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products by name or SKU..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={handleCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={handleStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="low-stock">Low Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Results summary and bulk select */}
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>
            Showing {products.length} of {totalCount.toLocaleString()} products
            {effectiveSearchTerm && ` matching "${effectiveSearchTerm}"`}
          </span>
          {products.length > 0 && (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleSelectAll}
                className={isPartiallySelected ? "data-[state=checked]:bg-primary/50" : ""}
              />
              <label className="text-sm cursor-pointer" onClick={() => handleSelectAll(!isAllSelected)}>
                Select all on page
              </label>
            </div>
          )}
        </div>
        <span>Page {currentPage} of {totalPages}</span>
      </div>

      {/* Bulk Actions */}
      <ErrorBoundary>
        <BulkProductActions 
          selectedProducts={selectedProducts}
          onClearSelection={() => products.forEach(product => onProductSelect(product.id, false))}
        />
      </ErrorBoundary>

      {/* Product List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-3 bg-muted rounded mb-2"></div>
                <div className="h-3 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No products found</h3>
            <p className="text-muted-foreground">
              {effectiveSearchTerm || effectiveCategoryFilter !== "all" || effectiveStatusFilter !== "all"
                ? "Try adjusting your filters"
                : "Start by adding your first product"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <Card key={product.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-2">
                  <Checkbox
                    checked={selectedProducts.includes(product.id)}
                    onCheckedChange={(checked) => handleSelectProduct(product.id, checked as boolean)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium truncate pr-2">{product.name}</h3>
                      <div className="flex gap-1">
                        {product.is_featured && (
                          <Badge variant="secondary" className="text-xs">Featured</Badge>
                        )}
                        <Badge variant={product.is_active ? "default" : "secondary"} className="text-xs">
                          {product.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-1 text-sm text-muted-foreground mb-3 ml-8">
                  <p>SKU: {product.sku || "N/A"}</p>
                  <p>Price: R{product.price.toFixed(2)}</p>
                  <p>Stock: {product.stock_quantity}</p>
                  {product.categories?.name && (
                    <p>Category: {product.categories.name}</p>
                  )}
                </div>

                <div className="flex gap-2 ml-8">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => onEditProduct(product.id)}
                    className="flex-1"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Eye className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
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
  );
};
