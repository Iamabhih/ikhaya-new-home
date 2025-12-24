-- Create SEO Optimization System
-- PRIORITY: CRITICAL (Phase 3, Sprint 3)
-- REFERENCE: ECOMMERCE_COMPREHENSIVE_AUDIT.md - Missing Feature #3
-- IMPACT: Organic traffic increase (+50% expected), discoverability
-- EFFORT: 2-3 weeks implementation

-- ============================================================================
-- SEO METADATA TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.seo_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Entity reference (polymorphic)
  entity_type TEXT NOT NULL CHECK (entity_type IN ('product', 'category', 'page', 'blog_post', 'collection')),
  entity_id UUID NOT NULL,

  -- Core SEO fields
  meta_title TEXT CHECK (length(meta_title) <= 60), -- Google displays ~60 chars
  meta_description TEXT CHECK (length(meta_description) <= 160), -- Google displays ~160 chars
  meta_keywords TEXT[], -- Legacy but still useful

  -- Open Graph (Social Media)
  og_title TEXT CHECK (length(og_title) <= 60),
  og_description TEXT CHECK (length(og_description) <= 200),
  og_image_url TEXT,
  og_type TEXT DEFAULT 'website',

  -- Twitter Cards
  twitter_card TEXT DEFAULT 'summary_large_image' CHECK (twitter_card IN ('summary', 'summary_large_image', 'app', 'player')),
  twitter_title TEXT CHECK (length(twitter_title) <= 70),
  twitter_description TEXT CHECK (length(twitter_description) <= 200),
  twitter_image_url TEXT,

  -- Structured Data (JSON-LD)
  schema_data JSONB,
  -- Examples:
  -- Product: {"@type": "Product", "name": "...", "offers": {...}, "aggregateRating": {...}}
  -- Article: {"@type": "BlogPosting", "headline": "...", "author": {...}}
  -- BreadcrumbList: {"@type": "BreadcrumbList", "itemListElement": [...]}

  -- Canonical URL (avoid duplicate content)
  canonical_url TEXT,

  -- Indexing control
  robots_meta TEXT DEFAULT 'index, follow', -- index/noindex, follow/nofollow
  no_index BOOLEAN DEFAULT false,
  no_follow BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Unique constraint: one SEO config per entity
  UNIQUE(entity_type, entity_id)
);

-- Indexes
CREATE INDEX idx_seo_metadata_entity ON public.seo_metadata(entity_type, entity_id);
CREATE INDEX idx_seo_metadata_no_index ON public.seo_metadata(no_index) WHERE no_index = true;

COMMENT ON TABLE public.seo_metadata IS 'SEO metadata for all entities (products, categories, pages). Includes meta tags, Open Graph, Twitter Cards, and structured data.';

-- ============================================================================
-- URL REDIRECTS TABLE (301/302)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.url_redirects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- URLs
  old_url TEXT UNIQUE NOT NULL,
  new_url TEXT NOT NULL,

  -- Redirect type
  redirect_type INTEGER DEFAULT 301 CHECK (redirect_type IN (301, 302, 307, 308)),
  -- 301: Permanent redirect (SEO juice transfers)
  -- 302: Temporary redirect
  -- 307: Temporary redirect (preserve method)
  -- 308: Permanent redirect (preserve method)

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Analytics
  hit_count INTEGER DEFAULT 0,
  last_hit_at TIMESTAMPTZ,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_url_redirects_old_url ON public.url_redirects(old_url);
CREATE INDEX idx_url_redirects_active ON public.url_redirects(is_active) WHERE is_active = true;

COMMENT ON TABLE public.url_redirects IS 'URL redirect management for SEO. Track old URLs and redirect to new ones with 301/302 status codes.';

-- ============================================================================
-- SITEMAP CONFIGURATION
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sitemap_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Entity configuration
  entity_type TEXT NOT NULL CHECK (entity_type IN ('product', 'category', 'page', 'blog_post', 'collection')),

  -- Sitemap settings
  include_in_sitemap BOOLEAN DEFAULT true,
  change_frequency TEXT DEFAULT 'weekly' CHECK (change_frequency IN ('always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never')),
  priority DECIMAL(2,1) DEFAULT 0.5 CHECK (priority BETWEEN 0.0 AND 1.0),

  -- Additional filters
  filter_conditions JSONB DEFAULT '{}'::jsonb,
  -- Example: {"is_active": true, "stock_quantity": ">0"}

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(entity_type)
);

-- Default sitemap configs
INSERT INTO public.sitemap_config (entity_type, change_frequency, priority)
VALUES
  ('product', 'daily', 0.8),
  ('category', 'weekly', 0.7),
  ('page', 'monthly', 0.6),
  ('blog_post', 'weekly', 0.7),
  ('collection', 'weekly', 0.7)
ON CONFLICT (entity_type) DO NOTHING;

COMMENT ON TABLE public.sitemap_config IS 'Configuration for XML sitemap generation. Controls which entities are included and their priorities.';

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function: Generate structured data for product
CREATE OR REPLACE FUNCTION public.generate_product_schema(p_product_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_product RECORD;
  v_reviews RECORD;
  v_schema JSONB;
BEGIN
  -- Get product data
  SELECT
    p.*,
    c.name as category_name,
    b.name as brand_name
  INTO v_product
  FROM products p
  LEFT JOIN categories c ON p.category_id = c.id
  LEFT JOIN brands b ON p.brand_id = b.id
  WHERE p.id = p_product_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Get review statistics
  SELECT
    average_rating,
    approved_reviews as review_count
  INTO v_reviews
  FROM product_review_stats
  WHERE product_id = p_product_id;

  -- Build schema.org Product JSON-LD
  v_schema := jsonb_build_object(
    '@context', 'https://schema.org',
    '@type', 'Product',
    'name', v_product.name,
    'description', v_product.description,
    'sku', v_product.sku,
    'brand', jsonb_build_object(
      '@type', 'Brand',
      'name', COALESCE(v_product.brand_name, 'Ikhaya Homeware')
    ),
    'offers', jsonb_build_object(
      '@type', 'Offer',
      'price', v_product.price,
      'priceCurrency', 'ZAR',
      'availability', CASE
        WHEN v_product.stock_quantity > 0 THEN 'https://schema.org/InStock'
        ELSE 'https://schema.org/OutOfStock'
      END,
      'url', 'https://ikhayahomeware.online/products/' || v_product.slug
    )
  );

  -- Add aggregate rating if reviews exist
  IF v_reviews.review_count > 0 THEN
    v_schema := v_schema || jsonb_build_object(
      'aggregateRating', jsonb_build_object(
        '@type', 'AggregateRating',
        'ratingValue', v_reviews.average_rating,
        'reviewCount', v_reviews.review_count,
        'bestRating', 5,
        'worstRating', 1
      )
    );
  END IF;

  -- Add category if exists
  IF v_product.category_name IS NOT NULL THEN
    v_schema := v_schema || jsonb_build_object(
      'category', v_product.category_name
    );
  END IF;

  RETURN v_schema;
END;
$$;

COMMENT ON FUNCTION public.generate_product_schema IS
'Generates schema.org Product structured data in JSON-LD format for SEO rich snippets.';

-- Function: Auto-generate SEO metadata from product
CREATE OR REPLACE FUNCTION public.auto_generate_seo_metadata(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_entity RECORD;
  v_meta_title TEXT;
  v_meta_description TEXT;
  v_schema JSONB;
BEGIN
  IF p_entity_type = 'product' THEN
    SELECT * INTO v_entity FROM products WHERE id = p_entity_id;

    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'error', 'Product not found');
    END IF;

    -- Generate meta title (50-60 chars optimal)
    v_meta_title := LEFT(v_entity.name || ' | Ikhaya Homeware', 60);

    -- Generate meta description (150-160 chars optimal)
    v_meta_description := LEFT(
      COALESCE(v_entity.short_description, v_entity.description, v_entity.name) ||
      ' - Buy online at Ikhaya Homeware. R' || v_entity.price,
      160
    );

    -- Generate structured data
    v_schema := generate_product_schema(p_entity_id);

    -- Upsert SEO metadata
    INSERT INTO seo_metadata (
      entity_type,
      entity_id,
      meta_title,
      meta_description,
      og_title,
      og_description,
      schema_data,
      canonical_url
    ) VALUES (
      'product',
      p_entity_id,
      v_meta_title,
      v_meta_description,
      v_meta_title,
      v_meta_description,
      v_schema,
      'https://ikhayahomeware.online/products/' || v_entity.slug
    )
    ON CONFLICT (entity_type, entity_id) DO UPDATE
    SET
      meta_title = EXCLUDED.meta_title,
      meta_description = EXCLUDED.meta_description,
      schema_data = EXCLUDED.schema_data,
      updated_at = now();

    RETURN json_build_object(
      'success', true,
      'meta_title', v_meta_title,
      'meta_description', v_meta_description
    );
  END IF;

  RETURN json_build_object('success', false, 'error', 'Unsupported entity type');
END;
$$;

COMMENT ON FUNCTION public.auto_generate_seo_metadata IS
'Auto-generates SEO metadata for an entity based on its content. Useful for bulk SEO optimization.';

-- Function: Track redirect hit
CREATE OR REPLACE FUNCTION public.track_redirect_hit(p_old_url TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_redirect RECORD;
BEGIN
  SELECT * INTO v_redirect
  FROM url_redirects
  WHERE old_url = p_old_url AND is_active = true;

  IF FOUND THEN
    -- Update hit count
    UPDATE url_redirects
    SET
      hit_count = hit_count + 1,
      last_hit_at = now()
    WHERE id = v_redirect.id;

    RETURN v_redirect.new_url;
  END IF;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.track_redirect_hit IS
'Tracks a redirect hit and returns the new URL. Returns NULL if redirect not found.';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.seo_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.url_redirects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sitemap_config ENABLE ROW LEVEL SECURITY;

-- SEO Metadata: Public read, admin write
CREATE POLICY "Anyone can view SEO metadata"
  ON public.seo_metadata FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage SEO metadata"
  ON public.seo_metadata FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'superadmin', 'manager')
    )
  );

-- URL Redirects: Public read, admin write
CREATE POLICY "Anyone can view redirects"
  ON public.url_redirects FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage redirects"
  ON public.url_redirects FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'superadmin', 'manager')
    )
  );

-- Sitemap config: Public read, admin write
CREATE POLICY "Anyone can view sitemap config"
  ON public.sitemap_config FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage sitemap config"
  ON public.sitemap_config FOR ALL
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

GRANT SELECT ON public.seo_metadata TO authenticated, anon;
GRANT ALL ON public.seo_metadata TO service_role;

GRANT SELECT ON public.url_redirects TO authenticated, anon;
GRANT ALL ON public.url_redirects TO service_role;

GRANT SELECT ON public.sitemap_config TO authenticated, anon, service_role;

GRANT EXECUTE ON FUNCTION public.generate_product_schema TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.auto_generate_seo_metadata TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.track_redirect_hit TO authenticated, anon, service_role;

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
  'Created SEO optimization system - CRITICAL for organic traffic and discoverability',
  'seo_metadata, url_redirects, sitemap_config',
  'high',
  jsonb_build_object(
    'migration_file', '20251224150002_create_seo_metadata_system.sql',
    'feature', 'seo_optimization',
    'priority', 'CRITICAL',
    'phase', 3,
    'sprint', 3,
    'estimated_traffic_impact', '+50% organic traffic expected',
    'seo_features', jsonb_build_array(
      'Meta tags (title, description)',
      'Open Graph tags (social sharing)',
      'Twitter Cards',
      'Structured data (JSON-LD)',
      '301 redirects manager',
      'XML sitemap configuration',
      'Canonical URLs',
      'Robots meta tags'
    ),
    'tables_created', jsonb_build_array('seo_metadata', 'url_redirects', 'sitemap_config'),
    'functions_created', jsonb_build_array('generate_product_schema', 'auto_generate_seo_metadata', 'track_redirect_hit'),
    'shopify_parity', 'Yes - matches Shopify SEO features'
  )
);
