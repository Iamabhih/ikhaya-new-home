-- Add promotion_type column to weekly_promotions table
ALTER TABLE public.weekly_promotions 
ADD COLUMN IF NOT EXISTS promotion_type text NOT NULL DEFAULT 'retail';

-- Add check constraint for valid values
ALTER TABLE public.weekly_promotions 
ADD CONSTRAINT weekly_promotions_type_check 
CHECK (promotion_type IN ('trader', 'retail'));

-- Update existing promotions based on title keywords
UPDATE public.weekly_promotions 
SET promotion_type = 'trader' 
WHERE LOWER(title) LIKE '%trader%' OR LOWER(title) LIKE '%wholesale%';

-- Create index for filtering by type
CREATE INDEX IF NOT EXISTS idx_weekly_promotions_type ON public.weekly_promotions(promotion_type);