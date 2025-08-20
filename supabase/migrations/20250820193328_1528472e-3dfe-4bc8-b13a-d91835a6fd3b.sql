-- Clean up duplicate candidates first
WITH duplicate_candidates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY product_id, image_url ORDER BY created_at ASC) as rn
  FROM product_image_candidates
)
DELETE FROM product_image_candidates 
WHERE id IN (
  SELECT id FROM duplicate_candidates WHERE rn > 1
);

-- Now add the unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_images_unique_url 
ON product_images (product_id, image_url);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_image_candidates_unique_url 
ON product_image_candidates (product_id, image_url);