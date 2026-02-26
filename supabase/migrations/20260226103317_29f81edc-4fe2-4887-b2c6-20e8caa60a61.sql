-- Add override_price column to cart_items for campaign/promotional price overrides
ALTER TABLE public.cart_items 
ADD COLUMN override_price numeric NULL;

COMMENT ON COLUMN public.cart_items.override_price IS 'Campaign or promotional price override. When NULL, the product regular price applies.';