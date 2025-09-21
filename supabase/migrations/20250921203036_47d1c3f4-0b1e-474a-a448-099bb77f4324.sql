-- Add performance indexes for order queries
-- Note: Not using CONCURRENTLY since it cannot run in a transaction block

-- Create indexes for better order query performance
CREATE INDEX IF NOT EXISTS idx_orders_status_created_at ON public.orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_status ON public.orders(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_orders_email_created_at ON public.orders(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_id_created_at ON public.orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_timeline_order_id ON public.order_timeline(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_notes_order_id ON public.order_notes(order_id, created_at DESC);

-- Add index for order search by order number
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);

-- Add index for analytics events filtering
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON public.analytics_events(event_type, created_at DESC);

-- Add missing index for products search
CREATE INDEX IF NOT EXISTS idx_products_active_created_at ON public.products(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_stock_quantity ON public.products(stock_quantity) WHERE stock_quantity IS NOT NULL;

-- Add index for cart sessions
CREATE INDEX IF NOT EXISTS idx_cart_sessions_email ON public.cart_sessions(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cart_sessions_user_id ON public.cart_sessions(user_id) WHERE user_id IS NOT NULL;