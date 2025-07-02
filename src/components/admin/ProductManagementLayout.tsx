import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
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

interface ProductManagementLayoutProps {
  products: Product[];
  totalCount: number;
  isLoading: boolean;
  onEditProduct: (productId: string) => void;
  onSelectProduct: (productId: string, selected: boolean) => void;
  selectedProducts: string[];
  onSearch: (filters: any) => void;
  categories: Array<{ id: string; name: string }>;
}

export const ProductManagementLayout = ({
  products,
  totalCount,
  isLoading,
  onEditProduct,
  onSelectProduct,
  selectedProducts,
  onSearch,
  categories,
}: ProductManagementLayoutProps) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleQuickSearch = useCallback((value: string) => {
    setSearchQuery(value);
    onSearch({ query: value, sortBy: 'name' });
  }, [onSearch]);

  const ProductCard = ({ product }: { product: Product }) => (
    <Card className="group hover:shadow-lg transition-all duration-200 border hover:border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate mb-1">{product.name}</h3>
            <p className="text-xs text-muted-foreground mb-2">SKU: {product.sku || "N/A"}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSelectedProduct(product)}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEditProduct(product.id)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Product
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold">R{product.price.toFixed(2)}</div>
          <div className="flex gap-1">
            {product.is_featured && (
              <Badge variant="secondary" className="text-xs">Featured</Badge>
            )}
            <Badge variant={product.is_active ? "default" : "secondary"} className="text-xs">
              {product.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Stock: {product.stock_quantity}</span>
          <span>{product.categories?.name || "Uncategorized"}</span>
        </div>

        <Separator className="my-3" />

        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setSelectedProduct(product)}
            className="flex-1"
          >
            <Eye className="h-3 w-3 mr-1" />
            View
          </Button>
          <Button 
            size="sm" 
            onClick={() => onEditProduct(product.id)}
            className="flex-1"
          >
            <Edit className="h-3 w-3 mr-1" />
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const ProductListItem = ({ product }: { product: Product }) => (
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
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span>SKU: {product.sku || "N/A"}</span>
              <span>R{product.price.toFixed(2)}</span>
              <span>Stock: {product.stock_quantity}</span>
              <span>{product.categories?.name || "Uncategorized"}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setSelectedProduct(product)}
            >
              <Eye className="h-3 w-3 mr-1" />
              View
            </Button>
            <Button 
              size="sm" 
              onClick={() => onEditProduct(product.id)}
            >
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

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
            <SheetContent side="right" className="w-full sm:w-96">
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
                onChange={(e) => handleQuickSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Sheet open={showFilters} onOpenChange={setShowFilters}>
                <SheetTrigger asChild>
                  <Button variant="outline">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:w-80">
                  <AdvancedProductSearch
                    onSearch={onSearch}
                    categories={categories}
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
            onClearSelection={() => products.forEach(p => onSelectProduct(p.id, false))}
          />
        )}
      </div>

      {/* Product List */}
      {isLoading ? (
        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "space-y-3"}>
          {Array.from({ length: 8 }).map((_, i) => (
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
        <div className={
          viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" 
            : "space-y-3"
        }>
          {products.map((product) => 
            viewMode === 'grid' ? (
              <ProductCard key={product.id} product={product} />
            ) : (
              <ProductListItem key={product.id} product={product} />
            )
          )}
        </div>
      )}

      {/* Product Detail Modal */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <DialogContent className="max-w-2xl">
          {selectedProduct && (
            <ProductDetailView 
              product={selectedProduct} 
              onEdit={() => {
                onEditProduct(selectedProduct.id);
                setSelectedProduct(null);
              }}
              onClose={() => setSelectedProduct(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};