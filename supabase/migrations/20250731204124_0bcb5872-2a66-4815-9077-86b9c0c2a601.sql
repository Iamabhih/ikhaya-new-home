-- Update the search_products function to properly return product images
CREATE OR REPLACE FUNCTION public.search_products(
  search_query text, 
  category_filter uuid DEFAULT NULL::uuid, 
  min_price numeric DEFAULT NULL::numeric, 
  max_price numeric DEFAULT NULL::numeric, 
  in_stock_only boolean DEFAULT NULL::boolean, 
  limit_count integer DEFAULT 20, 
  offset_count integer DEFAULT 0
)
RETURNS TABLE(
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
)
LANGUAGE plpgsql
STABLE
AS $function$
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
$function$