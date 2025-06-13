
-- Step 1: Create first admin user (promote existing user to superadmin)
-- This will promote the first user in the profiles table to superadmin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'superadmin'::app_role
FROM public.profiles 
WHERE email = (SELECT email FROM public.profiles ORDER BY created_at LIMIT 1)
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = profiles.id AND role = 'superadmin'
);

-- Step 2: Add RLS policies for cart_items table (only if not exists)
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view own cart items" ON public.cart_items;
CREATE POLICY "Users can view own cart items" ON public.cart_items
FOR SELECT USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
  (auth.uid() IS NULL AND session_id IS NOT NULL)
);

DROP POLICY IF EXISTS "Users can insert own cart items" ON public.cart_items;
CREATE POLICY "Users can insert own cart items" ON public.cart_items
FOR INSERT WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid() AND session_id IS NULL) OR
  (auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL)
);

DROP POLICY IF EXISTS "Users can update own cart items" ON public.cart_items;
CREATE POLICY "Users can update own cart items" ON public.cart_items
FOR UPDATE USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
  (auth.uid() IS NULL AND session_id IS NOT NULL)
);

DROP POLICY IF EXISTS "Users can delete own cart items" ON public.cart_items;
CREATE POLICY "Users can delete own cart items" ON public.cart_items
FOR DELETE USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
  (auth.uid() IS NULL AND session_id IS NOT NULL)
);

DROP POLICY IF EXISTS "Admins can view all cart items" ON public.cart_items;
CREATE POLICY "Admins can view all cart items" ON public.cart_items
FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')
);

-- Step 3: Add RLS policies for profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')
);

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')
);

-- Step 4: Add RLS policies for user_roles table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Superadmins can insert roles" ON public.user_roles;
CREATE POLICY "Superadmins can insert roles" ON public.user_roles
FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'superadmin')
);

DROP POLICY IF EXISTS "Superadmins can delete roles" ON public.user_roles;
CREATE POLICY "Superadmins can delete roles" ON public.user_roles
FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'superadmin')
);

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles
FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')
);

-- Step 5: Add RLS policies for orders table
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders" ON public.orders
FOR SELECT USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
  (auth.uid() IS NULL AND email IS NOT NULL)
);

DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
CREATE POLICY "Users can insert own orders" ON public.orders
FOR INSERT WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
  (auth.uid() IS NULL AND user_id IS NULL)
);

DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders" ON public.orders
FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')
);

DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;
CREATE POLICY "Admins can update all orders" ON public.orders
FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')
);

-- Step 6: Add RLS policies for analytics_events table
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert analytics events" ON public.analytics_events;
CREATE POLICY "Users can insert analytics events" ON public.analytics_events
FOR INSERT WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
  (auth.uid() IS NULL AND user_id IS NULL)
);

DROP POLICY IF EXISTS "Admins can view all analytics events" ON public.analytics_events;
CREATE POLICY "Admins can view all analytics events" ON public.analytics_events
FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')
);

-- Step 7: Create function to initialize admin user
CREATE OR REPLACE FUNCTION public.create_admin_user(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Get user ID from email
  SELECT id INTO target_user_id 
  FROM public.profiles 
  WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Add admin role if not exists
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN true;
END;
$$;

-- Step 8: Create function to promote user to superadmin
CREATE OR REPLACE FUNCTION public.create_superadmin_user(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Get user ID from email
  SELECT id INTO target_user_id 
  FROM public.profiles 
  WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Add superadmin role if not exists
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'superadmin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN true;
END;
$$;
