-- Create shipping_settings table for ShipLogic API configuration
CREATE TABLE public.shipping_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'shiplogic',
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  is_test_mode BOOLEAN NOT NULL DEFAULT true,
  collection_address JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_parcel JSONB NOT NULL DEFAULT '{"weight": 1, "length": 20, "width": 15, "height": 10}'::jsonb,
  service_levels JSONB NOT NULL DEFAULT '{"economy": true, "express": true, "overnight": true}'::jsonb,
  markup_percentage NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_provider UNIQUE (provider)
);

-- Create shipments table for tracking created shipments
CREATE TABLE public.shipments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  shiplogic_id TEXT,
  waybill_number TEXT,
  tracking_number TEXT,
  service_level TEXT,
  service_name TEXT,
  rate_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  label_url TEXT,
  collection_address JSONB,
  delivery_address JSONB,
  parcels JSONB,
  tracking_events JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.shipping_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- RLS policies for shipping_settings (admin only)
CREATE POLICY "Superadmins can manage shipping settings"
  ON public.shipping_settings
  FOR ALL
  USING (has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins can view shipping settings"
  ON public.shipping_settings
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- RLS policies for shipments
CREATE POLICY "Admins can manage all shipments"
  ON public.shipments
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Managers can view shipments"
  ON public.shipments
  FOR SELECT
  USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Users can view their order shipments"
  ON public.shipments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = shipments.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_shipments_order_id ON public.shipments(order_id);
CREATE INDEX idx_shipments_tracking_number ON public.shipments(tracking_number);
CREATE INDEX idx_shipments_status ON public.shipments(status);

-- Add trigger for updated_at on shipping_settings
CREATE TRIGGER update_shipping_settings_updated_at
  BEFORE UPDATE ON public.shipping_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on shipments
CREATE TRIGGER update_shipments_updated_at
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default shipping settings row
INSERT INTO public.shipping_settings (provider, is_enabled, is_test_mode)
VALUES ('shiplogic', false, true)
ON CONFLICT (provider) DO NOTHING;