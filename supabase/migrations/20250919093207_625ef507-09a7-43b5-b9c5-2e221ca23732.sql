-- Phase 1: Fix User Account Creation System

-- Create the handle_new_user function if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  
  -- Assign default customer role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  
  -- Create email preferences
  INSERT INTO public.email_preferences (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic user profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to create user account for anonymous orders
CREATE OR REPLACE FUNCTION public.create_user_from_order(
  p_email TEXT,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_order_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id UUID;
  temp_password TEXT;
BEGIN
  -- Generate a temporary password
  temp_password := encode(gen_random_bytes(12), 'base64');
  
  -- Create the auth user (this will trigger our handle_new_user function)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data,
    is_sso_user
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt(temp_password, gen_salt('bf')),
    now(),
    now(),
    now(),
    jsonb_build_object(
      'first_name', COALESCE(p_first_name, ''),
      'last_name', COALESCE(p_last_name, ''),
      'created_from_order', true
    ),
    false
  ) RETURNING id INTO new_user_id;
  
  -- Link the order to this new user if order_id provided
  IF p_order_id IS NOT NULL THEN
    UPDATE public.orders 
    SET user_id = new_user_id
    WHERE id = p_order_id;
  END IF;
  
  -- Log the account creation
  INSERT INTO public.analytics_events (
    user_id, event_type, event_name, metadata
  ) VALUES (
    new_user_id, 'account', 'user_created_from_order',
    jsonb_build_object('order_id', p_order_id, 'email', p_email)
  );
  
  RETURN new_user_id;
END;
$$;

-- Function to link anonymous orders to existing users
CREATE OR REPLACE FUNCTION public.link_anonymous_orders_to_user(
  p_user_id UUID,
  p_email TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  linked_count INTEGER := 0;
BEGIN
  -- Link orders that match the email but have no user_id
  UPDATE public.orders 
  SET user_id = p_user_id, updated_at = now()
  WHERE email = p_email AND user_id IS NULL;
  
  GET DIAGNOSTICS linked_count = ROW_COUNT;
  
  -- Log the linking
  IF linked_count > 0 THEN
    INSERT INTO public.analytics_events (
      user_id, event_type, event_name, metadata
    ) VALUES (
      p_user_id, 'account', 'orders_linked_to_user',
      jsonb_build_object('linked_orders', linked_count, 'email', p_email)
    );
  END IF;
  
  RETURN linked_count;
END;
$$;

-- Enhanced pending orders cleanup with better expiration handling
CREATE OR REPLACE FUNCTION public.cleanup_expired_pending_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete pending orders older than 2 hours (giving more time for PayFast webhook)
  DELETE FROM public.pending_orders 
  WHERE created_at < now() - interval '2 hours';
END;
$$;