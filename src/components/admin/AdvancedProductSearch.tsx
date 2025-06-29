
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Filter } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SearchInput } from "./search/SearchInput";
import { FiltersPanel } from "./search/FiltersPanel";
import { SavedSearches } from "./search/SavedSearches";

interface SearchFilters {
  query: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy: 'name' | 'price-asc' | 'price-desc' | 'newest' | 'featured' | 'performance';
  inStockOnly?: boolean;
  featuredOnly?: boolean;
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
  isLoading?: boolean;
  totalCount?: number;
}

export const AdvancedProductSearch = ({ 
  onSearch, 
  categories, 
  isLoading,
  totalCount 
}: AdvancedProductSearchProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    sortBy: 'name'
  });
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  // Auto-search with debounced query
  useEffect(() => {
    const searchFilters = {
      ...filters,
      minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
      maxPrice: priceRange[1] < 10000 ? priceRange[1] : undefined
    };
    
    onSearch(searchFilters);
  }, [filters, priceRange, onSearch]);

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

  const hasActiveFilters = filters.categoryId || filters.inStockOnly !== undefined || 
    filters.featuredOnly || filters.minRating || priceRange[0] > 0 || priceRange[1] < 10000;

  return (
    <Card className="mb-6">
      <CardContent className="p-4 space-y-4">
        {/* Quick Search Bar */}
        <div className="flex gap-2">
          <SearchInput
            query={filters.query}
            onQueryChange={(query) => handleFilterChange('query', query)}
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
          <SavedSearches
            savedSearches={savedSearches}
            onApplySavedSearch={handleApplySavedSearch}
            onSaveSearch={handleSaveSearch}
            hasActiveFilters={hasActiveFilters}
            currentFilters={filters}
            priceRange={priceRange}
          />
        </div>

        {/* Advanced Filters */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleContent>
            <FiltersPanel
              filters={filters}
              priceRange={priceRange}
              categories={categories}
              onFilterChange={handleFilterChange}
              onPriceRangeChange={setPriceRange}
              onClearFilters={clearFilters}
              hasActiveFilters={hasActiveFilters}
            />
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};
