-- Add overlay_opacity column to promotional_banners table
ALTER TABLE public.promotional_banners 
ADD COLUMN overlay_opacity NUMERIC DEFAULT 0.2;