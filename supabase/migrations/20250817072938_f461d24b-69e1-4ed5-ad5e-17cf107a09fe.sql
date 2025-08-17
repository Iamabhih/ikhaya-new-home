-- Clean up test and empty categories for production

-- Remove the test category
DELETE FROM categories 
WHERE name LIKE '%Test Category%' OR slug LIKE '%test-category%';

-- Remove inactive categories that have no products
DELETE FROM categories 
WHERE is_active = false 
AND id NOT IN (SELECT DISTINCT category_id FROM products WHERE category_id IS NOT NULL);

-- Add proper descriptions to active categories
UPDATE categories 
SET description = CASE 
  WHEN name = 'Glassware' THEN 'Professional glassware for restaurants, hotels, and catering businesses'
  WHEN name = 'Stoneware' THEN 'Durable stoneware dishes, ramekins, and serving platters'
  WHEN name = 'Catering' THEN 'Professional catering equipment and supplies'
  WHEN name = 'Kitchenware' THEN 'Essential kitchen tools and equipment for professional use'
  WHEN name = 'Bakeware' THEN 'Professional baking pans, molds, and accessories'
  WHEN name = 'Plasticware' THEN 'Food-grade plastic containers, storage, and serving items'
  WHEN name = 'Packaging' THEN 'Food packaging, containers, and takeaway supplies'
  WHEN name = 'Toys' THEN 'Educational and entertainment items for hospitality venues'
  ELSE description
END
WHERE is_active = true AND description IS NULL;

-- Ensure featured categories are properly set up for homepage
INSERT INTO homepage_featured_categories (category_id, display_order, is_active)
SELECT 
  id,
  sort_order,
  true
FROM categories 
WHERE is_active = true 
AND sort_order <= 8  -- Feature top 8 categories
ON CONFLICT (category_id) DO UPDATE SET 
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;