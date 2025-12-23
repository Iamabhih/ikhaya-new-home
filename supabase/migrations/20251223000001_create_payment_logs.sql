-- Create payment_logs table for tracking PayFast webhook events and errors
CREATE TABLE IF NOT EXISTS public.payment_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Payment reference and status
    payment_id TEXT NOT NULL,
    m_payment_id TEXT, -- Order reference
    pf_payment_id TEXT, -- PayFast internal payment ID
    payment_status TEXT NOT NULL,

    -- Event tracking
    event_type TEXT NOT NULL, -- 'webhook_received', 'signature_verified', 'processing_started', 'processing_completed', 'processing_failed', etc.
    event_data JSONB, -- Full payload or additional data

    -- Error tracking
    error_message TEXT,
    error_details JSONB,

    -- Metadata
    ip_address TEXT,
    user_agent TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Indexing
    CONSTRAINT payment_logs_event_type_check CHECK (event_type IN (
        'webhook_received',
        'signature_verified',
        'signature_failed',
        'processing_started',
        'processing_completed',
        'processing_failed',
        'retry_attempted',
        'order_created',
        'order_failed',
        'pending_order_not_found',
        'invalid_payload'
    ))
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payment_logs_payment_id ON public.payment_logs(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_m_payment_id ON public.payment_logs(m_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_created_at ON public.payment_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_logs_event_type ON public.payment_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_payment_logs_payment_status ON public.payment_logs(payment_status);

-- Enable RLS
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Service role can do everything (for edge functions)
CREATE POLICY "Service role can manage all payment logs"
    ON public.payment_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Authenticated users can view their own payment logs
CREATE POLICY "Users can view their own payment logs"
    ON public.payment_logs
    FOR SELECT
    TO authenticated
    USING (
        m_payment_id IN (
            SELECT order_number FROM public.orders WHERE user_id = auth.uid()
        )
        OR m_payment_id IN (
            SELECT order_reference FROM public.pending_orders WHERE user_id = auth.uid()
        )
    );

-- Add comment
COMMENT ON TABLE public.payment_logs IS 'Logs all PayFast webhook events and payment processing activities for debugging and audit purposes';
