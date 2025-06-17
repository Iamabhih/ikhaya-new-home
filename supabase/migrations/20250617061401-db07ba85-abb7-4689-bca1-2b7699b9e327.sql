
-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_products_category_active_created 
ON products (category_id, is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_active_featured_created 
ON products (is_active, is_featured, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_search 
ON products USING gin (to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(sku, '')));

CREATE INDEX IF NOT EXISTS idx_products_price_active 
ON products (price, is_active);

CREATE INDEX IF NOT EXISTS idx_products_stock_active 
ON products (stock_quantity, is_active);

CREATE INDEX IF NOT EXISTS idx_products_slug 
ON products (slug);

-- Index for product images for faster loading
CREATE INDEX IF NOT EXISTS idx_product_images_product_primary 
ON product_images (product_id, is_primary, sort_order);

-- Index for categories
CREATE INDEX IF NOT EXISTS idx_categories_active_sort 
ON categories (is_active, sort_order);

-- Add full-text search function for better performance
CREATE OR REPLACE FUNCTION search_products(
  search_query text,
  category_filter uuid DEFAULT NULL,
  min_price numeric DEFAULT NULL,
  max_price numeric DEFAULT NULL,
  in_stock_only boolean DEFAULT NULL,
  limit_count integer DEFAULT 20,
  offset_count integer DEFAULT 0
) RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  price numeric,
  compare_at_price numeric,
  stock_quantity integer,
  is_active boolean,
  is_featured boolean,
  category_id uuid,
  created_at timestamp with time zone,
  category_name text,
  image_url text,
  search_rank real
) LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.slug,
    p.price,
    p.compare_at_price,
    p.stock_quantity,
    p.is_active,
    p.is_featured,
    p.category_id,
    p.created_at,
    c.name as category_name,
    pi.image_url,
    CASE 
      WHEN search_query IS NOT NULL AND search_query != '' 
      THEN ts_rank(to_tsvector('english', p.name || ' ' || COALESCE(p.description, '') || ' ' || COALESCE(p.sku, '')), plainto_tsquery('english', search_query))
      ELSE 0
    END as search_rank
  FROM products p
  LEFT JOIN categories c ON p.category_id = c.id
  LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
  WHERE 
    p.is_active = true
    AND (search_query IS NULL OR search_query = '' OR 
         to_tsvector('english', p.name || ' ' || COALESCE(p.description, '') || ' ' || COALESCE(p.sku, '')) @@ plainto_tsquery('english', search_query))
    AND (category_filter IS NULL OR p.category_id = category_filter)
    AND (min_price IS NULL OR p.price >= min_price)
    AND (max_price IS NULL OR p.price <= max_price)
    AND (in_stock_only IS NULL OR (in_stock_only = true AND p.stock_quantity > 0) OR (in_stock_only = false))
  ORDER BY 
    CASE WHEN search_query IS NOT NULL AND search_query != '' THEN search_rank END DESC,
    p.is_featured DESC,
    p.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- Create materialized view for category product counts (refreshed periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS category_product_counts AS
SELECT 
  c.id,
  c.name,
  c.slug,
  COUNT(p.id) as product_count,
  COUNT(CASE WHEN p.stock_quantity > 0 THEN 1 END) as in_stock_count
FROM categories c
LEFT JOIN products p ON c.id = p.category_id AND p.is_active = true
WHERE c.is_active = true
GROUP BY c.id, c.name, c.slug;

CREATE UNIQUE INDEX IF NOT EXISTS idx_category_product_counts_id 
ON category_product_counts (id);

-- Function to refresh category counts
CREATE OR REPLACE FUNCTION refresh_category_counts()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW category_product_counts;
END;
$$;
