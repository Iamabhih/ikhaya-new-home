-- Enhanced Cart Analytics Tables for E-commerce Intelligence

-- Cart sessions to track complete user journeys
CREATE TABLE public.cart_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  session_id TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  abandoned_at TIMESTAMP WITH TIME ZONE,
  converted_at TIMESTAMP WITH TIME ZONE,
  checkout_initiated_at TIMESTAMP WITH TIME ZONE,
  payment_attempted_at TIMESTAMP WITH TIME ZONE,
  session_duration INTEGER DEFAULT 0, -- in seconds
  page_views INTEGER DEFAULT 0,
  device_info JSONB DEFAULT '{}',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  abandonment_stage TEXT CHECK (abandonment_stage IN ('cart', 'checkout', 'payment', 'completed')),
  total_value DECIMAL(10,2) DEFAULT 0,
  item_count INTEGER DEFAULT 0,
  is_recovered BOOLEAN DEFAULT false,
  recovery_campaign_id UUID
);

-- Cart abandonment campaigns for recovery efforts
CREATE TABLE public.cart_abandonment_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cart_session_id UUID REFERENCES cart_sessions(id) ON DELETE CASCADE,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('email_1hr', 'email_24hr', 'email_72hr', 'email_1week', 'sms_recovery', 'discount_offer')),
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  converted_at TIMESTAMP WITH TIME ZONE,
  email_address TEXT,
  phone_number TEXT,
  discount_code TEXT,
  discount_percentage DECIMAL(5,2),
  message_content TEXT,
  subject_line TEXT,
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'clicked', 'converted', 'failed'))
);

-- Daily cart analytics snapshots for reporting
CREATE TABLE public.cart_analytics_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  total_carts_created INTEGER DEFAULT 0,
  total_carts_abandoned INTEGER DEFAULT 0,
  total_carts_converted INTEGER DEFAULT 0,
  abandonment_rate DECIMAL(5,2) DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  avg_cart_value DECIMAL(10,2) DEFAULT 0,
  avg_session_duration INTEGER DEFAULT 0,
  recovery_emails_sent INTEGER DEFAULT 0,
  recovery_conversions INTEGER DEFAULT 0,
  recovery_rate DECIMAL(5,2) DEFAULT 0,
  revenue_recovered DECIMAL(10,2) DEFAULT 0,
  top_abandoned_products JSONB DEFAULT '[]',
  customer_segments JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(snapshot_date)
);

-- Customer engagement metrics
CREATE TABLE public.customer_engagement_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  email TEXT,
  customer_segment TEXT CHECK (customer_segment IN ('new', 'returning', 'vip', 'at_risk', 'churned')),
  lifetime_value DECIMAL(10,2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  total_abandoned_carts INTEGER DEFAULT 0,
  avg_order_value DECIMAL(10,2) DEFAULT 0,
  days_since_last_order INTEGER,
  days_since_last_visit INTEGER,
  email_engagement_score DECIMAL(3,2) DEFAULT 0, -- 0-1 scale
  preferred_contact_time TIME,
  preferred_contact_day TEXT,
  last_cart_abandonment_at TIMESTAMP WITH TIME ZONE,
  recovery_success_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(email)
);

-- Enhanced cart items tracking with more context
CREATE TABLE public.enhanced_cart_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cart_session_id UUID REFERENCES cart_sessions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  product_price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  removed_at TIMESTAMP WITH TIME ZONE,
  time_in_cart INTEGER, -- seconds
  checkout_reached BOOLEAN DEFAULT false,
  payment_attempted BOOLEAN DEFAULT false,
  purchased BOOLEAN DEFAULT false,
  abandonment_reason TEXT,
  product_category TEXT,
  product_sku TEXT
);

-- Enable Row Level Security
ALTER TABLE public.cart_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_abandonment_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_engagement_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enhanced_cart_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cart_sessions
CREATE POLICY "Admins can manage all cart sessions" 
ON public.cart_sessions 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Users can view their own cart sessions" 
ON public.cart_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create cart sessions" 
ON public.cart_sessions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update cart sessions" 
ON public.cart_sessions 
FOR UPDATE 
USING (true);

-- RLS Policies for cart_abandonment_campaigns
CREATE POLICY "Admins can manage all campaigns" 
ON public.cart_abandonment_campaigns 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "System can create campaigns" 
ON public.cart_abandonment_campaigns 
FOR INSERT 
WITH CHECK (true);

-- RLS Policies for cart_analytics_snapshots
CREATE POLICY "Admins can view analytics snapshots" 
ON public.cart_analytics_snapshots 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "System can manage analytics snapshots" 
ON public.cart_analytics_snapshots 
FOR ALL 
USING (true);

-- RLS Policies for customer_engagement_metrics
CREATE POLICY "Admins can view customer metrics" 
ON public.customer_engagement_metrics 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "System can manage customer metrics" 
ON public.customer_engagement_metrics 
FOR ALL 
USING (true);

-- RLS Policies for enhanced_cart_tracking
CREATE POLICY "Admins can view enhanced cart tracking" 
ON public.enhanced_cart_tracking 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "System can manage enhanced cart tracking" 
ON public.enhanced_cart_tracking 
FOR ALL 
USING (true);

-- Indexes for performance
CREATE INDEX idx_cart_sessions_user_id ON cart_sessions(user_id);
CREATE INDEX idx_cart_sessions_session_id ON cart_sessions(session_id);
CREATE INDEX idx_cart_sessions_abandoned_at ON cart_sessions(abandoned_at);
CREATE INDEX idx_cart_sessions_created_at ON cart_sessions(created_at);
CREATE INDEX idx_cart_abandonment_campaigns_session_id ON cart_abandonment_campaigns(cart_session_id);
CREATE INDEX idx_cart_abandonment_campaigns_sent_at ON cart_abandonment_campaigns(sent_at);
CREATE INDEX idx_customer_engagement_user_id ON customer_engagement_metrics(user_id);
CREATE INDEX idx_customer_engagement_email ON customer_engagement_metrics(email);
CREATE INDEX idx_enhanced_cart_tracking_session_id ON enhanced_cart_tracking(cart_session_id);
CREATE INDEX idx_enhanced_cart_tracking_product_id ON enhanced_cart_tracking(product_id);

-- Triggers for automatic updates
CREATE OR REPLACE FUNCTION public.update_cart_session_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update cart session when items are added/removed
  IF TG_OP = 'INSERT' THEN
    UPDATE cart_sessions 
    SET 
      item_count = (
        SELECT COUNT(*) 
        FROM enhanced_cart_tracking 
        WHERE cart_session_id = NEW.cart_session_id AND removed_at IS NULL
      ),
      total_value = (
        SELECT COALESCE(SUM(product_price * quantity), 0) 
        FROM enhanced_cart_tracking 
        WHERE cart_session_id = NEW.cart_session_id AND removed_at IS NULL
      ),
      updated_at = now()
    WHERE id = NEW.cart_session_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cart_metrics_trigger
  AFTER INSERT OR UPDATE OR DELETE ON enhanced_cart_tracking
  FOR EACH ROW EXECUTE FUNCTION update_cart_session_metrics();

-- Function to update customer engagement metrics
CREATE OR REPLACE FUNCTION public.update_customer_engagement()
RETURNS TRIGGER AS $$
DECLARE
  customer_email TEXT;
  customer_id UUID;
BEGIN
  -- Get customer info from cart session
  SELECT cs.email, cs.user_id INTO customer_email, customer_id
  FROM cart_sessions cs 
  WHERE cs.id = COALESCE(NEW.cart_session_id, OLD.cart_session_id);
  
  IF customer_email IS NOT NULL OR customer_id IS NOT NULL THEN
    INSERT INTO customer_engagement_metrics (user_id, email, last_cart_abandonment_at, total_abandoned_carts)
    VALUES (
      customer_id, 
      customer_email, 
      CASE WHEN TG_OP = 'UPDATE' AND NEW.abandoned_at IS NOT NULL THEN NEW.abandoned_at ELSE NULL END,
      1
    )
    ON CONFLICT (COALESCE(user_id, gen_random_uuid())) DO UPDATE SET
      last_cart_abandonment_at = CASE WHEN NEW.abandoned_at IS NOT NULL THEN NEW.abandoned_at ELSE customer_engagement_metrics.last_cart_abandonment_at END,
      total_abandoned_carts = customer_engagement_metrics.total_abandoned_carts + 1,
      updated_at = now();
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customer_engagement_trigger
  AFTER UPDATE ON cart_sessions
  FOR EACH ROW EXECUTE FUNCTION update_customer_engagement();