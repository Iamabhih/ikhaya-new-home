// Centralized loading state configurations for different UI patterns

export const LOADING_PATTERNS = {
  // Product-related loading patterns
  PRODUCT_GRID: {
    variant: 'grid' as const,
    count: 12,
    className: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
  },
  PRODUCT_LIST: {
    variant: 'list' as const,
    count: 8,
    className: 'space-y-4'
  },
  FEATURED_PRODUCTS: {
    variant: 'grid' as const,
    count: 8,
    className: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
  },
  
  // Category-related loading patterns
  CATEGORY_GRID: {
    variant: 'grid' as const,
    count: 8,
    className: 'grid-cols-2 md:grid-cols-4'
  },
  CATEGORY_CARDS: {
    variant: 'card' as const,
    count: 6,
    className: 'grid grid-cols-2 md:grid-cols-3 gap-4'
  },
  
  // Admin interface loading patterns
  ADMIN_TABLE: {
    variant: 'list' as const,
    count: 10,
    className: 'space-y-2'
  },
  ADMIN_DASHBOARD: {
    variant: 'page' as const,
    count: 1,
    className: 'p-6'
  },
  ADMIN_CARDS: {
    variant: 'grid' as const,
    count: 6,
    className: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
  },
  
  // Search and filter loading patterns
  SEARCH_RESULTS: {
    variant: 'grid' as const,
    count: 6,
    className: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
  },
  FILTER_OPTIONS: {
    variant: 'list' as const,
    count: 5,
    className: 'space-y-3'
  },
  
  // General UI loading patterns
  PAGE_CONTENT: {
    variant: 'page' as const,
    count: 1,
    className: 'min-h-screen'
  },
  MODAL_CONTENT: {
    variant: 'spinner' as const,
    count: 1,
    className: 'py-8'
  },
  FORM_LOADING: {
    variant: 'skeleton' as const,
    count: 1,
    className: 'space-y-4'
  }
} as const;

// Helper function to get loading configuration by pattern name
export const getLoadingPattern = (pattern: keyof typeof LOADING_PATTERNS) => {
  return LOADING_PATTERNS[pattern];
};

// Loading text configurations
export const LOADING_MESSAGES = {
  PRODUCTS: {
    loading: "Loading products...",
    empty: "No products found",
    error: "Failed to load products"
  },
  CATEGORIES: {
    loading: "Loading categories...",
    empty: "No categories found", 
    error: "Failed to load categories"
  },
  SEARCH: {
    loading: "Searching...",
    empty: "No results found",
    error: "Search failed"
  },
  ORDERS: {
    loading: "Loading orders...",
    empty: "No orders found",
    error: "Failed to load orders"
  },
  ADMIN: {
    loading: "Loading data...",
    empty: "No data available",
    error: "Failed to load data"
  },
  GENERAL: {
    loading: "Loading...",
    empty: "No data",
    error: "Something went wrong"
  }
} as const;