-- Clean up existing product images and optimize for comprehensive galleries
-- Update sort_order for existing images based on confidence and date
UPDATE product_images 
SET sort_order = CASE 
  WHEN is_primary = true THEN 0
  WHEN match_confidence >= 90 THEN 1
  WHEN match_confidence >= 80 THEN 2
  WHEN match_confidence >= 70 THEN 3
  ELSE 4
END
WHERE sort_order IS NULL OR sort_order > 100;

-- Create index for faster image matching
CREATE INDEX IF NOT EXISTS idx_product_images_product_confidence 
ON product_images (product_id, match_confidence DESC, created_at ASC);

-- Create index for faster SKU lookups in products
CREATE INDEX IF NOT EXISTS idx_products_sku_lower 
ON products (LOWER(sku));

-- Update any products without primary images to set the highest confidence image as primary
UPDATE product_images 
SET is_primary = true
WHERE id IN (
  SELECT DISTINCT ON (product_id) id
  FROM product_images pi1
  WHERE NOT EXISTS (
    SELECT 1 FROM product_images pi2 
    WHERE pi2.product_id = pi1.product_id 
    AND pi2.is_primary = true
  )
  ORDER BY product_id, match_confidence DESC, created_at ASC
);