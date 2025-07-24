-- Check and create storage policies for site-images bucket for banner uploads

-- First, ensure the site-images bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-images',
  'site-images', 
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Create storage policies for site-images bucket
DO $$
BEGIN
  -- Check if policies already exist before creating them
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public can view site images'
  ) THEN
    CREATE POLICY "Public can view site images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'site-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Superadmins can upload site images'
  ) THEN
    CREATE POLICY "Superadmins can upload site images"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'site-images' AND has_role(auth.uid(), 'superadmin'::app_role));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Superadmins can update site images'
  ) THEN
    CREATE POLICY "Superadmins can update site images"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'site-images' AND has_role(auth.uid(), 'superadmin'::app_role));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Superadmins can delete site images'
  ) THEN
    CREATE POLICY "Superadmins can delete site images"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'site-images' AND has_role(auth.uid(), 'superadmin'::app_role));
  END IF;
END $$;