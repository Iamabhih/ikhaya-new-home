-- Update storage bucket to allow PDF files and other document types
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]
WHERE id = 'site-images';

-- If the column doesn't exist, we need to add it
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'storage' 
    AND table_name = 'buckets' 
    AND column_name = 'allowed_mime_types'
  ) THEN
    ALTER TABLE storage.buckets ADD COLUMN allowed_mime_types text[];
    
    -- Set allowed mime types for existing buckets
    UPDATE storage.buckets 
    SET allowed_mime_types = ARRAY[
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
    WHERE id IN ('site-images', 'product-images');
  END IF;
END $$;