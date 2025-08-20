-- Clean up duplicate images for SKU 21722 by keeping only the first occurrence of each unique image_url
WITH duplicate_images AS (
  SELECT 
    pi.id,
    pi.image_url,
    ROW_NUMBER() OVER (PARTITION BY pi.image_url ORDER BY pi.created_at ASC) as rn
  FROM product_images pi
  JOIN products p ON pi.product_id = p.id
  WHERE p.sku = '21722'
)
DELETE FROM product_images 
WHERE id IN (
  SELECT id FROM duplicate_images WHERE rn > 1
);

-- Add unique constraint to prevent future duplicates (product_id + image_url combination)
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_images_unique_url 
ON product_images (product_id, image_url);