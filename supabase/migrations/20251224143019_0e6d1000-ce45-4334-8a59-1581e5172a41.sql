-- Create centralized application logs table for comprehensive end-to-end logging
CREATE TABLE public.application_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'fatal')),
  category TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'frontend',
  function_name TEXT,
  message TEXT NOT NULL,
  user_id UUID,
  session_id TEXT,
  correlation_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  error_stack TEXT,
  duration_ms INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  page_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_app_logs_timestamp ON application_logs(timestamp DESC);
CREATE INDEX idx_app_logs_level ON application_logs(level);
CREATE INDEX idx_app_logs_category ON application_logs(category);
CREATE INDEX idx_app_logs_user_id ON application_logs(user_id);
CREATE INDEX idx_app_logs_correlation_id ON application_logs(correlation_id);
CREATE INDEX idx_app_logs_session_id ON application_logs(session_id);
CREATE INDEX idx_app_logs_source ON application_logs(source);
CREATE INDEX idx_app_logs_created_at ON application_logs(created_at DESC);

-- Create composite index for common query patterns
CREATE INDEX idx_app_logs_level_category ON application_logs(level, category);
CREATE INDEX idx_app_logs_timestamp_level ON application_logs(timestamp DESC, level);

-- Add comment for documentation
COMMENT ON TABLE application_logs IS 'Centralized logging table for all application events including auth, cart, checkout, payment, errors, and admin operations';

-- Enable Row Level Security
ALTER TABLE application_logs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert logs (needed for frontend logging)
CREATE POLICY "Anyone can insert logs" 
ON application_logs FOR INSERT 
WITH CHECK (true);

-- Only admins and superadmins can read logs
CREATE POLICY "Admins can read logs" 
ON application_logs FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Only superadmins can delete logs (for cleanup)
CREATE POLICY "Superadmins can delete logs" 
ON application_logs FOR DELETE 
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Create function to clean up old logs (older than 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_application_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.application_logs 
  WHERE created_at < now() - interval '30 days';
END;
$$;