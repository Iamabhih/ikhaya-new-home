// Utility functions for consistent loading behavior across the app

export const LOADING_DELAYS = {
  IMMEDIATE: 0,
  SHORT: 150,
  MEDIUM: 300,
  LONG: 500
} as const;

export const LOADING_TIMEOUTS = {
  FAST: 5000,      // 5 seconds
  MEDIUM: 10000,   // 10 seconds  
  SLOW: 30000      // 30 seconds
} as const;

export const SKELETON_COUNTS = {
  PRODUCTS_GRID: 12,
  CATEGORIES: 8,
  SEARCH_RESULTS: 6,
  LIST_ITEMS: 5
} as const;

// Creates a loading delay to prevent flickering for fast operations
export const createLoadingDelay = (delay: number = LOADING_DELAYS.SHORT) => {
  return new Promise(resolve => setTimeout(resolve, delay));
};

// Debounce loading states to prevent rapid loading/loaded transitions
export const debounceLoading = (
  setLoading: (loading: boolean) => void,
  delay: number = LOADING_DELAYS.SHORT
) => {
  let timeoutId: NodeJS.Timeout;

  return (loading: boolean) => {
    clearTimeout(timeoutId);
    
    if (loading) {
      // Show loading immediately
      setLoading(true);
    } else {
      // Delay hiding loading to prevent flicker
      timeoutId = setTimeout(() => setLoading(false), delay);
    }
  };
};

// Loading state configuration for different page types
export const getLoadingConfig = (pageType: 'products' | 'categories' | 'search' | 'admin' | 'general') => {
  const configs = {
    products: {
      variant: 'grid' as const,
      count: SKELETON_COUNTS.PRODUCTS_GRID,
      className: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
    },
    categories: {
      variant: 'grid' as const,
      count: SKELETON_COUNTS.CATEGORIES,
      className: 'grid-cols-2 md:grid-cols-4'
    },
    search: {
      variant: 'grid' as const,
      count: SKELETON_COUNTS.SEARCH_RESULTS,
      className: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
    },
    admin: {
      variant: 'list' as const,
      count: SKELETON_COUNTS.LIST_ITEMS,
      className: 'space-y-4'
    },
    general: {
      variant: 'spinner' as const,
      count: 1,
      className: 'py-8'
    }
  };

  return configs[pageType];
};