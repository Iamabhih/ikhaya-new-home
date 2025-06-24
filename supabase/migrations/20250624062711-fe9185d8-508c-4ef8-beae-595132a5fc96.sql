
-- Create the missing materialized view for category product counts
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

-- Create unique index for the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_category_product_counts_id 
ON category_product_counts (id);

-- Function to refresh category counts (can be called periodically)
CREATE OR REPLACE FUNCTION refresh_category_counts()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW category_product_counts;
END;
$$;
