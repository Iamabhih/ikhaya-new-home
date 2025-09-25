-- Drop existing materialized view and recreate as regular view
DROP MATERIALIZED VIEW IF EXISTS clean_customer_analytics CASCADE;

-- Create the customer analytics view with correct schema
CREATE OR REPLACE VIEW clean_customer_analytics AS
WITH customer_stats AS (
  SELECT 
    profiles.id,
    profiles.id as user_id,
    COALESCE(NULLIF(CONCAT(profiles.first_name, ' ', profiles.last_name), ' '), profiles.email, 'Anonymous') as display_name,
    profiles.email,
    profiles.created_at as registration_date,
    COUNT(DISTINCT o.id) as total_orders,
    COALESCE(SUM(o.total_amount), 0) as total_spent,
    MAX(o.created_at) as last_order_date,
    COALESCE(AVG(o.total_amount), 0) as avg_order_value
  FROM profiles 
  LEFT JOIN orders o ON profiles.id = o.user_id
  WHERE o.status IN ('processing', 'shipped', 'delivered', 'completed') OR o.id IS NULL
  GROUP BY profiles.id, profiles.email, profiles.first_name, profiles.last_name, profiles.created_at
)
SELECT 
  id,
  user_id,
  display_name,
  email,
  registration_date,
  total_orders,
  total_spent,
  last_order_date,
  avg_order_value,
  CASE 
    WHEN total_spent > 5000 THEN 'VIP'
    WHEN total_orders >= 5 THEN 'Loyal'
    WHEN total_orders >= 2 THEN 'Regular'
    ELSE 'New'
  END as customer_segment
FROM customer_stats;