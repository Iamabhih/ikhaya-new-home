
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Clock } from "lucide-react";

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

interface SavedSearchesProps {
  savedSearches: SavedSearch[];
  onApplySavedSearch: (savedSearch: SavedSearch) => void;
  onSaveSearch: (name: string, filters: SearchFilters) => void;
  hasActiveFilters: boolean;
  currentFilters: SearchFilters;
  priceRange: number[];
}

export const SavedSearches = ({
  savedSearches,
  onApplySavedSearch,
  onSaveSearch,
  hasActiveFilters,
  currentFilters,
  priceRange
}: SavedSearchesProps) => {
  const [searchName, setSearchName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const handleSaveSearch = () => {
    if (!searchName.trim()) return;
    
    const filtersToSave = {
      ...currentFilters,
      minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
      maxPrice: priceRange[1] < 10000 ? priceRange[1] : undefined
    };
    
    onSaveSearch(searchName.trim(), filtersToSave);
    setSearchName('');
    setShowSaveDialog(false);
  };

  return (
    <div className="flex gap-2">
      {savedSearches.length > 0 && (
        <Select onValueChange={(value) => {
          const search = savedSearches.find(s => s.id === value);
          if (search) onApplySavedSearch(search);
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

      {/* Save Search Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Save Search</h3>
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Search name..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="flex-1"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveSearch} disabled={!searchName.trim()}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
