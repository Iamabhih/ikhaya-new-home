-- Temporarily disable hiding products without images so we can see all products
UPDATE site_settings 
SET setting_value = 'false'::jsonb 
WHERE setting_key = 'hide_products_without_images';