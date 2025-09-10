-- Create processing sessions table for persistent session storage
CREATE TABLE IF NOT EXISTS public.processing_sessions (
  id text PRIMARY KEY,
  session_type text NOT NULL DEFAULT 'master_image_linker',
  status text NOT NULL DEFAULT 'running',
  progress numeric NOT NULL DEFAULT 0,
  current_batch integer NOT NULL DEFAULT 0,
  total_batches integer NOT NULL DEFAULT 0,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  
  -- Progress tracking
  products_scanned integer NOT NULL DEFAULT 0,
  images_scanned integer NOT NULL DEFAULT 0,
  links_created integer NOT NULL DEFAULT 0,
  candidates_created integer NOT NULL DEFAULT 0,
  
  -- Statistics and metadata
  matching_stats jsonb DEFAULT '{"exact": 0, "padded": 0, "fuzzy": 0, "no_match": 0}'::jsonb,
  processing_stats jsonb DEFAULT '{"start_time": null, "processing_rate": 0, "estimated_completion": null}'::jsonb,
  errors jsonb DEFAULT '[]'::jsonb,
  warnings jsonb DEFAULT '[]'::jsonb,
  
  -- Configuration
  options jsonb DEFAULT '{}'::jsonb,
  
  -- User tracking
  created_by uuid REFERENCES auth.users(id),
  
  CONSTRAINT valid_progress CHECK (progress >= 0 AND progress <= 100),
  CONSTRAINT valid_status CHECK (status IN ('running', 'completed', 'paused', 'failed', 'cancelled'))
);

-- Enable RLS
ALTER TABLE public.processing_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all processing sessions" 
ON public.processing_sessions 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "System can manage processing sessions" 
ON public.processing_sessions 
FOR ALL 
USING (true);

-- Create indexes for performance
CREATE INDEX idx_processing_sessions_status ON public.processing_sessions(status);
CREATE INDEX idx_processing_sessions_type ON public.processing_sessions(session_type);
CREATE INDEX idx_processing_sessions_created_by ON public.processing_sessions(created_by);

-- Create trigger for updated_at
CREATE TRIGGER update_processing_sessions_updated_at
  BEFORE UPDATE ON public.processing_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add function to clean up old sessions
CREATE OR REPLACE FUNCTION public.cleanup_old_processing_sessions()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.processing_sessions 
  WHERE started_at < now() - interval '7 days'
    AND status IN ('completed', 'failed', 'cancelled');
END;
$$;