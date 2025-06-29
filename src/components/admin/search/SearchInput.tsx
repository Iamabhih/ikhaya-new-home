
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchSuggestion {
  text: string;
  type: 'name' | 'sku';
}

interface SearchInputProps {
  query: string;
  onQueryChange: (query: string) => void;
}

export const SearchInput = ({ query, onQueryChange }: SearchInputProps) => {
  const debouncedQuery = useDebounce(query, 300);

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

  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
      <Input
        placeholder="Search products by name, SKU, or description..."
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        className="pl-10"
      />
      
      {/* Search Suggestions */}
      {suggestions.length > 0 && query && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-40 overflow-y-auto">
          <CardContent className="p-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => onQueryChange(suggestion.text)}
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
  );
};
