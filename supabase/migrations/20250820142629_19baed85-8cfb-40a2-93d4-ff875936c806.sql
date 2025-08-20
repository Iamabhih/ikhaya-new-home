-- Phase 1: Clean up duplicate product images and candidates

-- First, let's create a function to clean up duplicate product_images
-- Keep only one image per product-image URL combination, preferring the one with is_primary = true
WITH duplicates AS (
  SELECT 
    product_id,
    image_url,
    array_agg(id ORDER BY is_primary DESC, created_at ASC) as image_ids
  FROM product_images 
  GROUP BY product_id, image_url 
  HAVING COUNT(*) > 1
),
to_delete AS (
  SELECT unnest(image_ids[2:]) as id_to_delete
  FROM duplicates
)
DELETE FROM product_images 
WHERE id IN (SELECT id_to_delete FROM to_delete);

-- Clean up duplicate product_image_candidates
-- Keep only one candidate per product-image URL combination, preferring highest confidence
WITH candidate_duplicates AS (
  SELECT 
    product_id,
    image_url,
    array_agg(id ORDER BY match_confidence DESC, created_at ASC) as candidate_ids
  FROM product_image_candidates 
  GROUP BY product_id, image_url 
  HAVING COUNT(*) > 1
),
candidates_to_delete AS (
  SELECT unnest(candidate_ids[2:]) as id_to_delete
  FROM candidate_duplicates
)
DELETE FROM product_image_candidates 
WHERE id IN (SELECT id_to_delete FROM candidates_to_delete);

-- Auto-promote high confidence candidates (>= 80%)
DO $$
DECLARE
    candidate_record RECORD;
    new_image_id UUID;
BEGIN
    FOR candidate_record IN 
        SELECT * FROM product_image_candidates 
        WHERE status = 'pending' AND match_confidence >= 80
        -- Only promote if no existing image for this product-url combination
        AND NOT EXISTS (
            SELECT 1 FROM product_images 
            WHERE product_id = product_image_candidates.product_id 
            AND image_url = product_image_candidates.image_url
        )
    LOOP
        -- Create new product image
        INSERT INTO product_images (
            product_id, image_url, alt_text, image_status, 
            match_confidence, match_metadata, auto_matched, 
            reviewed_by, reviewed_at, is_primary
        ) VALUES (
            candidate_record.product_id,
            candidate_record.image_url,
            candidate_record.alt_text,
            'active',
            candidate_record.match_confidence,
            candidate_record.match_metadata,
            true,
            NULL, -- System promoted
            now(),
            -- Set as primary if no other primary exists for this product
            NOT EXISTS (
                SELECT 1 FROM product_images 
                WHERE product_id = candidate_record.product_id 
                AND is_primary = true
            )
        ) RETURNING id INTO new_image_id;
        
        -- Update candidate status
        UPDATE product_image_candidates 
        SET status = 'approved', reviewed_at = now()
        WHERE id = candidate_record.id;
        
        RAISE NOTICE 'Auto-promoted candidate % to image % for product %', 
            candidate_record.id, new_image_id, candidate_record.product_id;
    END LOOP;
END $$;

-- Fix primary image assignments - ensure each product has exactly one primary image
UPDATE product_images 
SET is_primary = false 
WHERE id NOT IN (
    SELECT DISTINCT ON (product_id) id 
    FROM product_images 
    ORDER BY product_id, is_primary DESC, sort_order ASC, created_at ASC
);

-- Set primary = true for the first image of each product that doesn't have a primary
UPDATE product_images 
SET is_primary = true 
WHERE id IN (
    SELECT DISTINCT ON (product_id) id 
    FROM product_images 
    WHERE product_id NOT IN (
        SELECT DISTINCT product_id 
        FROM product_images 
        WHERE is_primary = true
    )
    ORDER BY product_id, sort_order ASC, created_at ASC
);