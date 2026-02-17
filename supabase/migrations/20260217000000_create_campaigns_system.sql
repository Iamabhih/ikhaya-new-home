-- Create campaigns table
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  theme TEXT DEFAULT 'default',
  banner_image_url TEXT,
  background_color TEXT DEFAULT '#1a1a2e',
  accent_color TEXT DEFAULT '#e94560',
  text_color TEXT DEFAULT '#ffffff',
  badge_text TEXT DEFAULT 'CAMPAIGN',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create campaign_products junction table
CREATE TABLE IF NOT EXISTS public.campaign_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  campaign_price NUMERIC,
  discount_percentage NUMERIC,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, product_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_is_active ON public.campaigns(is_active);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON public.campaigns(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_campaigns_display_order ON public.campaigns(display_order);
CREATE INDEX IF NOT EXISTS idx_campaign_products_campaign_id ON public.campaign_products(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_products_product_id ON public.campaign_products(product_id);

-- Enable RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_products ENABLE ROW LEVEL SECURITY;

-- RLS policies for campaigns
CREATE POLICY "Anyone can view active campaigns" ON public.campaigns
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage campaigns" ON public.campaigns
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'superadmin')
    )
  );

-- RLS policies for campaign_products
CREATE POLICY "Anyone can view active campaign products" ON public.campaign_products
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage campaign products" ON public.campaign_products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'superadmin')
    )
  );

-- Updated_at trigger for campaigns
CREATE OR REPLACE FUNCTION update_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_campaigns_updated_at();

CREATE TRIGGER campaign_products_updated_at
  BEFORE UPDATE ON public.campaign_products
  FOR EACH ROW
  EXECUTE FUNCTION update_campaigns_updated_at();
