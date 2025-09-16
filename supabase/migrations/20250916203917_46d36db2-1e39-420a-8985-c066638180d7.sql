-- Create pending_orders table to replace sessionStorage
CREATE TABLE public.pending_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users,
  cart_data JSONB NOT NULL,
  form_data JSONB NOT NULL,
  delivery_data JSONB NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '2 hours')
);

-- Enable RLS
ALTER TABLE public.pending_orders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own pending orders" 
ON public.pending_orders 
USING (auth.uid() = user_id OR user_id IS NULL);

-- Index for cleanup
CREATE INDEX idx_pending_orders_expires_at ON public.pending_orders(expires_at);

-- Function to cleanup expired pending orders
CREATE OR REPLACE FUNCTION cleanup_expired_pending_orders()
RETURNS void AS $$
BEGIN
  DELETE FROM public.pending_orders 
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;