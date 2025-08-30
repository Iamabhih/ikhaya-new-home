UPDATE site_settings 
SET setting_value = 'true', updated_at = now() 
WHERE setting_key = 'hide_products_without_images';