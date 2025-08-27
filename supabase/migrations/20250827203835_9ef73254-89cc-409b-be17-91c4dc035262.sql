-- Create weekly_promotions table for storing promotion files
CREATE TABLE public.weekly_promotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'pdf', 'image', etc.
  file_size BIGINT,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.weekly_promotions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view active promotions" 
ON public.weekly_promotions 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Superadmins can manage promotions" 
ON public.weekly_promotions 
FOR ALL 
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- Add site settings for promotions configuration (casting to JSONB)
INSERT INTO public.site_settings (setting_key, setting_value, description) VALUES
('promotions_page_enabled', 'true'::JSONB, 'Enable/disable the promotions page'),
('promotions_page_title', '"Weekly Promotions"'::JSONB, 'Title for the promotions page'),
('promotions_page_description', '"Check out our latest weekly promotions and special offers!"'::JSONB, 'Description for the promotions page'),
('promotions_auto_archive', 'true'::JSONB, 'Automatically archive old promotions');

-- Add trigger for updated_at
CREATE TRIGGER update_weekly_promotions_updated_at
BEFORE UPDATE ON public.weekly_promotions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();