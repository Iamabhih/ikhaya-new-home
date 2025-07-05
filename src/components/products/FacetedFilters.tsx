
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
    brands?: string[];
    ratings?: number[];
    priceRanges?: string[];
    inStock?: boolean;
  }) => void;
  selectedFilters: {
    categories?: string[];
    brands?: string[];
    ratings?: number[];
    priceRanges?: string[];
    inStock?: boolean;
  };
}

export const FacetedFilters = ({ onFiltersChange, selectedFilters }: FacetedFiltersProps) => {
  const [openSections, setOpenSections] = useState({
    categories: true,
    brands: true,
    ratings: false,
    price: false,
    availability: false
  });

  // Fetch categories with accurate product counts
  const { data: categories = [] } = useQuery({
    queryKey: ['faceted-categories-with-counts'],
    queryFn: async () => {
      // Get categories with product counts using aggregation
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (categoriesError) throw categoriesError;
      
      // Get product counts for each category
      const categoriesWithCounts = await Promise.all(
        categoriesData.map(async (category) => {
          const { count, error } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', category.id)
            .eq('is_active', true);
          
          if (error) {
            console.error(`Error counting products for category ${category.name}:`, error);
            return { ...category, product_count: 0 };
          }
          
          return { ...category, product_count: count || 0 };
        })
      );
      
      // Only return categories that have products
      return categoriesWithCounts.filter(cat => cat.product_count > 0);
    },
    staleTime: 300000, // 5 minutes
  });

  // Fetch brands with accurate product counts
  const { data: brands = [] } = useQuery({
    queryKey: ['faceted-brands-with-counts'],
    queryFn: async () => {
      // Get brands with product counts using aggregation
      const { data: brandsData, error: brandsError } = await supabase
        .from('brands')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (brandsError) throw brandsError;
      
      // Get product counts for each brand
      const brandsWithCounts = await Promise.all(
        brandsData.map(async (brand) => {
          const { count, error } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('brand_id', brand.id)
            .eq('is_active', true);
          
          if (error) {
            console.error(`Error counting products for brand ${brand.name}:`, error);
            return { ...brand, product_count: 0 };
          }
          
          return { ...brand, product_count: count || 0 };
        })
      );
      
      // Only return brands that have products
      return brandsWithCounts.filter(brand => brand.product_count > 0);
    },
    staleTime: 300000, // 5 minutes
  });

  // Fetch rating distribution with accurate counts
  const { data: ratingStats = [] } = useQuery({
    queryKey: ['rating-distribution-accurate'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('average_rating')
        .eq('is_active', true)
        .not('average_rating', 'is', null)
        .gt('average_rating', 0);
      
      if (error) throw error;
      
      // Group by rating ranges (4+ stars, 3+ stars, etc.)
      const ratings = [5, 4, 3, 2, 1];
      return ratings.map(rating => ({
        rating,
        count: data.filter(p => Math.floor(p.average_rating || 0) >= rating && 
                              (rating === 1 || Math.floor(p.average_rating || 0) < rating + 1)).length
      })).filter(r => r.count > 0);
    },
    staleTime: 300000,
  });

  // Get accurate price range distribution
  const { data: priceRanges = [] } = useQuery({
    queryKey: ['price-range-distribution'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('price')
        .eq('is_active', true);
      
      if (error) throw error;
      
      const ranges = [
        { label: "Under R100", value: "0-100", min: 0, max: 100 },
        { label: "R100 - R500", value: "100-500", min: 100, max: 500 },
        { label: "R500 - R1000", value: "500-1000", min: 500, max: 1000 },
        { label: "R1000 - R2000", value: "1000-2000", min: 1000, max: 2000 },
        { label: "Over R2000", value: "2000+", min: 2000, max: Infinity },
      ];
      
      return ranges.map(range => ({
        ...range,
        count: data.filter(p => {
          const price = Number(p.price);
          return price >= range.min && (range.max === Infinity || price <= range.max);
        }).length
      })).filter(r => r.count > 0);
    },
    staleTime: 300000,
  });

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

  const handleBrandChange = (brandId: string, checked: boolean) => {
    const current = selectedFilters.brands || [];
    const updated = checked 
      ? [...current, brandId]
      : current.filter(id => id !== brandId);
    
    onFiltersChange({ ...selectedFilters, brands: updated });
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
    (selectedFilters.brands?.length || 0) +
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
            {categories.map((category) => (
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
                  <span className="text-muted-foreground">({category.product_count})</span>
                </label>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Brands */}
        <Collapsible open={openSections.brands} onOpenChange={() => toggleSection('brands')}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <span className="font-medium">Brands</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${openSections.brands ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            {brands.map((brand) => (
              <div key={brand.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`brand-${brand.id}`}
                  checked={selectedFilters.brands?.includes(brand.id) || false}
                  onCheckedChange={(checked) => handleBrandChange(brand.id, checked as boolean)}
                />
                <label
                  htmlFor={`brand-${brand.id}`}
                  className="text-sm flex-1 cursor-pointer flex justify-between"
                >
                  <span>{brand.name}</span>
                  <span className="text-muted-foreground">({brand.product_count})</span>
                </label>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Ratings */}
        {ratingStats.length > 0 && (
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
        )}

        {/* Price Ranges */}
        {priceRanges.length > 0 && (
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
                    className="text-sm flex-1 cursor-pointer flex justify-between"
                  >
                    <span>{range.label}</span>
                    <span className="text-muted-foreground">({range.count})</span>
                  </label>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

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
