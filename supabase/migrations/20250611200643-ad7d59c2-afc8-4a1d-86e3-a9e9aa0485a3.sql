
-- Add unique constraints to cart_items table to fix ON CONFLICT issues
-- First, remove any duplicate entries that might exist
DELETE FROM cart_items a USING cart_items b 
WHERE a.id > b.id 
AND a.product_id = b.product_id 
AND (
  (a.user_id = b.user_id AND a.user_id IS NOT NULL) OR 
  (a.session_id = b.session_id AND a.session_id IS NOT NULL)
);

-- Add unique constraint for authenticated users (user_id + product_id)
ALTER TABLE cart_items 
ADD CONSTRAINT cart_items_user_product_unique 
UNIQUE (user_id, product_id) 
DEFERRABLE INITIALLY DEFERRED;

-- Add unique constraint for guest users (session_id + product_id)  
ALTER TABLE cart_items 
ADD CONSTRAINT cart_items_session_product_unique 
UNIQUE (session_id, product_id) 
DEFERRABLE INITIALLY DEFERRED;

-- Add a check constraint to ensure either user_id or session_id is set
ALTER TABLE cart_items 
ADD CONSTRAINT cart_items_user_or_session_check 
CHECK (
  (user_id IS NOT NULL AND session_id IS NULL) OR 
  (user_id IS NULL AND session_id IS NOT NULL)
);
