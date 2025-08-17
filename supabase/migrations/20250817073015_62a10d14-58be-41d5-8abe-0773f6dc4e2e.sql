-- Set up featured products for homepage (select products with good names and descriptions)
UPDATE products 
SET is_featured = true 
WHERE id IN (
  SELECT id FROM products 
  WHERE is_active = true 
  AND category_id IS NOT NULL
  AND price > 0
  AND stock_quantity > 0
  AND LENGTH(name) > 10  -- Products with descriptive names
  ORDER BY 
    CASE 
      WHEN category_id IN (SELECT id FROM categories WHERE name IN ('Glassware', 'Stoneware', 'Kitchenware')) THEN 1
      ELSE 2 
    END,
    price DESC
  LIMIT 12
);

-- Add more production-ready site settings
INSERT INTO site_settings (setting_key, setting_value, description) VALUES 
('site_name', '"iKhaya Supplies"', 'The name of the website'),
('site_description', '"Professional catering and hospitality supplies for restaurants, hotels, and businesses"', 'Site description for SEO'),
('show_stock_quantities', 'true', 'Whether to show stock quantities to customers'),
('enable_reviews', 'true', 'Whether to enable product reviews'),
('enable_wishlist', 'true', 'Whether to enable wishlist functionality'),
('min_order_value', '0', 'Minimum order value for checkout'),
('default_currency', '"ZAR"', 'Default currency for the store'),
('products_per_page', '24', 'Number of products to show per page')
ON CONFLICT (setting_key) DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description;