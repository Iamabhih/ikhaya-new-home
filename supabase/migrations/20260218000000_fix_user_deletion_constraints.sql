-- Fix FK constraints so deleting a user from Supabase auth dashboard
-- cascades correctly without orphaned records causing errors.

-- orders.user_id: preserve orders but unlink them when user is deleted
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_user_id_fkey;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id)
  ON DELETE SET NULL;

-- cart_sessions.user_id: delete sessions when user is deleted
ALTER TABLE public.cart_sessions
  DROP CONSTRAINT IF EXISTS cart_sessions_user_id_fkey;

ALTER TABLE public.cart_sessions
  ADD CONSTRAINT cart_sessions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- pending_orders.user_id: unlink pending orders when user is deleted
ALTER TABLE public.pending_orders
  DROP CONSTRAINT IF EXISTS pending_orders_user_id_fkey;

ALTER TABLE public.pending_orders
  ADD CONSTRAINT pending_orders_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id)
  ON DELETE SET NULL;

-- Ensure profiles cascade when auth.users is deleted
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id)
  ON DELETE CASCADE;
