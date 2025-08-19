-- Add maintenance banner settings
INSERT INTO site_settings (setting_key, setting_value, description) VALUES 
  ('maintenance_banner_enabled', 'false', 'Whether to show the maintenance banner'),
  ('maintenance_banner_text', '"Currently under maintenance, please contact us on Whatsapp if you have any queries or technical trouble 060 578 7905"', 'Text to display in the maintenance banner')
ON CONFLICT (setting_key) DO NOTHING;