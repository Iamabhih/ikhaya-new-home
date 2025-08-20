-- Clean up ALL duplicate product images by keeping only the first occurrence of each product_id + image_url combination
WITH duplicate_images AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY product_id, image_url ORDER BY created_at ASC) as rn
  FROM product_images
)
DELETE FROM product_images 
WHERE id IN (
  SELECT id FROM duplicate_images WHERE rn > 1
);