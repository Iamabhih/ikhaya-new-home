
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Search, Filter, X, Save, Star, Clock } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";

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

interface SearchSuggestion {
  text: string;
  type: 'name' | 'sku';
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
  const [searchName, setSearchName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const debouncedQuery = useDebounce(filters.query, 300);

  // Auto-search with debounced query
  useEffect(() => {
    if (debouncedQuery !== filters.query) return;
    
    const searchFilters = {
      ...filters,
      minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
      maxPrice: priceRange[1] < 10000 ? priceRange[1] : undefined
    };
    
    onSearch(searchFilters);
  }, [debouncedQuery, filters, priceRange, onSearch]);

  // Load saved searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('admin-saved-searches');
    if (saved) {
      setSavedSearches(JSON.parse(saved));
    }
  }, []);

  // Get search suggestions based on query
  const { data: suggestions = [] } = useQuery({
    queryKey: ['admin-search-suggestions', debouncedQuery],
    queryFn: async (): Promise<SearchSuggestion[]> => {
      if (!debouncedQuery || debouncedQuery.length < 2) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select('name, sku')
        .or(`name.ilike.%${debouncedQuery}%,sku.ilike.%${debouncedQuery}%`)
        .eq('is_active', true)
        .limit(5);
        
      if (error) throw error;
      
      const nameSuggestions: SearchSuggestion[] = data.map(p => ({ text: p.name, type: 'name' as const }));
      const skuSuggestions: SearchSuggestion[] = data.filter(p => p.sku).map(p => ({ text: p.sku!, type: 'sku' as const }));
      
      return [...nameSuggestions, ...skuSuggestions];
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 300000,
  });

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const saveSearch = () => {
    if (!searchName.trim()) return;
    
    const newSearch: SavedSearch = {
      id: crypto.randomUUID(),
      name: searchName.trim(),
      filters: {
        ...filters,
        minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
        maxPrice: priceRange[1] < 10000 ? priceRange[1] : undefined
      },
      createdAt: new Date().toISOString()
    };
    
    const updated = [...savedSearches, newSearch];
    setSavedSearches(updated);
    localStorage.setItem('admin-saved-searches', JSON.stringify(updated));
    setSearchName('');
    setShowSaveDialog(false);
  };

  const applySavedSearch = (savedSearch: SavedSearch) => {
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
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search products by name, SKU, or description..."
              value={filters.query}
              onChange={(e) => handleFilterChange('query', e.target.value)}
              className="pl-10"
            />
            
            {/* Search Suggestions */}
            {suggestions.length > 0 && filters.query && (
              <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-40 overflow-y-auto">
                <CardContent className="p-2">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleFilterChange('query', suggestion.text)}
                      className="block w-full text-left px-2 py-1 text-sm hover:bg-muted rounded"
                    >
                      <Badge variant="secondary" className="mr-2 text-xs">
                        {suggestion.type.toUpperCase()}
                      </Badge>
                      {suggestion.text}
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

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
              <Select onValueChange={(value) => {
                const search = savedSearches.find(s => s.id === value);
                if (search) applySavedSearch(search);
              }}>
                <SelectTrigger className="w-40">
                  <Clock className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Saved" />
                </SelectTrigger>
                <SelectContent>
                  {savedSearches.map((search) => (
                    <SelectItem key={search.id} value={search.id}>
                      {search.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowSaveDialog(true)}
              disabled={!hasActiveFilters}
            >
              <Save className="h-4 w-4" />
            </Button>
          </div>
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
                  onValueChange={(value) => handleFilterChange('categoryId', value || undefined)}
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

              {/* Stock Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Stock Status</label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={filters.inStockOnly}
                      onCheckedChange={(checked) => 
                        handleFilterChange('inStockOnly', checked ? true : undefined)
                      }
                    />
                    <label className="text-sm">In stock only</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={filters.featuredOnly}
                      onCheckedChange={(checked) => 
                        handleFilterChange('featuredOnly', checked ? true : undefined)
                      }
                    />
                    <label className="text-sm">Featured only</label>
                  </div>
                </div>
              </div>

              {/* Price Range */}
              <div className="space-y-2">
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

              {/* Rating Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Minimum Rating</label>
                <Select
                  value={filters.minRating?.toString() || ""}
                  onValueChange={(value) => 
                    handleFilterChange('minRating', value ? Number(value) : undefined)
                  }
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

            {/* Filter Actions */}
            <div className="flex gap-2 pt-2">
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Save Search Dialog */}
        {showSaveDialog && (
          <div className="flex gap-2 items-center p-3 bg-muted rounded-lg">
            <Input
              placeholder="Search name..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="flex-1"
            />
            <Button onClick={saveSearch} disabled={!searchName.trim()}>
              Save
            </Button>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
