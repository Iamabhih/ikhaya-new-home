import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Clock, TrendingUp } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

interface AutocompleteSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  initialValue?: string;
}

export const AutocompleteSearch = ({ 
  onSearch, 
  placeholder = "Search products...", 
  initialValue = "" 
}: AutocompleteSearchProps) => {
  const [query, setQuery] = useState(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const debouncedQuery = useDebounce(query, 300);
  const searchRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recent-searches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Get search suggestions
  const { data: suggestions = [] } = useQuery({
    queryKey: ['search-suggestions', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select('name')
        .ilike('name', `%${debouncedQuery}%`)
        .eq('is_active', true)
        .limit(5);
        
      if (error) throw error;
      return data.map(p => p.name);
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 300000, // 5 minutes
  });

  // Get trending searches
  const { data: trending = [] } = useQuery({
    queryKey: ['trending-searches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analytics_events')
        .select('metadata')
        .eq('event_type', 'search')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(100);
        
      if (error) throw error;
      
      // Extract search queries and count frequency
      const queries: Record<string, number> = {};
      data.forEach(event => {
        // Type-safe access to metadata
        if (event.metadata && typeof event.metadata === 'object' && !Array.isArray(event.metadata)) {
          const metadata = event.metadata as { query?: string };
          const query = metadata.query;
          if (query && typeof query === 'string') {
            queries[query] = (queries[query] || 0) + 1;
          }
        }
      });
      
      return Object.entries(queries)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([query]) => query);
    },
    staleTime: 600000, // 10 minutes
  });

  const handleSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    // Save to recent searches
    const newRecent = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(newRecent);
    localStorage.setItem('recent-searches', JSON.stringify(newRecent));
    
    // Track search event
    supabase
      .from('analytics_events')
      .insert({
        event_type: 'search',
        event_name: 'product_search',
        metadata: { query: searchQuery }
      })
      .then(() => console.log('Search tracked'));
    
    onSearch(searchQuery);
    setIsOpen(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(query);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={searchRef} className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyPress={handleKeyPress}
          className={`pl-10 pr-20 transition-all duration-300 ${
            query ? 'border-primary/50 bg-primary/5 shadow-glow' : 'border-border'
          }`}
        />
        <Button
          onClick={() => handleSearch(query)}
          size="sm"
          className={`absolute right-1 top-1/2 transform -translate-y-1/2 transition-all duration-300 ${
            query ? 'bg-primary hover:bg-primary/90 shadow-glow' : ''
          }`}
        >
          {query ? 'Search' : <Search className="h-4 w-4" />}
        </Button>
        
        {/* Active search indicator */}
        {initialValue && (
          <div className="absolute -top-8 left-0 right-0 flex items-center justify-center">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 backdrop-blur-sm">
              Searching: "{initialValue}"
            </span>
          </div>
        )}
      </div>

      {isOpen && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-96 overflow-y-auto">
          <CardContent className="p-0">
            {/* Search Suggestions */}
            {suggestions.length > 0 && (
              <div className="p-4 border-b">
                <h4 className="text-sm font-medium mb-2">Suggestions</h4>
                <div className="space-y-1">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setQuery(suggestion);
                        handleSearch(suggestion);
                      }}
                      className="block w-full text-left px-2 py-1 text-sm hover:bg-muted rounded"
                    >
                      <Search className="inline h-3 w-3 mr-2 text-muted-foreground" />
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="p-4 border-b">
                <h4 className="text-sm font-medium mb-2 flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  Recent Searches
                </h4>
                <div className="space-y-1">
                  {recentSearches.map((recent, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setQuery(recent);
                        handleSearch(recent);
                      }}
                      className="block w-full text-left px-2 py-1 text-sm hover:bg-muted rounded text-muted-foreground"
                    >
                      {recent}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Trending Searches */}
            {trending.length > 0 && (
              <div className="p-4">
                <h4 className="text-sm font-medium mb-2 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Trending
                </h4>
                <div className="space-y-1">
                  {trending.map((trend, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setQuery(trend);
                        handleSearch(trend);
                      }}
                      className="block w-full text-left px-2 py-1 text-sm hover:bg-muted rounded text-muted-foreground"
                    >
                      {trend}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
