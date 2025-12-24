-- Allow public read access to enabled payment gateways (needed for checkout)
-- This is secure because it only exposes enabled gateways and the merchant ID/key
-- are designed to be used in client-side payment forms
CREATE POLICY "Anyone can read enabled payment settings" 
  ON payment_settings
  FOR SELECT
  USING (is_enabled = true);