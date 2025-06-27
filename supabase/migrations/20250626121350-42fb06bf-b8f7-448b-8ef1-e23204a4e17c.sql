

-- First, let's see what's in our categories table and materialized view
-- Check actual categories
SELECT id, name, slug, is_active FROM categories WHERE is_active = true ORDER BY name;

-- Check what's in the materialized view
SELECT id, name, slug, product_count FROM category_product_counts ORDER BY name;

-- Check if products are properly linked to categories
SELECT 
  c.name as category_name,
  c.slug as category_slug,
  COUNT(p.id) as actual_product_count
FROM categories c
LEFT JOIN products p ON c.id = p.category_id AND p.is_active = true
WHERE c.is_active = true
GROUP BY c.id, c.name, c.slug
ORDER BY c.name;

-- Let's also check if there are products without categories
SELECT COUNT(*) as products_without_category
FROM products 
WHERE category_id IS NULL AND is_active = true;

-- Refresh the materialized view to ensure it's up to date
REFRESH MATERIALIZED VIEW category_product_counts;

-- If we need to create proper sample categories with products, let's do that
-- First, let's ensure we have some basic categories
INSERT INTO categories (name, slug, description, is_active, sort_order) VALUES
('Kitchen & Dining', 'kitchen-dining', 'Essential items for your kitchen and dining room', true, 1),
('Living Room', 'living-room', 'Comfortable and stylish living room essentials', true, 2),
('Bedroom', 'bedroom', 'Everything you need for a peaceful bedroom', true, 3),
('Bathroom', 'bathroom', 'Modern bathroom accessories and essentials', true, 4),
('Garden & Outdoor', 'garden-outdoor', 'Beautiful outdoor and garden accessories', true, 5),
('Home Office', 'home-office', 'Productive workspace essentials', true, 6)
ON CONFLICT (slug) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

-- Update any products that don't have categories assigned to assign them to Kitchen & Dining as default
UPDATE products 
SET category_id = (SELECT id FROM categories WHERE slug = 'kitchen-dining' LIMIT 1)
WHERE category_id IS NULL AND is_active = true;

-- Refresh the materialized view again after updates
REFRESH MATERIALIZED VIEW category_product_counts;

