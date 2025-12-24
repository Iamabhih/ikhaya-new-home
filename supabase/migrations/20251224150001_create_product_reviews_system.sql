-- Create Product Reviews & Ratings System
-- PRIORITY: CRITICAL (Phase 2, Sprint 2)
-- REFERENCE: ECOMMERCE_COMPREHENSIVE_AUDIT.md - Missing Feature #2
-- IMPACT: Social proof, conversion rate increase, SEO boost
-- EFFORT: 2 weeks implementation

-- ============================================================================
-- PRODUCT REVIEWS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL, -- For verified purchase badge

  -- Review content
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_title TEXT CHECK (length(review_title) <= 200),
  review_text TEXT CHECK (length(review_text) <= 5000),

  -- Media
  photos TEXT[], -- Array of image URLs
  video_url TEXT,

  -- Verification & moderation
  is_verified_purchase BOOLEAN DEFAULT false, -- Has user actually purchased this product?
  is_approved BOOLEAN DEFAULT false, -- Admin approved for display
  is_featured BOOLEAN DEFAULT false, -- Highlighted review
  moderation_status TEXT DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged')),
  moderation_notes TEXT,
  moderated_by UUID REFERENCES auth.users(id),
  moderated_at TIMESTAMPTZ,

  -- Engagement metrics
  helpful_count INTEGER DEFAULT 0, -- How many found this helpful
  unhelpful_count INTEGER DEFAULT 0,
  report_count INTEGER DEFAULT 0, -- Number of times flagged as inappropriate

  -- Merchant response
  merchant_response TEXT,
  merchant_response_at TIMESTAMPTZ,
  merchant_response_by UUID REFERENCES auth.users(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  UNIQUE(product_id, order_id, user_id) -- One review per product per order
);

-- Indexes for performance
CREATE INDEX idx_product_reviews_product ON public.product_reviews(product_id);
CREATE INDEX idx_product_reviews_user ON public.product_reviews(user_id);
CREATE INDEX idx_product_reviews_rating ON public.product_reviews(rating);
CREATE INDEX idx_product_reviews_moderation ON public.product_reviews(moderation_status);
CREATE INDEX idx_product_reviews_approved ON public.product_reviews(is_approved) WHERE is_approved = true;
CREATE INDEX idx_product_reviews_verified ON public.product_reviews(is_verified_purchase) WHERE is_verified_purchase = true;
CREATE INDEX idx_product_reviews_created ON public.product_reviews(created_at DESC);

COMMENT ON TABLE public.product_reviews IS 'Customer product reviews with ratings, photos, and moderation workflow. Supports verified purchase badges and merchant responses.';

-- ============================================================================
-- REVIEW VOTES TABLE (Helpful/Not Helpful)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.review_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  review_id UUID NOT NULL REFERENCES public.product_reviews(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL for anonymous votes

  -- Vote
  is_helpful BOOLEAN NOT NULL, -- true = helpful, false = not helpful

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Constraint: one vote per user per review
  UNIQUE(review_id, user_id)
);

CREATE INDEX idx_review_votes_review ON public.review_votes(review_id);
CREATE INDEX idx_review_votes_user ON public.review_votes(user_id);

COMMENT ON TABLE public.review_votes IS 'Tracks helpful/unhelpful votes on reviews. Users can vote once per review.';

-- ============================================================================
-- REVIEW REPORTS TABLE (Flag inappropriate content)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.review_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  review_id UUID NOT NULL REFERENCES public.product_reviews(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Report details
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'offensive', 'fake', 'irrelevant', 'other')),
  description TEXT,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  action_taken TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_review_reports_review ON public.review_reports(review_id);
CREATE INDEX idx_review_reports_status ON public.review_reports(status);

COMMENT ON TABLE public.review_reports IS 'User reports of inappropriate reviews. Used for content moderation.';

-- ============================================================================
-- REVIEW STATISTICS (Materialized View for Performance)
-- ============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS public.product_review_stats AS
SELECT
  p.id as product_id,
  COUNT(pr.id) as total_reviews,
  COUNT(pr.id) FILTER (WHERE pr.is_approved = true) as approved_reviews,
  COUNT(pr.id) FILTER (WHERE pr.is_verified_purchase = true) as verified_reviews,
  ROUND(AVG(pr.rating) FILTER (WHERE pr.is_approved = true), 2) as average_rating,
  COUNT(pr.id) FILTER (WHERE pr.rating = 5 AND pr.is_approved = true) as five_star_count,
  COUNT(pr.id) FILTER (WHERE pr.rating = 4 AND pr.is_approved = true) as four_star_count,
  COUNT(pr.id) FILTER (WHERE pr.rating = 3 AND pr.is_approved = true) as three_star_count,
  COUNT(pr.id) FILTER (WHERE pr.rating = 2 AND pr.is_approved = true) as two_star_count,
  COUNT(pr.id) FILTER (WHERE pr.rating = 1 AND pr.is_approved = true) as one_star_count,
  MAX(pr.created_at) FILTER (WHERE pr.is_approved = true) as latest_review_date
FROM public.products p
LEFT JOIN public.product_reviews pr ON p.id = pr.product_id
GROUP BY p.id;

-- Index for fast lookups
CREATE UNIQUE INDEX idx_product_review_stats_product ON public.product_review_stats(product_id);

COMMENT ON MATERIALIZED VIEW public.product_review_stats IS 'Aggregated review statistics per product. Refresh periodically for performance.';

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function: Update review vote counts (trigger function)
CREATE OR REPLACE FUNCTION public.update_review_vote_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE product_reviews
    SET
      helpful_count = helpful_count + CASE WHEN NEW.is_helpful THEN 1 ELSE 0 END,
      unhelpful_count = unhelpful_count + CASE WHEN NOT NEW.is_helpful THEN 1 ELSE 0 END
    WHERE id = NEW.review_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE product_reviews
    SET
      helpful_count = helpful_count + CASE WHEN NEW.is_helpful AND NOT OLD.is_helpful THEN 1 WHEN NOT NEW.is_helpful AND OLD.is_helpful THEN -1 ELSE 0 END,
      unhelpful_count = unhelpful_count + CASE WHEN NOT NEW.is_helpful AND OLD.is_helpful THEN 1 WHEN NEW.is_helpful AND NOT OLD.is_helpful THEN -1 ELSE 0 END
    WHERE id = NEW.review_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE product_reviews
    SET
      helpful_count = helpful_count - CASE WHEN OLD.is_helpful THEN 1 ELSE 0 END,
      unhelpful_count = unhelpful_count - CASE WHEN NOT OLD.is_helpful THEN 1 ELSE 0 END
    WHERE id = OLD.review_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger to auto-update vote counts
CREATE TRIGGER trigger_update_review_vote_counts
  AFTER INSERT OR UPDATE OR DELETE ON public.review_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_review_vote_counts();

-- Function: Check if user can review product
CREATE OR REPLACE FUNCTION public.can_user_review_product(
  p_product_id UUID,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_purchased BOOLEAN;
  v_has_reviewed BOOLEAN;
  v_order_id UUID;
BEGIN
  -- Check if user has purchased this product
  SELECT EXISTS (
    SELECT 1
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE oi.product_id = p_product_id
      AND o.user_id = p_user_id
      AND o.status IN ('completed', 'delivered')
  ) INTO v_has_purchased;

  -- Get order ID for verified purchase
  SELECT o.id INTO v_order_id
  FROM order_items oi
  JOIN orders o ON oi.order_id = o.id
  WHERE oi.product_id = p_product_id
    AND o.user_id = p_user_id
    AND o.status IN ('completed', 'delivered')
  ORDER BY o.created_at DESC
  LIMIT 1;

  -- Check if user has already reviewed
  SELECT EXISTS (
    SELECT 1
    FROM product_reviews
    WHERE product_id = p_product_id
      AND user_id = p_user_id
  ) INTO v_has_reviewed;

  RETURN json_build_object(
    'can_review', NOT v_has_reviewed,
    'has_purchased', v_has_purchased,
    'has_reviewed', v_has_reviewed,
    'order_id', v_order_id
  );
END;
$$;

COMMENT ON FUNCTION public.can_user_review_product IS
'Checks if a user can review a product. Returns purchase status and whether already reviewed.';

-- Function: Submit product review
CREATE OR REPLACE FUNCTION public.submit_product_review(
  p_product_id UUID,
  p_user_id UUID,
  p_rating INTEGER,
  p_title TEXT,
  p_review_text TEXT,
  p_photos TEXT[] DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_can_review JSON;
  v_review_id UUID;
  v_is_verified BOOLEAN;
  v_order_id UUID;
BEGIN
  -- Check if user can review
  v_can_review := can_user_review_product(p_product_id, p_user_id);

  IF NOT (v_can_review->>'can_review')::BOOLEAN THEN
    RETURN json_build_object(
      'success', false,
      'error', 'You have already reviewed this product'
    );
  END IF;

  -- Get verified purchase details
  v_is_verified := (v_can_review->>'has_purchased')::BOOLEAN;
  v_order_id := (v_can_review->>'order_id')::UUID;

  -- Insert review
  INSERT INTO product_reviews (
    product_id,
    user_id,
    order_id,
    rating,
    review_title,
    review_text,
    photos,
    is_verified_purchase,
    is_approved,
    moderation_status
  ) VALUES (
    p_product_id,
    p_user_id,
    v_order_id,
    p_rating,
    p_title,
    p_review_text,
    p_photos,
    v_is_verified,
    false, -- Requires moderation
    'pending'
  )
  RETURNING id INTO v_review_id;

  -- Refresh stats
  REFRESH MATERIALIZED VIEW CONCURRENTLY product_review_stats;

  RETURN json_build_object(
    'success', true,
    'review_id', v_review_id,
    'is_verified_purchase', v_is_verified,
    'message', 'Thank you for your review! It will be published after moderation.'
  );
END;
$$;

COMMENT ON FUNCTION public.submit_product_review IS
'Submits a new product review. Automatically detects verified purchases and sets moderation status.';

-- Function: Refresh review stats
CREATE OR REPLACE FUNCTION public.refresh_review_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY product_review_stats;
END;
$$;

COMMENT ON FUNCTION public.refresh_review_stats IS
'Refreshes the materialized view of product review statistics. Call after bulk review approvals.';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_reports ENABLE ROW LEVEL SECURITY;

-- Reviews: Public can view approved, users can view their own, admins can view all
CREATE POLICY "Anyone can view approved reviews"
  ON public.product_reviews FOR SELECT
  USING (is_approved = true);

CREATE POLICY "Users can view their own reviews"
  ON public.product_reviews FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create reviews"
  ON public.product_reviews FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their pending reviews"
  ON public.product_reviews FOR UPDATE
  USING (user_id = auth.uid() AND moderation_status = 'pending')
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all reviews"
  ON public.product_reviews FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'superadmin', 'manager')
    )
  );

-- Review votes: Users can vote, view votes
CREATE POLICY "Anyone can view review votes"
  ON public.review_votes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can vote"
  ON public.review_votes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their votes"
  ON public.review_votes FOR UPDATE
  USING (user_id = auth.uid());

-- Review reports: Users can report, admins can view/manage
CREATE POLICY "Users can report reviews"
  ON public.review_reports FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage reports"
  ON public.review_reports FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'superadmin', 'manager')
    )
  );

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.product_reviews TO authenticated, anon;
GRANT INSERT, UPDATE ON public.product_reviews TO authenticated;
GRANT ALL ON public.product_reviews TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.review_votes TO authenticated;
GRANT ALL ON public.review_votes TO service_role;

GRANT INSERT ON public.review_reports TO authenticated;
GRANT ALL ON public.review_reports TO service_role;

GRANT SELECT ON public.product_review_stats TO authenticated, anon, service_role;

GRANT EXECUTE ON FUNCTION public.can_user_review_product TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_product_review TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_review_stats TO service_role;

-- ============================================================================
-- SCHEDULED REFRESH (via pg_cron if available)
-- ============================================================================

-- Refresh stats every hour
-- SELECT cron.schedule(
--   'refresh-review-stats',
--   '0 * * * *', -- Every hour
--   $$SELECT refresh_review_stats()$$
-- );

-- ============================================================================
-- LOG MIGRATION
-- ============================================================================

INSERT INTO public.system_change_logs (
  change_type,
  change_category,
  change_description,
  table_name,
  impact_level,
  metadata
) VALUES (
  'schema_change',
  'ecommerce_features',
  'Created product reviews and ratings system - CRITICAL FEATURE for social proof and SEO',
  'product_reviews, review_votes, review_reports, product_review_stats',
  'high',
  jsonb_build_object(
    'migration_file', '20251224150001_create_product_reviews_system.sql',
    'feature', 'product_reviews',
    'priority', 'CRITICAL',
    'phase', 2,
    'sprint', 2,
    'estimated_conversion_impact', '+15% conversion rate from social proof',
    'estimated_seo_impact', 'Rich snippets with star ratings in Google',
    'tables_created', jsonb_build_array('product_reviews', 'review_votes', 'review_reports'),
    'views_created', jsonb_build_array('product_review_stats'),
    'functions_created', jsonb_build_array('can_user_review_product', 'submit_product_review', 'refresh_review_stats'),
    'shopify_parity', 'Yes - matches Shopify review functionality with verified purchase badges'
  )
);
