-- Fix the create_user_from_order function to use gen_random_uuid instead of gen_random_bytes
CREATE OR REPLACE FUNCTION public.create_user_from_order(p_email text, p_first_name text DEFAULT NULL::text, p_last_name text DEFAULT NULL::text, p_order_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_user_id UUID;
  temp_password TEXT;
BEGIN
  -- Generate a temporary password using gen_random_uuid
  temp_password := replace(gen_random_uuid()::text, '-', '');
  
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
$function$;