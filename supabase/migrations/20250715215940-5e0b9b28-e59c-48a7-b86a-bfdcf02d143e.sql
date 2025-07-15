-- Create promotional banners table for homepage hero section management
CREATE TABLE public.promotional_banners (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    image_url TEXT,
    background_color TEXT DEFAULT '#ff4444',
    text_color TEXT DEFAULT '#ffffff',
    button_text TEXT,
    button_url TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on promotional banners
ALTER TABLE public.promotional_banners ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view active promotional banners
CREATE POLICY "Anyone can view active promotional banners" 
ON public.promotional_banners 
FOR SELECT 
USING (is_active = true AND (start_date IS NULL OR start_date <= now()) AND (end_date IS NULL OR end_date >= now()));

-- Allow superadmins to manage promotional banners
CREATE POLICY "Superadmins can manage promotional banners" 
ON public.promotional_banners 
FOR ALL 
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_promotional_banners_updated_at
BEFORE UPDATE ON public.promotional_banners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample promotional banners
INSERT INTO public.promotional_banners (title, subtitle, description, button_text, button_url, position, background_color, text_color) VALUES
('MEGA SALE', 'Up to 70% OFF', 'Limited time offer on all categories', 'Shop Sale', '/products?sale=true', 1, '#ff4444', '#ffffff'),
('Free Delivery', 'On orders over R650', 'Fast and reliable delivery to your door', 'Shop Now', '/products', 2, '#4444ff', '#ffffff'),
('New Arrivals', 'Fresh styles weekly', 'Discover the latest trends and products', 'Explore', '/products?new=true', 3, '#44ff44', '#000000');