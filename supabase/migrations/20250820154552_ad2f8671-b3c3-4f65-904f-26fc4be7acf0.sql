-- Create table for batch progress tracking
CREATE TABLE IF NOT EXISTS public.batch_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'running',
  progress numeric NOT NULL DEFAULT 0,
  current_batch integer NOT NULL DEFAULT 0,
  total_batches integer NOT NULL DEFAULT 0,
  links_created integer NOT NULL DEFAULT 0,
  candidates_created integer NOT NULL DEFAULT 0,
  errors jsonb DEFAULT '[]'::jsonb,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.batch_progress ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to manage batch progress
CREATE POLICY "Admins can manage batch progress" ON public.batch_progress
  FOR ALL USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'superadmin'::app_role)
  );

-- Create policy for system to manage batch progress
CREATE POLICY "System can manage batch progress" ON public.batch_progress
  FOR ALL USING (true);

-- Add trigger to update updated_at
CREATE TRIGGER update_batch_progress_updated_at
  BEFORE UPDATE ON public.batch_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Clean up old progress records (older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_batch_progress()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.batch_progress 
  WHERE started_at < now() - interval '24 hours';
END;
$$;