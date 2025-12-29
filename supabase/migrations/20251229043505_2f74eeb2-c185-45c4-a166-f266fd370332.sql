-- ============================================
-- PHASE 2: Customer Addresses Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Home',
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  company TEXT,
  street_address TEXT NOT NULL,
  apartment TEXT,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'South Africa',
  phone TEXT,
  is_default_billing BOOLEAN DEFAULT false,
  is_default_shipping BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own addresses"
  ON public.customer_addresses FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all addresses"
  ON public.customer_addresses FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- ============================================
-- PHASE 5: Automatic Discounts Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.automatic_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'buy_x_get_y')),
  discount_value NUMERIC NOT NULL,
  condition_type TEXT NOT NULL CHECK (condition_type IN ('min_purchase', 'min_quantity', 'specific_products', 'specific_categories', 'customer_group')),
  condition_value JSONB NOT NULL DEFAULT '{}',
  buy_quantity INTEGER,
  get_quantity INTEGER,
  get_product_ids UUID[],
  applies_to TEXT DEFAULT 'all' CHECK (applies_to IN ('all', 'specific_products', 'specific_categories')),
  product_ids UUID[],
  category_ids UUID[],
  customer_group TEXT,
  starts_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  usage_limit INTEGER,
  times_used INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.automatic_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active automatic discounts"
  ON public.automatic_discounts FOR SELECT
  USING (is_active = true AND (starts_at IS NULL OR starts_at <= now()) AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Admins can manage automatic discounts"
  ON public.automatic_discounts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- ============================================
-- PHASE 6: Blog Tables
-- ============================================
CREATE TABLE IF NOT EXISTS public.blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active blog categories"
  ON public.blog_categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage blog categories"
  ON public.blog_categories FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image TEXT,
  category_id UUID REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  meta_title TEXT,
  meta_description TEXT,
  tags TEXT[],
  view_count INTEGER DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published blog posts"
  ON public.blog_posts FOR SELECT
  USING (status = 'published' AND published_at <= now());

CREATE POLICY "Admins can manage blog posts"
  ON public.blog_posts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- ============================================
-- PHASE 7: Gift Cards Tables
-- ============================================
CREATE TABLE IF NOT EXISTS public.gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  initial_balance NUMERIC NOT NULL,
  current_balance NUMERIC NOT NULL,
  currency TEXT DEFAULT 'ZAR',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'disabled')),
  purchaser_email TEXT,
  purchaser_id UUID REFERENCES auth.users(id),
  recipient_email TEXT,
  recipient_name TEXT,
  message TEXT,
  expires_at TIMESTAMPTZ,
  purchased_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own gift cards"
  ON public.gift_cards FOR SELECT
  USING (
    purchaser_id = auth.uid() OR 
    recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage all gift cards"
  ON public.gift_cards FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "System can create gift cards"
  ON public.gift_cards FOR INSERT
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.gift_card_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id UUID NOT NULL REFERENCES public.gift_cards(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'redemption', 'refund', 'adjustment')),
  amount NUMERIC NOT NULL,
  balance_before NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.gift_card_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view transactions for their gift cards"
  ON public.gift_card_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gift_cards gc 
      WHERE gc.id = gift_card_id 
      AND (gc.purchaser_id = auth.uid() OR gc.recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
    )
  );

CREATE POLICY "Admins can manage all gift card transactions"
  ON public.gift_card_transactions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "System can create gift card transactions"
  ON public.gift_card_transactions FOR INSERT
  WITH CHECK (true);

-- ============================================
-- PHASE 8: Abandoned Cart Settings Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.abandoned_cart_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled BOOLEAN DEFAULT true,
  first_email_delay_hours INTEGER DEFAULT 1,
  second_email_delay_hours INTEGER DEFAULT 24,
  third_email_delay_hours INTEGER DEFAULT 72,
  offer_discount_on_second BOOLEAN DEFAULT true,
  discount_percentage NUMERIC DEFAULT 10,
  email_subject_first TEXT DEFAULT 'You left something behind!',
  email_subject_second TEXT DEFAULT 'Still thinking about it? Here''s 10% off!',
  email_subject_third TEXT DEFAULT 'Last chance to complete your order',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.abandoned_cart_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage abandoned cart settings"
  ON public.abandoned_cart_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Insert default settings
INSERT INTO public.abandoned_cart_settings (id) VALUES (gen_random_uuid()) ON CONFLICT DO NOTHING;

-- ============================================
-- Add SEO fields to products and categories
-- ============================================
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS meta_title TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS meta_title TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS meta_description TEXT;

-- ============================================
-- Add profile fields
-- ============================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birthday DATE;

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_customer_addresses_updated_at
  BEFORE UPDATE ON public.customer_addresses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_automatic_discounts_updated_at
  BEFORE UPDATE ON public.automatic_discounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_blog_categories_updated_at
  BEFORE UPDATE ON public.blog_categories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_gift_cards_updated_at
  BEFORE UPDATE ON public.gift_cards
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_abandoned_cart_settings_updated_at
  BEFORE UPDATE ON public.abandoned_cart_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();