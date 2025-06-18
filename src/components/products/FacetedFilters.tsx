
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, X, Star } from "lucide-react";

interface FacetedFiltersProps {
  onFiltersChange: (filters: {
    categories?: string[];
    ratings?: number[];
    priceRanges?: string[];
    inStock?: boolean;
  }) => void;
  selectedFilters: {
    categories?: string[];
    ratings?: number[];
    priceRanges?: string[];
    inStock?: boolean;
  };
}

export const FacetedFilters = ({ onFiltersChange, selectedFilters }: FacetedFiltersProps) => {
  const [openSections, setOpenSections] = useState({
    categories: true,
    ratings: false,
    price: false,
    availability: false
  });

  // Fetch categories with product counts
  const { data: categories = [] } = useQuery({
    queryKey: ['faceted-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_category_counts');
      if (error) throw error;
      return data || [];
    },
    staleTime: 300000, // 5 minutes
  });

  // Fetch rating distribution
  const { data: ratingStats = [] } = useQuery({
    queryKey: ['rating-distribution'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('average_rating')
        .eq('is_active', true)
        .not('average_rating', 'is', null);
      
      if (error) throw error;
      
      // Group by rating ranges
      const ratings = [5, 4, 3, 2, 1];
      return ratings.map(rating => ({
        rating,
        count: data.filter(p => Math.floor(p.average_rating || 0) === rating).length
      })).filter(r => r.count > 0);
    },
    staleTime: 300000,
  });

  const priceRanges = [
    { label: "Under R100", value: "0-100", count: 0 },
    { label: "R100 - R500", value: "100-500", count: 0 },
    { label: "R500 - R1000", value: "500-1000", count: 0 },
    { label: "R1000 - R2000", value: "1000-2000", count: 0 },
    { label: "Over R2000", value: "2000+", count: 0 },
  ];

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    const current = selectedFilters.categories || [];
    const updated = checked 
      ? [...current, categoryId]
      : current.filter(id => id !== categoryId);
    
    onFiltersChange({ ...selectedFilters, categories: updated });
  };

  const handleRatingChange = (rating: number, checked: boolean) => {
    const current = selectedFilters.ratings || [];
    const updated = checked 
      ? [...current, rating]
      : current.filter(r => r !== rating);
    
    onFiltersChange({ ...selectedFilters, ratings: updated });
  };

  const handlePriceRangeChange = (range: string, checked: boolean) => {
    const current = selectedFilters.priceRanges || [];
    const updated = checked 
      ? [...current, range]
      : current.filter(r => r !== range);
    
    onFiltersChange({ ...selectedFilters, priceRanges: updated });
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const activeFilterCount = 
    (selectedFilters.categories?.length || 0) +
    (selectedFilters.ratings?.length || 0) +
    (selectedFilters.priceRanges?.length || 0) +
    (selectedFilters.inStock ? 1 : 0);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Filters</CardTitle>
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{activeFilterCount} active</Badge>
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                <X className="h-3 w-3" />
                Clear
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Categories */}
        <Collapsible open={openSections.categories} onOpenChange={() => toggleSection('categories')}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <span className="font-medium">Categories</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${openSections.categories ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            {categories.map((category: any) => (
              <div key={category.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`category-${category.id}`}
                  checked={selectedFilters.categories?.includes(category.id) || false}
                  onCheckedChange={(checked) => handleCategoryChange(category.id, checked as boolean)}
                />
                <label
                  htmlFor={`category-${category.id}`}
                  className="text-sm flex-1 cursor-pointer flex justify-between"
                >
                  <span>{category.name}</span>
                  <span className="text-muted-foreground">({category.product_count || 0})</span>
                </label>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Ratings */}
        <Collapsible open={openSections.ratings} onOpenChange={() => toggleSection('ratings')}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <span className="font-medium">Customer Rating</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${openSections.ratings ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            {ratingStats.map(({ rating, count }) => (
              <div key={rating} className="flex items-center space-x-2">
                <Checkbox
                  id={`rating-${rating}`}
                  checked={selectedFilters.ratings?.includes(rating) || false}
                  onCheckedChange={(checked) => handleRatingChange(rating, checked as boolean)}
                />
                <label
                  htmlFor={`rating-${rating}`}
                  className="text-sm flex-1 cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center">
                    {Array.from({ length: rating }, (_, i) => (
                      <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    ))}
                    <span className="ml-1">& up</span>
                  </div>
                  <span className="text-muted-foreground">({count})</span>
                </label>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Price Ranges */}
        <Collapsible open={openSections.price} onOpenChange={() => toggleSection('price')}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <span className="font-medium">Price Range</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${openSections.price ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            {priceRanges.map((range) => (
              <div key={range.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`price-${range.value}`}
                  checked={selectedFilters.priceRanges?.includes(range.value) || false}
                  onCheckedChange={(checked) => handlePriceRangeChange(range.value, checked as boolean)}
                />
                <label
                  htmlFor={`price-${range.value}`}
                  className="text-sm flex-1 cursor-pointer"
                >
                  {range.label}
                </label>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Availability */}
        <Collapsible open={openSections.availability} onOpenChange={() => toggleSection('availability')}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <span className="font-medium">Availability</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${openSections.availability ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="in-stock"
                checked={selectedFilters.inStock || false}
                onCheckedChange={(checked) => 
                  onFiltersChange({ ...selectedFilters, inStock: checked as boolean })
                }
              />
              <label htmlFor="in-stock" className="text-sm cursor-pointer">
                In Stock Only
              </label>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};
