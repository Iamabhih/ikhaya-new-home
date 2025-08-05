-- Add mobile number field to newsletter subscriptions
ALTER TABLE public.newsletter_subscriptions 
ADD COLUMN mobile_number TEXT;

-- Create index for mobile number
CREATE INDEX idx_newsletter_subscriptions_mobile ON public.newsletter_subscriptions(mobile_number);