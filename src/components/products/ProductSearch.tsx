
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Filter, X, SlidersHorizontal } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAnalyticsContext } from "@/contexts/AnalyticsContext";

interface ProductSearchProps {
  onSearch: (filters: SearchFilters) => void;
  categories: Array<{ id: string; name: string }>;
  isLoading?: boolean;
}

export interface SearchFilters {
  query: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy: 'name' | 'price-asc' | 'price-desc' | 'newest' | 'featured';
  inStock?: boolean;
}

export const ProductSearch = ({ onSearch, categories, isLoading }: ProductSearchProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    sortBy: 'name'
  });
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const { trackSearch } = useAnalyticsContext();

  const handleSearch = () => {
    const searchFilters = {
      ...filters,
      minPrice: priceRange[0],
      maxPrice: priceRange[1]
    };
    
    // Track search event
    if (filters.query) {
      trackSearch(filters.query, 0); // We'll update the count when results are returned
    }
    
    onSearch(searchFilters);
  };

  const clearFilters = () => {
    const newFilters: SearchFilters = {
      query: '',
      sortBy: 'name'
    };
    setFilters(newFilters);
    setPriceRange([0, 10000]);
    onSearch(newFilters);
  };

  const hasActiveFilters = filters.categoryId || filters.inStock !== undefined || 
    priceRange[0] > 0 || priceRange[1] < 10000;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Products
          </CardTitle>
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
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
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search products..."
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
              className="pl-10"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Select
            value={filters.sortBy}
            onValueChange={(value) => setFilters({ ...filters, sortBy: value as any })}
          >
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
          <Button onClick={handleSearch} disabled={isLoading}>
            {isLoading ? "Searching..." : "Search"}
          </Button>
        </div>

        {/* Advanced Filters */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleContent className="space-y-4 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Category Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={filters.categoryId || ""}
                  onValueChange={(value) => 
                    setFilters({ ...filters, categoryId: value || undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Stock Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Availability</label>
                <Select
                  value={filters.inStock === undefined ? "" : filters.inStock.toString()}
                  onValueChange={(value) => 
                    setFilters({ 
                      ...filters, 
                      inStock: value === "" ? undefined : value === "true" 
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All products" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All products</SelectItem>
                    <SelectItem value="true">In stock only</SelectItem>
                    <SelectItem value="false">Out of stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Price Range */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">
                  Price Range: R{priceRange[0]} - R{priceRange[1]}
                </label>
                <Slider
                  value={priceRange}
                  onValueChange={setPriceRange}
                  max={10000}
                  min={0}
                  step={50}
                  className="w-full"
                />
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSearch} disabled={isLoading}>
                <Filter className="h-4 w-4 mr-2" />
                Apply Filters
              </Button>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};
