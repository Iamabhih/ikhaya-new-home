-- Create system_change_logs table for tracking changes from lovable.dev and other sources
-- This table logs all significant system changes for audit and debugging purposes

CREATE TABLE IF NOT EXISTS public.system_change_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    
    -- Change identification
    change_type VARCHAR(50) NOT NULL, -- 'migration', 'schema_change', 'config_update', 'data_import', etc.
    source_system VARCHAR(50) NOT NULL, -- 'lovable', 'supabase', 'manual', 'automated', etc.
    component VARCHAR(100), -- affected component/module
    
    -- Change details
    description TEXT NOT NULL,
    change_data JSONB, -- structured data about the change
    previous_state JSONB, -- state before change (if applicable)
    new_state JSONB, -- state after change
    
    -- User tracking
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'completed', -- 'pending', 'completed', 'failed', 'rolled_back'
    error_message TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    tags TEXT[], -- for categorization and filtering
    
    -- Audit
    version VARCHAR(20), -- version number if applicable
    git_commit VARCHAR(40), -- git commit hash if applicable
    
    -- Constraints
    CONSTRAINT valid_change_type CHECK (change_type IN (
        'migration', 'schema_change', 'config_update', 'data_import', 
        'feature_toggle', 'deployment', 'rollback', 'manual_fix', 'other'
    )),
    CONSTRAINT valid_status CHECK (status IN (
        'pending', 'completed', 'failed', 'rolled_back'
    ))
);

-- Create indexes for common queries
CREATE INDEX idx_system_change_logs_created_at ON public.system_change_logs(created_at DESC);
CREATE INDEX idx_system_change_logs_change_type ON public.system_change_logs(change_type);
CREATE INDEX idx_system_change_logs_source_system ON public.system_change_logs(source_system);
CREATE INDEX idx_system_change_logs_status ON public.system_change_logs(status);
CREATE INDEX idx_system_change_logs_user_id ON public.system_change_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_system_change_logs_component ON public.system_change_logs(component) WHERE component IS NOT NULL;
CREATE INDEX idx_system_change_logs_tags ON public.system_change_logs USING gin(tags);

-- Enable Row Level Security
ALTER TABLE public.system_change_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all change logs
CREATE POLICY "Admins can view all change logs"
    ON public.system_change_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: System can insert change logs
CREATE POLICY "System can insert change logs"
    ON public.system_change_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create function to log system changes
CREATE OR REPLACE FUNCTION public.log_system_change(
    p_change_type VARCHAR,
    p_source_system VARCHAR,
    p_description TEXT,
    p_component VARCHAR DEFAULT NULL,
    p_change_data JSONB DEFAULT NULL,
    p_previous_state JSONB DEFAULT NULL,
    p_new_state JSONB DEFAULT NULL,
    p_tags TEXT[] DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
    v_user_email VARCHAR;
BEGIN
    -- Get user email if authenticated
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = auth.uid();
    
    INSERT INTO public.system_change_logs (
        change_type,
        source_system,
        component,
        description,
        change_data,
        previous_state,
        new_state,
        user_id,
        user_email,
        tags,
        metadata
    ) VALUES (
        p_change_type,
        p_source_system,
        p_component,
        p_description,
        p_change_data,
        p_previous_state,
        p_new_state,
        auth.uid(),
        v_user_email,
        p_tags,
        COALESCE(p_metadata, '{}'::jsonb)
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.log_system_change TO authenticated, anon;

-- Comment on table
COMMENT ON TABLE public.system_change_logs IS 'Tracks all system changes from lovable.dev, Supabase, and manual operations for audit and debugging';
