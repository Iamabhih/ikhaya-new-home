-- Clean up payment-related data and tables
-- Remove all PayFast specific configuration data

-- Update payment methods to deactivate PayFast and PayFlex
UPDATE payment_methods 
SET is_active = false 
WHERE type IN ('payfast', 'payflex');

-- Clear any pending payment transactions
UPDATE payment_transactions 
SET status = 'cancelled'
WHERE status = 'pending';

-- Add comment to track cleanup
SELECT 'Payment integrations cleaned up - all Stripe and PayFast code removed' as cleanup_status;