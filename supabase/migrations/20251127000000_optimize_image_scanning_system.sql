-- Migration: Optimize Image Scanning System
-- This migration adds performance improvements for the optimized image scanning functions

-- ============================================================================
-- PART 1: Performance Indexes for Product Lookups
-- ============================================================================

-- Index for fast SKU lookups (case-insensitive)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_sku_lower
  ON public.products(LOWER(sku));

-- Index for SKU without leading zeros (normalized lookup)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_sku_trimmed
  ON public.products(LTRIM(LOWER(sku), '0'));

-- Composite index for active products with SKU
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_active_sku
  ON public.products(sku, is_active)
  WHERE is_active = true AND sku IS NOT NULL;

-- ============================================================================
-- PART 2: Performance Indexes for Product Images
-- ============================================================================

-- Index for finding products with images (O(1) lookup)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_images_product_active
  ON public.product_images(product_id)
  WHERE image_status = 'active';

-- Index for image URL lookups (duplicate detection)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_images_url
  ON public.product_images(image_url);

-- Index for auto-matched images
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_images_auto_matched_status
  ON public.product_images(auto_matched, image_status);

-- Index for confidence-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_images_confidence
  ON public.product_images(match_confidence DESC)
  WHERE auto_matched = true;

-- ============================================================================
-- PART 3: Performance Indexes for Product Image Candidates
-- ============================================================================

-- Index for pending candidates by confidence
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_candidates_pending_confidence
  ON public.product_image_candidates(match_confidence DESC)
  WHERE status = 'pending';

-- Index for candidate URL lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_candidates_url
  ON public.product_image_candidates(image_url);

-- Index for SKU extraction queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_candidates_extracted_sku
  ON public.product_image_candidates(extracted_sku)
  WHERE status = 'pending';

-- ============================================================================
-- PART 4: Performance Indexes for Processing Sessions
-- ============================================================================

-- Index for active sessions lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_processing_sessions_active
  ON public.processing_sessions(status, started_at DESC)
  WHERE status IN ('running', 'paused');

-- ============================================================================
-- PART 5: Add Missing Columns (if not exist)
-- ============================================================================

-- Add session_id column to product_images for tracking which scan created the link
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_images' AND column_name = 'scan_session_id'
  ) THEN
    ALTER TABLE public.product_images
    ADD COLUMN scan_session_id TEXT;
  END IF;
END $$;

-- Add created_at to product_images if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_images' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.product_images
    ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
  END IF;
END $$;

-- Add updated_at to product_images if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_images' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.product_images
    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
  END IF;
END $$;

-- ============================================================================
-- PART 6: Helper Functions for Batch Operations
-- ============================================================================

-- Function to batch link images (returns count of successfully linked)
CREATE OR REPLACE FUNCTION public.batch_link_product_images(
  p_links jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  link_record jsonb;
  success_count integer := 0;
  error_count integer := 0;
  errors jsonb := '[]'::jsonb;
BEGIN
  -- Check admin permission
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)) THEN
    RAISE EXCEPTION 'Insufficient permissions: Admin access required';
  END IF;

  FOR link_record IN SELECT * FROM jsonb_array_elements(p_links)
  LOOP
    BEGIN
      INSERT INTO public.product_images (
        product_id, image_url, alt_text, is_primary, sort_order,
        image_status, match_confidence, match_metadata, auto_matched
      ) VALUES (
        (link_record->>'product_id')::uuid,
        link_record->>'image_url',
        link_record->>'alt_text',
        COALESCE((link_record->>'is_primary')::boolean, false),
        COALESCE((link_record->>'sort_order')::integer, 0),
        COALESCE(link_record->>'image_status', 'active'),
        COALESCE((link_record->>'match_confidence')::numeric, 100),
        COALESCE(link_record->'match_metadata', '{}'::jsonb),
        COALESCE((link_record->>'auto_matched')::boolean, true)
      ) ON CONFLICT DO NOTHING;

      success_count := success_count + 1;
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      errors := errors || jsonb_build_object(
        'product_id', link_record->>'product_id',
        'error', SQLERRM
      );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', success_count,
    'errors', error_count,
    'error_details', errors
  );
END;
$$;

-- Function to batch create image candidates
CREATE OR REPLACE FUNCTION public.batch_create_image_candidates(
  p_candidates jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate_record jsonb;
  success_count integer := 0;
  error_count integer := 0;
BEGIN
  FOR candidate_record IN SELECT * FROM jsonb_array_elements(p_candidates)
  LOOP
    BEGIN
      INSERT INTO public.product_image_candidates (
        product_id, image_url, alt_text, match_confidence,
        match_metadata, extracted_sku, source_filename, status
      ) VALUES (
        (candidate_record->>'product_id')::uuid,
        candidate_record->>'image_url',
        candidate_record->>'alt_text',
        COALESCE((candidate_record->>'match_confidence')::numeric, 0),
        COALESCE(candidate_record->'match_metadata', '{}'::jsonb),
        candidate_record->>'extracted_sku',
        candidate_record->>'source_filename',
        'pending'
      ) ON CONFLICT DO NOTHING;

      success_count := success_count + 1;
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', success_count,
    'errors', error_count
  );
END;
$$;

-- Function to get image scanning statistics
CREATE OR REPLACE FUNCTION public.get_image_scanning_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_products', (SELECT COUNT(*) FROM products WHERE is_active = true),
    'products_with_images', (
      SELECT COUNT(DISTINCT pi.product_id)
      FROM product_images pi
      JOIN products p ON pi.product_id = p.id
      WHERE p.is_active = true AND pi.image_status = 'active'
    ),
    'products_without_images', (
      SELECT COUNT(*) FROM products p
      WHERE p.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM product_images pi
        WHERE pi.product_id = p.id AND pi.image_status = 'active'
      )
    ),
    'total_images', (SELECT COUNT(*) FROM product_images WHERE image_status = 'active'),
    'auto_matched_images', (SELECT COUNT(*) FROM product_images WHERE auto_matched = true AND image_status = 'active'),
    'pending_candidates', (SELECT COUNT(*) FROM product_image_candidates WHERE status = 'pending'),
    'approved_candidates', (SELECT COUNT(*) FROM product_image_candidates WHERE status = 'approved'),
    'rejected_candidates', (SELECT COUNT(*) FROM product_image_candidates WHERE status = 'rejected'),
    'avg_confidence', (SELECT ROUND(AVG(match_confidence)::numeric, 2) FROM product_images WHERE auto_matched = true),
    'active_sessions', (SELECT COUNT(*) FROM processing_sessions WHERE status = 'running'),
    'recent_sessions', (SELECT COUNT(*) FROM processing_sessions WHERE started_at > now() - interval '24 hours')
  ) INTO stats;

  RETURN stats;
END;
$$;

-- Function to clean up orphaned image links
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_image_links()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Check admin permission
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)) THEN
    RAISE EXCEPTION 'Insufficient permissions: Admin access required';
  END IF;

  -- Delete product images where the product no longer exists
  WITH deleted AS (
    DELETE FROM product_images pi
    WHERE NOT EXISTS (
      SELECT 1 FROM products p WHERE p.id = pi.product_id
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  -- Also clean up candidates
  DELETE FROM product_image_candidates pic
  WHERE NOT EXISTS (
    SELECT 1 FROM products p WHERE p.id = pic.product_id
  );

  RETURN jsonb_build_object(
    'deleted_orphaned_images', deleted_count,
    'cleaned_at', now()
  );
END;
$$;

-- Function to reset auto-matched images for re-scanning
CREATE OR REPLACE FUNCTION public.reset_auto_matched_images(
  p_confidence_below numeric DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Check admin permission
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)) THEN
    RAISE EXCEPTION 'Insufficient permissions: Admin access required';
  END IF;

  IF p_confidence_below IS NOT NULL THEN
    -- Delete only auto-matched images below the confidence threshold
    DELETE FROM product_images
    WHERE auto_matched = true
    AND match_confidence < p_confidence_below;
  ELSE
    -- Delete all auto-matched images
    DELETE FROM product_images
    WHERE auto_matched = true;
  END IF;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ============================================================================
-- PART 7: Update RLS Policies for Service Role Access
-- ============================================================================

-- Ensure service role can insert into product_images
DO $$
BEGIN
  -- Drop existing restrictive policies if they exist
  DROP POLICY IF EXISTS "Service role can manage product images" ON public.product_images;

  -- Create permissive policy for service role operations
  CREATE POLICY "Service role can manage product images"
  ON public.product_images
  FOR ALL
  USING (true)
  WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
  -- Policy might already exist or table might not have RLS
  NULL;
END $$;

-- Ensure service role can insert into product_image_candidates
DO $$
BEGIN
  DROP POLICY IF EXISTS "Service role can manage candidates" ON public.product_image_candidates;

  CREATE POLICY "Service role can manage candidates"
  ON public.product_image_candidates
  FOR ALL
  USING (true)
  WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Ensure service role can manage processing_sessions
DO $$
BEGIN
  DROP POLICY IF EXISTS "Service role can manage sessions" ON public.processing_sessions;

  CREATE POLICY "Service role can manage sessions"
  ON public.processing_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ============================================================================
-- PART 8: Add Unique Constraint for Duplicate Prevention
-- ============================================================================

-- Add unique constraint on product_id + image_url to prevent duplicate links
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'product_images_product_url_unique'
  ) THEN
    -- First remove any existing duplicates
    WITH duplicates AS (
      SELECT id, ROW_NUMBER() OVER (
        PARTITION BY product_id, image_url
        ORDER BY created_at ASC NULLS LAST
      ) as rn
      FROM product_images
    )
    DELETE FROM product_images
    WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

    -- Then add the constraint
    ALTER TABLE public.product_images
    ADD CONSTRAINT product_images_product_url_unique
    UNIQUE (product_id, image_url);
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Constraint might already exist
  RAISE NOTICE 'Could not add unique constraint: %', SQLERRM;
END $$;

-- Add unique constraint on candidates to prevent duplicate entries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'product_image_candidates_product_url_unique'
  ) THEN
    -- First remove any existing duplicates
    WITH duplicates AS (
      SELECT id, ROW_NUMBER() OVER (
        PARTITION BY product_id, image_url
        ORDER BY created_at ASC
      ) as rn
      FROM product_image_candidates
    )
    DELETE FROM product_image_candidates
    WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

    -- Then add the constraint
    ALTER TABLE public.product_image_candidates
    ADD CONSTRAINT product_image_candidates_product_url_unique
    UNIQUE (product_id, image_url);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add unique constraint to candidates: %', SQLERRM;
END $$;

-- ============================================================================
-- PART 9: Create View for Image Scanning Dashboard
-- ============================================================================

CREATE OR REPLACE VIEW public.image_scanning_dashboard AS
SELECT
  p.id as product_id,
  p.name as product_name,
  p.sku,
  p.is_active,
  COALESCE(img_count.total_images, 0) as image_count,
  COALESCE(img_count.auto_matched_count, 0) as auto_matched_count,
  COALESCE(cand_count.pending_candidates, 0) as pending_candidates,
  img.primary_image_url,
  img.primary_confidence
FROM products p
LEFT JOIN (
  SELECT
    product_id,
    COUNT(*) as total_images,
    COUNT(*) FILTER (WHERE auto_matched = true) as auto_matched_count
  FROM product_images
  WHERE image_status = 'active'
  GROUP BY product_id
) img_count ON p.id = img_count.product_id
LEFT JOIN (
  SELECT
    product_id,
    COUNT(*) as pending_candidates
  FROM product_image_candidates
  WHERE status = 'pending'
  GROUP BY product_id
) cand_count ON p.id = cand_count.product_id
LEFT JOIN LATERAL (
  SELECT
    image_url as primary_image_url,
    match_confidence as primary_confidence
  FROM product_images
  WHERE product_id = p.id AND is_primary = true AND image_status = 'active'
  LIMIT 1
) img ON true
WHERE p.is_active = true;

-- Grant access to the view
GRANT SELECT ON public.image_scanning_dashboard TO authenticated;

-- ============================================================================
-- PART 10: Add Trigger for Updated Timestamps
-- ============================================================================

-- Create or replace the update_updated_at_column function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add trigger to product_images if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_product_images_updated_at'
  ) THEN
    CREATE TRIGGER update_product_images_updated_at
      BEFORE UPDATE ON public.product_images
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ============================================================================
-- PART 11: Analyze Tables for Query Planner
-- ============================================================================

ANALYZE public.products;
ANALYZE public.product_images;
ANALYZE public.product_image_candidates;
ANALYZE public.processing_sessions;

-- ============================================================================
-- Migration Complete
-- ============================================================================

COMMENT ON FUNCTION public.batch_link_product_images IS 'Batch insert product images with conflict handling';
COMMENT ON FUNCTION public.batch_create_image_candidates IS 'Batch create image candidates for review';
COMMENT ON FUNCTION public.get_image_scanning_stats IS 'Get comprehensive image scanning statistics';
COMMENT ON FUNCTION public.cleanup_orphaned_image_links IS 'Remove image links for deleted products';
COMMENT ON FUNCTION public.reset_auto_matched_images IS 'Reset auto-matched images for re-scanning';
COMMENT ON VIEW public.image_scanning_dashboard IS 'Dashboard view for image scanning status per product';
