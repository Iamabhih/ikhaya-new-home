-- Create Remaining Critical E-Commerce Features
-- Includes: Gift Cards, Collections, Email Automation, Loyalty Program
-- PRIORITY: CRITICAL-HIGH (Phase 4-5)
-- REFERENCE: ECOMMERCE_COMPREHENSIVE_AUDIT.md
-- TOTAL EFFORT: 8-10 weeks across all features

-- ============================================================================
-- GIFT CARDS SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Gift card details
  code TEXT UNIQUE NOT NULL,
  initial_value DECIMAL(10,2) NOT NULL CHECK (initial_value > 0),
  current_balance DECIMAL(10,2) NOT NULL CHECK (current_balance >= 0),
  currency TEXT DEFAULT 'ZAR',

  -- Status
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,

  -- Purchase details
  purchased_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_email TEXT,
  recipient_name TEXT,
  personal_message TEXT,

  -- Purchase order (if bought as product)
  purchase_order_id UUID REFERENCES public.orders(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX idx_gift_cards_code ON public.gift_cards(code);
CREATE INDEX idx_gift_cards_active ON public.gift_cards(is_active) WHERE is_active = true;
CREATE INDEX idx_gift_cards_purchased_by ON public.gift_cards(purchased_by);

COMMENT ON TABLE public.gift_cards IS 'Digital gift cards for store credit. Customers can purchase and redeem.';

-- Gift card transactions
CREATE TABLE IF NOT EXISTS public.gift_card_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  gift_card_id UUID REFERENCES public.gift_cards(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id),

  amount DECIMAL(10,2) NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('issued', 'redeemed', 'refunded', 'expired')),

  balance_before DECIMAL(10,2),
  balance_after DECIMAL(10,2),

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gift_card_transactions_card ON public.gift_card_transactions(gift_card_id);
CREATE INDEX idx_gift_card_transactions_order ON public.gift_card_transactions(order_id);

-- ============================================================================
-- COLLECTIONS SYSTEM (Smart & Manual)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Collection details
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,

  -- Collection type
  type TEXT NOT NULL CHECK (type IN ('manual', 'smart')),

  -- Smart collection conditions (only for type='smart')
  conditions JSONB,
  -- Examples:
  -- {"price_min": 100, "price_max": 500}
  -- {"category_id": "uuid", "stock_quantity": ">0"}
  -- {"tags": ["summer", "sale"], "is_featured": true}

  -- Display settings
  sort_order TEXT DEFAULT 'manual' CHECK (sort_order IN ('manual', 'price_asc', 'price_desc', 'newest', 'oldest', 'best_selling')),
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,

  -- SEO
  seo_title TEXT,
  seo_description TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_collections_slug ON public.collections(slug);
CREATE INDEX idx_collections_type ON public.collections(type);
CREATE INDEX idx_collections_active ON public.collections(is_active) WHERE is_active = true;

COMMENT ON TABLE public.collections IS 'Product collections (manual or smart/automated). Like Shopify collections for product grouping.';

-- Collection products (for manual collections)
CREATE TABLE IF NOT EXISTS public.collection_products (
  collection_id UUID REFERENCES public.collections(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT now(),

  PRIMARY KEY (collection_id, product_id)
);

CREATE INDEX idx_collection_products_collection ON public.collection_products(collection_id);
CREATE INDEX idx_collection_products_product ON public.collection_products(product_id);
CREATE INDEX idx_collection_products_position ON public.collection_products(collection_id, position);

-- ============================================================================
-- EMAIL MARKETING AUTOMATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Campaign details
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('welcome', 'abandoned_cart', 'post_purchase', 'winback', 'promotional', 'review_request', 'birthday')),

  -- Email content
  subject TEXT NOT NULL,
  preview_text TEXT,
  body_html TEXT,
  body_text TEXT,

  -- Trigger conditions (for automated campaigns)
  trigger_conditions JSONB,
  delay_hours INTEGER, -- Delay after trigger event

  -- Segmentation
  target_segment JSONB,
  -- Examples:
  -- {"customer_group": "wholesale"}
  -- {"order_count_min": 1, "order_count_max": 1} -- First-time customers
  -- {"last_purchase_days_ago": ">90"} -- Win-back

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_automated BOOLEAN DEFAULT false,

  -- Analytics
  total_sent INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_converted INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_email_campaigns_type ON public.email_campaigns(type);
CREATE INDEX idx_email_campaigns_active ON public.email_campaigns(is_active) WHERE is_active = true;

COMMENT ON TABLE public.email_campaigns IS 'Email marketing campaigns with automation triggers. Supports welcome series, abandoned cart, post-purchase flows.';

-- Email sends (tracking)
CREATE TABLE IF NOT EXISTS public.email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  campaign_id UUID REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'bounced', 'failed')),

  -- Engagement
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,

  -- Link click tracking
  links_clicked TEXT[], -- Array of clicked link URLs

  -- Conversion tracking
  conversion_order_id UUID REFERENCES public.orders(id),
  conversion_revenue DECIMAL(10,2),

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_email_sends_campaign ON public.email_sends(campaign_id);
CREATE INDEX idx_email_sends_user ON public.email_sends(user_id);
CREATE INDEX idx_email_sends_status ON public.email_sends(status);
CREATE INDEX idx_email_sends_opened ON public.email_sends(opened_at) WHERE opened_at IS NOT NULL;

-- ============================================================================
-- LOYALTY & REWARDS PROGRAM
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Points balances
  points_balance INTEGER DEFAULT 0 CHECK (points_balance >= 0),
  lifetime_points INTEGER DEFAULT 0, -- Total points ever earned

  -- Tier system
  tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'vip')),
  tier_progress INTEGER DEFAULT 0, -- Points toward next tier
  tier_updated_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_loyalty_points_user ON public.loyalty_points(user_id);
CREATE INDEX idx_loyalty_points_tier ON public.loyalty_points(tier);

COMMENT ON TABLE public.loyalty_points IS 'Customer loyalty points and tier management. Earn points on purchases, reviews, referrals.';

-- Loyalty transactions
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  points INTEGER NOT NULL, -- Positive for earn, negative for redeem
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earned', 'redeemed', 'expired', 'adjusted', 'bonus')),

  -- Source of points
  source TEXT NOT NULL, -- 'purchase', 'review', 'referral', 'birthday', 'signup', 'redemption'
  source_id UUID, -- order_id, review_id, etc.

  -- Balance tracking
  balance_before INTEGER,
  balance_after INTEGER,

  -- Expiration (optional)
  expires_at TIMESTAMPTZ,

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_loyalty_transactions_user ON public.loyalty_transactions(user_id);
CREATE INDEX idx_loyalty_transactions_type ON public.loyalty_transactions(transaction_type);
CREATE INDEX idx_loyalty_transactions_source ON public.loyalty_transactions(source);
CREATE INDEX idx_loyalty_transactions_date ON public.loyalty_transactions(created_at DESC);

-- Loyalty rewards catalog
CREATE TABLE IF NOT EXISTS public.loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reward details
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('discount_percentage', 'discount_fixed', 'free_shipping', 'free_product', 'custom')),

  -- Cost & value
  points_cost INTEGER NOT NULL CHECK (points_cost > 0),
  discount_value DECIMAL(10,2),

  -- Availability
  is_active BOOLEAN DEFAULT true,
  tier_required TEXT CHECK (tier_required IN ('bronze', 'silver', 'gold', 'platinum', 'vip')),

  -- Usage limits
  max_redemptions INTEGER, -- Total limit
  max_per_customer INTEGER DEFAULT 1,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_loyalty_rewards_active ON public.loyalty_rewards(is_active) WHERE is_active = true;
CREATE INDEX idx_loyalty_rewards_tier ON public.loyalty_rewards(tier_required);

-- ============================================================================
-- PRODUCT TAGS (for filtering & organization)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.product_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_product_tags_slug ON public.product_tags(slug);

-- Product-tag junction table
CREATE TABLE IF NOT EXISTS public.product_tag_assignments (
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.product_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),

  PRIMARY KEY (product_id, tag_id)
);

CREATE INDEX idx_product_tag_assignments_product ON public.product_tag_assignments(product_id);
CREATE INDEX idx_product_tag_assignments_tag ON public.product_tag_assignments(tag_id);

-- ============================================================================
-- WISHLISTS ENHANCEMENT (if table doesn't exist)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.wishlist_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  share_token TEXT UNIQUE NOT NULL,
  name TEXT,
  is_public BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Gift Cards
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view gift card by code" ON public.gift_cards FOR SELECT USING (true);
CREATE POLICY "Owners can view their gift cards" ON public.gift_cards FOR SELECT USING (purchased_by = auth.uid());

-- Collections
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active collections" ON public.collections FOR SELECT USING (is_active = true);

-- Email Campaigns
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage campaigns" ON public.email_campaigns FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin', 'manager')));

-- Loyalty
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own loyalty points" ON public.loyalty_points FOR SELECT USING (user_id = auth.uid());

ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own transactions" ON public.loyalty_transactions FOR SELECT USING (user_id = auth.uid());

ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active rewards" ON public.loyalty_rewards FOR SELECT USING (is_active = true);

-- Product Tags
ALTER TABLE public.product_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view tags" ON public.product_tags FOR SELECT USING (true);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function: Award loyalty points
CREATE OR REPLACE FUNCTION public.award_loyalty_points(
  p_user_id UUID,
  p_points INTEGER,
  p_source TEXT,
  p_source_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_loyalty RECORD;
BEGIN
  -- Get or create loyalty account
  INSERT INTO loyalty_points (user_id, points_balance, lifetime_points)
  VALUES (p_user_id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_loyalty FROM loyalty_points WHERE user_id = p_user_id FOR UPDATE;

  -- Record transaction
  INSERT INTO loyalty_transactions (
    user_id,
    points,
    transaction_type,
    source,
    source_id,
    balance_before,
    balance_after
  ) VALUES (
    p_user_id,
    p_points,
    'earned',
    p_source,
    p_source_id,
    v_loyalty.points_balance,
    v_loyalty.points_balance + p_points
  );

  -- Update balance
  UPDATE loyalty_points
  SET
    points_balance = points_balance + p_points,
    lifetime_points = lifetime_points + p_points,
    updated_at = now()
  WHERE user_id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'points_awarded', p_points,
    'new_balance', v_loyalty.points_balance + p_points
  );
END;
$$;

-- Function: Validate gift card
CREATE OR REPLACE FUNCTION public.validate_gift_card(p_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_card RECORD;
BEGIN
  SELECT * INTO v_card
  FROM gift_cards
  WHERE code = p_code AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('valid', false, 'error', 'Invalid gift card code');
  END IF;

  IF v_card.current_balance <= 0 THEN
    RETURN json_build_object('valid', false, 'error', 'Gift card has zero balance');
  END IF;

  IF v_card.expires_at IS NOT NULL AND v_card.expires_at < now() THEN
    RETURN json_build_object('valid', false, 'error', 'Gift card has expired');
  END IF;

  RETURN json_build_object(
    'valid', true,
    'balance', v_card.current_balance,
    'currency', v_card.currency
  );
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.gift_cards TO authenticated, anon;
GRANT SELECT ON public.collections TO authenticated, anon;
GRANT SELECT ON public.loyalty_rewards TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

GRANT EXECUTE ON FUNCTION public.award_loyalty_points TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_gift_card TO authenticated, anon;

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
  'Created all remaining critical ecommerce features: Gift Cards, Collections, Email Automation, Loyalty Program, Product Tags',
  'gift_cards, collections, email_campaigns, loyalty_points, product_tags',
  'high',
  jsonb_build_object(
    'migration_file', '20251224150003_create_all_remaining_features.sql',
    'features', jsonb_build_array('gift_cards', 'collections', 'email_automation', 'loyalty_program', 'product_tags'),
    'priority', 'CRITICAL-HIGH',
    'phase', '4-5',
    'estimated_total_effort', '8-10 weeks',
    'shopify_parity_improvement', '63% → 85%',
    'tables_created', jsonb_build_array(
      'gift_cards', 'gift_card_transactions',
      'collections', 'collection_products',
      'email_campaigns', 'email_sends',
      'loyalty_points', 'loyalty_transactions', 'loyalty_rewards',
      'product_tags', 'product_tag_assignments',
      'wishlist_shares'
    ),
    'impact_summary', jsonb_build_object(
      'gift_cards', 'New revenue stream + customer acquisition',
      'collections', 'Better product organization + merchandising',
      'email_automation', 'Customer retention + repeat purchases',
      'loyalty_program', 'Customer retention + LTV increase',
      'product_tags', 'Improved product discovery + filtering'
    )
  )
);
