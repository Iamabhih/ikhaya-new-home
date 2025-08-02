-- Update all packaging-related products to be in the packaging category
UPDATE products 
SET category_id = '1bedc79b-793b-4c15-a9e0-989a05e515d4',
    updated_at = now()
WHERE (
  LOWER(name) LIKE '%bag%' 
  OR LOWER(name) LIKE '%packaging%'
  OR LOWER(name) LIKE '%container%'
  OR LOWER(name) LIKE '%box%' AND LOWER(name) NOT LIKE '%cooler%'
  OR LOWER(name) LIKE '%wrap%'
  OR LOWER(name) LIKE '%foil%'
  OR LOWER(name) LIKE '%cling%'
  OR LOWER(name) LIKE '%tissue%'
  OR LOWER(name) LIKE '%serviette%'
  OR LOWER(name) LIKE '%napkin%'
  OR LOWER(sku) LIKE '%pack%'
) 
AND (category_id IS NULL OR category_id != '1bedc79b-793b-4c15-a9e0-989a05e515d4');