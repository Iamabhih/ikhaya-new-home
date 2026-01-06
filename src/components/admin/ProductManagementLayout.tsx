import { useState, useCallback, useMemo, memo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Eye,
  Archive,
  Copy,
  Grid,
  List,
  Download,
  Upload
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdvancedProductSearch } from "./AdvancedProductSearch";
import { ProductQuickForm } from "./ProductQuickForm";
import { ProductDetailView } from "./ProductDetailView";
import { ProductBulkActions } from "./ProductBulkActions";
import { LoadingSkeleton } from "@/components/ui/loading";

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock_quantity: number;
  is_active: boolean;
  is_featured: boolean;
  category_id: string;
  brand_id: string;
  categories?: { name: string };
  brands?: { name: string };
  created_at: string;
}

// Custom debounce hook for search optimization
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Memoized Product Card component - prevents re-render when product data hasn't changed
interface ProductCardProps {
  product: Product;
  onView: (product: Product) => void;
  onEdit: (productId: string) => void;
}

const ProductCard = memo(({ product, onView, onEdit }: ProductCardProps) => (
  <Card className="group hover:shadow-lg transition-all duration-200 border hover:border-primary/20 h-full">
    <CardContent className="p-4 flex flex-col h-full">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate mb-1">{product.name}</h3>
          <p className="text-xs text-muted-foreground mb-2">SKU: {product.sku || "N/A"}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            <DropdownMenuItem onClick={() => onView(product)}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(product.id)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Product
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="text-lg font-semibold text-primary">R{product.price.toFixed(2)}</div>
        <div className="flex gap-1 flex-wrap">
          {product.is_featured && (
            <Badge variant="secondary" className="text-xs">Featured</Badge>
          )}
          <Badge variant={product.is_active ? "default" : "secondary"} className="text-xs">
            {product.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Stock: {product.stock_quantity}</span>
          <span className="truncate ml-2">{product.categories?.name || "Uncategorized"}</span>
        </div>
        {product.brands?.name && (
          <div className="text-xs font-medium text-primary/80">
            {product.brands.name}
          </div>
        )}
      </div>

      <Separator className="my-3" />

      <div className="flex gap-2 mt-auto">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onView(product)}
          className="flex-1"
        >
          <Eye className="h-3 w-3 mr-1" />
          View
        </Button>
        <Button
          size="sm"
          onClick={() => onEdit(product.id)}
          className="flex-1"
        >
          <Edit className="h-3 w-3 mr-1" />
          Edit
        </Button>
      </div>
    </CardContent>
  </Card>
));
ProductCard.displayName = 'ProductCard';

// Memoized Product List Item component
const ProductListItem = memo(({ product, onView, onEdit }: ProductCardProps) => (
  <Card className="group hover:shadow-md transition-shadow">
    <CardContent className="p-4">
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold truncate">{product.name}</h3>
            <div className="flex gap-1">
              {product.is_featured && (
                <Badge variant="secondary" className="text-xs">Featured</Badge>
              )}
              <Badge variant={product.is_active ? "default" : "secondary"} className="text-xs">
                {product.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
            <span>SKU: {product.sku || "N/A"}</span>
            <span>R{product.price.toFixed(2)}</span>
            <span>Stock: {product.stock_quantity}</span>
            <span>{product.categories?.name || "Uncategorized"}</span>
            {product.brands?.name && (
              <span className="text-primary/80 font-medium">{product.brands.name}</span>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onView(product)}
          >
            <Eye className="h-3 w-3 mr-1" />
            View
          </Button>
          <Button
            size="sm"
            onClick={() => onEdit(product.id)}
          >
            <Edit className="h-3 w-3 mr-1" />
            Edit
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
));
ProductListItem.displayName = 'ProductListItem';

interface ProductManagementLayoutProps {
  products: Product[];
  totalCount: number;
  isLoading: boolean;
  onEditProduct?: (productId: string) => void;
  onSelectProduct: (productId: string, selected: boolean) => void;
  selectedProducts: string[];
  onSearch: (filters: any) => void;
  categories: Array<{ id: string; name: string }>;
  brands: Array<{ id: string; name: string }>;
  refreshTrigger?: number;
}

export const ProductManagementLayout = ({
  products,
  totalCount,
  isLoading,
  onSelectProduct,
  selectedProducts,
  onSearch,
  categories,
  brands,
}: ProductManagementLayoutProps) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showQuickEdit, setShowQuickEdit] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Debounce search query - waits 300ms after user stops typing
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const previousSearchRef = useRef(debouncedSearchQuery);

  // Effect to trigger search when debounced value changes
  useEffect(() => {
    if (previousSearchRef.current !== debouncedSearchQuery) {
      previousSearchRef.current = debouncedSearchQuery;
      onSearch({ query: debouncedSearchQuery, sortBy: 'name' });
      setIsSearching(false);
    }
  }, [debouncedSearchQuery, onSearch]);

  // Immediate feedback when user types
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setIsSearching(true);
  }, []);

  const handleEditProduct = useCallback((productId: string) => {
    setEditingProductId(productId);
    setShowQuickEdit(true);
  }, []);

  const handleViewProduct = useCallback((product: Product) => {
    setSelectedProduct(product);
  }, []);

  const handleCloseQuickEdit = useCallback(() => {
    setShowQuickEdit(false);
    setEditingProductId(null);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedProduct(null);
  }, []);

  const handleClearSelection = useCallback(() => {
    products.forEach(p => onSelectProduct(p.id, false));
  }, [products, onSelectProduct]);

  // Memoized product list rendering
  const productGrid = useMemo(() => {
    if (viewMode === 'grid') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onView={handleViewProduct}
              onEdit={handleEditProduct}
            />
          ))}
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {products.map((product) => (
          <ProductListItem
            key={product.id}
            product={product}
            onView={handleViewProduct}
            onEdit={handleEditProduct}
          />
        ))}
      </div>
    );
  }, [products, viewMode, handleViewProduct, handleEditProduct]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Manage your product catalog with ease
          </p>
        </div>
        <div className="flex gap-2">
          <Sheet open={showQuickAdd} onOpenChange={setShowQuickAdd}>
            <SheetTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:w-96 overflow-y-auto">
              <ProductQuickForm onClose={() => setShowQuickAdd(false)} />
            </SheetContent>
          </Sheet>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Upload className="h-4 w-4 mr-2" />
                Import Products
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="h-4 w-4 mr-2" />
                Export Products
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products by name, SKU, or category..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Sheet open={showFilters} onOpenChange={setShowFilters}>
                <SheetTrigger asChild>
                  <Button variant="outline">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:w-80 overflow-y-auto">
                  <AdvancedProductSearch
                    onSearch={onSearch}
                    categories={categories}
                    brands={brands}
                    totalCount={totalCount}
                    isLoading={isLoading}
                  />
                </SheetContent>
              </Sheet>

              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary and Bulk Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {products.length} of {totalCount.toLocaleString()} products
        </div>
        {selectedProducts.length > 0 && (
          <ProductBulkActions
            selectedProducts={selectedProducts}
            onClearSelection={handleClearSelection}
          />
        )}
      </div>

      {/* Product List */}
      {isLoading ? (
        <LoadingSkeleton
          type={viewMode === 'grid' ? "products-grid" : "products-list"}
          count={viewMode === 'grid' ? 12 : 6}
        />
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No products found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search criteria or add your first product.
            </p>
            <Button onClick={() => setShowQuickAdd(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </CardContent>
        </Card>
      ) : (
        productGrid
      )}

      {/* Product Edit Sheet */}
      <Sheet open={showQuickEdit} onOpenChange={setShowQuickEdit}>
        <SheetContent side="right" className="w-full sm:w-96 overflow-y-auto">
          <ProductQuickForm
            productId={editingProductId}
            onClose={handleCloseQuickEdit}
          />
        </SheetContent>
      </Sheet>

      {/* Product Detail Modal */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && handleCloseDetail()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedProduct && (
            <ProductDetailView
              product={selectedProduct}
              onEdit={() => {
                handleEditProduct(selectedProduct.id);
                handleCloseDetail();
              }}
              onClose={handleCloseDetail}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
