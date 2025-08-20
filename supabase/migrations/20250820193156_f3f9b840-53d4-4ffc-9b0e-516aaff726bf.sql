-- Add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_images_unique_url 
ON product_images (product_id, image_url);

-- Also add unique constraint for candidates to prevent duplicates there too
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_image_candidates_unique_url 
ON product_image_candidates (product_id, image_url);