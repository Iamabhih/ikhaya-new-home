-- Create trader_applications table for storing complete application data
CREATE TABLE IF NOT EXISTS public.trader_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Company Information
    company_name TEXT NOT NULL,
    trading_name TEXT,
    vat_number TEXT,
    registration_number TEXT,
    business_type TEXT NOT NULL,

    -- Contact Information
    contact_person TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,

    -- Business Address
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    province TEXT NOT NULL,
    postal_code TEXT NOT NULL,

    -- Additional Information
    years_in_business TEXT,
    estimated_monthly_orders TEXT,
    additional_info TEXT,

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_trader_applications_status ON public.trader_applications(status);
CREATE INDEX IF NOT EXISTS idx_trader_applications_user_id ON public.trader_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_trader_applications_created_at ON public.trader_applications(created_at DESC);

-- Enable RLS
ALTER TABLE public.trader_applications ENABLE ROW LEVEL SECURITY;

-- Policies for trader_applications
-- Users can view their own applications
CREATE POLICY "Users can view own applications"
    ON public.trader_applications
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can insert their own applications
CREATE POLICY "Users can insert own applications"
    ON public.trader_applications
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Anonymous users can submit applications
CREATE POLICY "Anonymous can submit applications"
    ON public.trader_applications
    FOR INSERT
    TO anon
    WITH CHECK (user_id IS NULL);

-- Admins can view all applications
CREATE POLICY "Admins can view all applications"
    ON public.trader_applications
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role IN ('admin', 'manager')
        )
    );

-- Admins can update applications (for approval/rejection)
CREATE POLICY "Admins can update applications"
    ON public.trader_applications
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role IN ('admin', 'manager')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role IN ('admin', 'manager')
        )
    );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_trader_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trader_applications_updated_at ON public.trader_applications;
CREATE TRIGGER trader_applications_updated_at
    BEFORE UPDATE ON public.trader_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_trader_applications_updated_at();

-- Create function to approve a trader application
CREATE OR REPLACE FUNCTION approve_trader_application(
    application_id UUID,
    admin_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    app_record RECORD;
BEGIN
    -- Verify caller is admin/manager
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'manager')
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can approve applications';
    END IF;

    -- Get the application
    SELECT * INTO app_record FROM public.trader_applications WHERE id = application_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Application not found';
    END IF;

    -- Update application status
    UPDATE public.trader_applications
    SET
        status = 'approved',
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        review_notes = admin_notes
    WHERE id = application_id;

    -- If user_id exists, update their profile and assign wholesale role
    IF app_record.user_id IS NOT NULL THEN
        -- Update profile
        UPDATE public.profiles
        SET
            company_name = app_record.company_name,
            vat_number = app_record.vat_number,
            phone = COALESCE(app_record.phone, phone),
            billing_address = app_record.address || ', ' || app_record.city || ', ' || app_record.province || ', ' || app_record.postal_code,
            wholesale_approved = true
        WHERE id = app_record.user_id;

        -- Assign wholesale role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (app_record.user_id, 'wholesale')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;

    RETURN TRUE;
END;
$$;

-- Create function to reject a trader application
CREATE OR REPLACE FUNCTION reject_trader_application(
    application_id UUID,
    admin_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verify caller is admin/manager
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'manager')
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can reject applications';
    END IF;

    -- Update application status
    UPDATE public.trader_applications
    SET
        status = 'rejected',
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        review_notes = admin_notes
    WHERE id = application_id;

    RETURN TRUE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION approve_trader_application TO authenticated;
GRANT EXECUTE ON FUNCTION reject_trader_application TO authenticated;
