-- Add encrypted API key column to shipping_settings
ALTER TABLE public.shipping_settings 
ADD COLUMN IF NOT EXISTS api_key_encrypted TEXT;

-- Add comment
COMMENT ON COLUMN public.shipping_settings.api_key_encrypted IS 'Encrypted ShipLogic API key stored from admin interface';