
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Filter } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchFilters {
  query: string;
  categoryId?: string;
  brandId?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy: 'name' | 'price-asc' | 'price-desc' | 'newest' | 'featured' | 'performance';
  inStockOnly?: boolean;
  featuredOnly?: boolean;
  onSaleOnly?: boolean;
  minRating?: number;
}

interface SavedSearch {
  id: string;
  name: string;
  filters: SearchFilters;
  createdAt: string;
}

interface AdvancedProductSearchProps {
  onSearch: (filters: SearchFilters) => void;
  categories: Array<{ id: string; name: string }>;
  brands: Array<{ id: string; name: string }>;
  isLoading?: boolean;
  totalCount?: number;
}

export const AdvancedProductSearch = ({ 
  onSearch, 
  categories,
  brands, 
  isLoading,
  totalCount 
}: AdvancedProductSearchProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    sortBy: 'name'
  });
  const [localQuery, setLocalQuery] = useState("");
  const debouncedQuery = useDebounce(localQuery, 300);
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  // Handle debounced search
  useEffect(() => {
    setFilters(prev => ({ ...prev, query: debouncedQuery }));
  }, [debouncedQuery]);

  // Auto-search with debounced query - removed onSearch from deps to prevent infinite loop
  useEffect(() => {
    const searchFilters = {
      ...filters,
      minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
      maxPrice: priceRange[1] < 10000 ? priceRange[1] : undefined
    };
    
    onSearch(searchFilters);
  }, [filters, priceRange]); // Removed onSearch from dependencies

  // Load saved searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('admin-saved-searches');
    if (saved) {
      setSavedSearches(JSON.parse(saved));
    }
  }, []);

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSearch = (name: string, searchFilters: SearchFilters) => {
    const newSearch: SavedSearch = {
      id: crypto.randomUUID(),
      name,
      filters: searchFilters,
      createdAt: new Date().toISOString()
    };
    
    const updated = [...savedSearches, newSearch];
    setSavedSearches(updated);
    localStorage.setItem('admin-saved-searches', JSON.stringify(updated));
  };

  const handleApplySavedSearch = (savedSearch: SavedSearch) => {
    setFilters(savedSearch.filters);
    setPriceRange([
      savedSearch.filters.minPrice || 0,
      savedSearch.filters.maxPrice || 10000
    ]);
  };

  const clearFilters = () => {
    const newFilters: SearchFilters = {
      query: '',
      sortBy: 'name'
    };
    setFilters(newFilters);
    setPriceRange([0, 10000]);
  };

  const hasActiveFilters = Boolean(
    filters.categoryId || 
    filters.brandId ||
    filters.inStockOnly === true || 
    filters.featuredOnly === true || 
    filters.onSaleOnly === true ||
    filters.minRating || 
    priceRange[0] > 0 || 
    priceRange[1] < 10000
  );

  return (
    <Card className="mb-6">
      <CardContent className="p-4 space-y-4">
        {/* Quick Search Bar */}
        <div className="flex gap-2">
          <Input
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder="Search products by name, SKU, or category..."
            className="flex-1"
          />

          <Select
            value={filters.sortBy}
            onValueChange={(value) => handleFilterChange('sortBy', value)}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name A-Z</SelectItem>
              <SelectItem value="price-asc">Price: Low to High</SelectItem>
              <SelectItem value="price-desc">Price: High to Low</SelectItem>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="featured">Featured First</SelectItem>
              <SelectItem value="performance">Best Performance</SelectItem>
            </SelectContent>
          </Select>

          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2">
                    Active
                  </Badge>
                )}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </div>

        {/* Results Info */}
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>
            {totalCount !== undefined && `${totalCount.toLocaleString()} products found`}
          </span>
          <div className="flex gap-2">
            {savedSearches.length > 0 && (
              <Button variant="outline" size="sm">
                Saved ({savedSearches.length})
              </Button>
            )}
            {hasActiveFilters && (
              <Button variant="outline" size="sm">
                Save Search
              </Button>
            )}
          </div>
        </div>

        {/* Advanced Filters */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleContent>
            <Card className="mt-4">
              <CardContent className="p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Advanced Filters</h3>
                  {hasActiveFilters && (
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      Clear All
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Category Filter */}
                  <div>
                    <Label>Category</Label>
                    <Select
                      value={filters.categoryId || ""}
                      onValueChange={(value) => handleFilterChange('categoryId', value || undefined)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All categories</SelectItem>
                        {categories?.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Brand Filter */}
                  <div>
                    <Label>Brand</Label>
                    <Select
                      value={filters.brandId || ""}
                      onValueChange={(value) => handleFilterChange('brandId', value || undefined)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All brands" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All brands</SelectItem>
                        {brands?.map((brand) => (
                          <SelectItem key={brand.id} value={brand.id}>
                            {brand.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Price Range */}
                  <div>
                    <Label>Min Price (R)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={priceRange[0] > 0 ? priceRange[0] : ""}
                      onChange={(e) => {
                        const value = e.target.value ? Number(e.target.value) : 0;
                        setPriceRange([value, priceRange[1]]);
                      }}
                    />
                  </div>

                  <div>
                    <Label>Max Price (R)</Label>
                    <Input
                      type="number"
                      placeholder="10000"
                      value={priceRange[1] < 10000 ? priceRange[1] : ""}
                      onChange={(e) => {
                        const value = e.target.value ? Number(e.target.value) : 10000;
                        setPriceRange([priceRange[0], value]);
                      }}
                    />
                  </div>
                </div>

                {/* Toggle Filters */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="in-stock"
                      checked={filters.inStockOnly === true}
                      onCheckedChange={(checked) => handleFilterChange('inStockOnly', checked || undefined)}
                    />
                    <Label htmlFor="in-stock">In Stock Only</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="featured"
                      checked={filters.featuredOnly === true}
                      onCheckedChange={(checked) => handleFilterChange('featuredOnly', checked || undefined)}
                    />
                    <Label htmlFor="featured">Featured Only</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="on-sale"
                      checked={filters.onSaleOnly === true}
                      onCheckedChange={(checked) => handleFilterChange('onSaleOnly', checked || undefined)}
                    />
                    <Label htmlFor="on-sale">On Sale Only</Label>
                  </div>

                  <div>
                    <Label>Min Rating</Label>
                    <Select
                      value={filters.minRating?.toString() || ""}
                      onValueChange={(value) => handleFilterChange('minRating', value ? Number(value) : undefined)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Any rating" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any rating</SelectItem>
                        <SelectItem value="4">4+ stars</SelectItem>
                        <SelectItem value="3">3+ stars</SelectItem>
                        <SelectItem value="2">2+ stars</SelectItem>
                        <SelectItem value="1">1+ stars</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};
