
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

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

interface FiltersPanelProps {
  filters: SearchFilters;
  priceRange: number[];
  categories: Array<{ id: string; name: string }>;
  onFilterChange: (key: keyof SearchFilters, value: any) => void;
  onPriceRangeChange: (range: number[]) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export const FiltersPanel = ({
  filters,
  priceRange,
  categories,
  onFilterChange,
  onPriceRangeChange,
  onClearFilters,
  hasActiveFilters
}: FiltersPanelProps) => {
  return (
    <div className="space-y-4 pt-4 border-t">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Category Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Category</label>
          <Select
            value={filters.categoryId || "all"}
            onValueChange={(value) => onFilterChange('categoryId', value === "all" ? undefined : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
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
                  onFilterChange('inStockOnly', checked ? true : undefined)
                }
              />
              <label className="text-sm">In stock only</label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={filters.featuredOnly}
                onCheckedChange={(checked) => 
                  onFilterChange('featuredOnly', checked ? true : undefined)
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
            onValueChange={onPriceRangeChange}
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
            value={filters.minRating?.toString() || "any"}
            onValueChange={(value) => onFilterChange('minRating', value === "any" ? undefined : Number(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Any rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any rating</SelectItem>
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
          <Button variant="outline" onClick={onClearFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>
    </div>
  );
};
