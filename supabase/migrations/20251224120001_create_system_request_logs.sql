-- Create system_request_logs table for tracking API requests between lovable.dev and Supabase
-- This helps debug integration issues and monitor system health

CREATE TABLE IF NOT EXISTS public.system_request_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    
    -- Request identification
    request_id VARCHAR(100), -- unique request identifier
    correlation_id VARCHAR(100), -- for tracking related requests
    
    -- Request details
    method VARCHAR(10) NOT NULL, -- HTTP method: GET, POST, PUT, DELETE, etc.
    endpoint VARCHAR(500) NOT NULL, -- API endpoint/function name
    source_system VARCHAR(50) NOT NULL, -- 'lovable', 'frontend', 'edge_function', 'webhook', etc.
    target_system VARCHAR(50) NOT NULL, -- 'supabase', 'payfast', 'external_api', etc.
    
    -- Request/Response data
    request_headers JSONB, -- sanitized headers (no auth tokens)
    request_body JSONB, -- sanitized request body
    response_status INTEGER, -- HTTP status code
    response_body JSONB, -- sanitized response body
    response_time_ms INTEGER, -- response time in milliseconds
    
    -- User context
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_agent TEXT,
    ip_address INET,
    
    -- Status and errors
    status VARCHAR(20) DEFAULT 'success', -- 'success', 'error', 'timeout', 'cancelled'
    error_code VARCHAR(50),
    error_message TEXT,
    stack_trace TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    tags TEXT[], -- for categorization
    
    -- Performance tracking
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    
    -- Constraints
    CONSTRAINT valid_method CHECK (method IN (
        'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'
    )),
    CONSTRAINT valid_status CHECK (status IN (
        'success', 'error', 'timeout', 'cancelled', 'partial'
    ))
);

-- Create indexes for common queries
CREATE INDEX idx_system_request_logs_created_at ON public.system_request_logs(created_at DESC);
CREATE INDEX idx_system_request_logs_endpoint ON public.system_request_logs(endpoint);
CREATE INDEX idx_system_request_logs_method ON public.system_request_logs(method);
CREATE INDEX idx_system_request_logs_status ON public.system_request_logs(status);
CREATE INDEX idx_system_request_logs_source_system ON public.system_request_logs(source_system);
CREATE INDEX idx_system_request_logs_target_system ON public.system_request_logs(target_system);
CREATE INDEX idx_system_request_logs_user_id ON public.system_request_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_system_request_logs_request_id ON public.system_request_logs(request_id) WHERE request_id IS NOT NULL;
CREATE INDEX idx_system_request_logs_correlation_id ON public.system_request_logs(correlation_id) WHERE correlation_id IS NOT NULL;
CREATE INDEX idx_system_request_logs_response_status ON public.system_request_logs(response_status) WHERE response_status IS NOT NULL;

-- Create partial index for errors
CREATE INDEX idx_system_request_logs_errors ON public.system_request_logs(created_at DESC)
    WHERE status = 'error';

-- Enable Row Level Security
ALTER TABLE public.system_request_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all request logs
CREATE POLICY "Admins can view all request logs"
    ON public.system_request_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: System can insert request logs
CREATE POLICY "System can insert request logs"
    ON public.system_request_logs
    FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);

-- Create function to log API requests
CREATE OR REPLACE FUNCTION public.log_api_request(
    p_method VARCHAR,
    p_endpoint VARCHAR,
    p_source_system VARCHAR,
    p_target_system VARCHAR,
    p_response_status INTEGER DEFAULT NULL,
    p_response_time_ms INTEGER DEFAULT NULL,
    p_status VARCHAR DEFAULT 'success',
    p_request_id VARCHAR DEFAULT NULL,
    p_correlation_id VARCHAR DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.system_request_logs (
        method,
        endpoint,
        source_system,
        target_system,
        response_status,
        response_time_ms,
        status,
        request_id,
        correlation_id,
        error_message,
        user_id,
        metadata
    ) VALUES (
        p_method,
        p_endpoint,
        p_source_system,
        p_target_system,
        p_response_status,
        p_response_time_ms,
        p_status,
        p_request_id,
        p_correlation_id,
        p_error_message,
        auth.uid(),
        COALESCE(p_metadata, '{}'::jsonb)
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.log_api_request TO authenticated, anon;

-- Create view for recent errors
CREATE OR REPLACE VIEW public.recent_request_errors AS
SELECT 
    id,
    created_at,
    method,
    endpoint,
    source_system,
    target_system,
    response_status,
    error_message,
    response_time_ms
FROM public.system_request_logs
WHERE status = 'error'
    AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 100;

-- Grant access to view
GRANT SELECT ON public.recent_request_errors TO authenticated;

-- Create function for automatic cleanup (delete logs older than 90 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_request_logs()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM public.system_request_logs
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on table
COMMENT ON TABLE public.system_request_logs IS 'Tracks API requests between lovable.dev, frontend, and Supabase for debugging and monitoring';
COMMENT ON FUNCTION public.log_api_request IS 'Helper function to log API requests from edge functions and frontend';
COMMENT ON FUNCTION public.cleanup_old_request_logs IS 'Cleanup function to remove logs older than 90 days (run via cron job)';
