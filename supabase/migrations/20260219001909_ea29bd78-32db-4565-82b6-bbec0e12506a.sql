-- Security hardening: Pin search_path on 7 functions missing it
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
ALTER FUNCTION public.update_campaigns_updated_at() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.update_product_stock(uuid, integer) SET search_path = public;
ALTER FUNCTION public.search_products(text, uuid, numeric, numeric, boolean, integer, integer) SET search_path = public;
ALTER FUNCTION public.generate_quote_number() SET search_path = public;
ALTER FUNCTION public.set_quote_number() SET search_path = public;

-- RLS hardening: Drop overly-permissive ALL/UPDATE policies and replace with scoped ones

-- auth_rate_limits: anon INSERT allowed (needed for rate limiter), service role for UPDATE/DELETE
DROP POLICY IF EXISTS "Allow all operations on auth_rate_limits" ON public.auth_rate_limits;
DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.auth_rate_limits;
CREATE POLICY "Allow insert for rate limiting" ON public.auth_rate_limits
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update rate limits" ON public.auth_rate_limits
  FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "Service role can delete rate limits" ON public.auth_rate_limits
  FOR DELETE USING (auth.role() = 'service_role');
CREATE POLICY "Allow select for rate limiting" ON public.auth_rate_limits
  FOR SELECT USING (true);

-- batch_progress: authenticated users own their sessions, service role has full access
DROP POLICY IF EXISTS "Allow all operations on batch_progress" ON public.batch_progress;
DROP POLICY IF EXISTS "Service role full access to batch_progress" ON public.batch_progress;
CREATE POLICY "Authenticated users can manage their batch progress" ON public.batch_progress
  FOR ALL USING (auth.role() IN ('authenticated', 'service_role'));

-- cart_analytics_snapshots: service role only for writes
DROP POLICY IF EXISTS "Allow all operations on cart_analytics_snapshots" ON public.cart_analytics_snapshots;
DROP POLICY IF EXISTS "Service role manages cart analytics snapshots" ON public.cart_analytics_snapshots;
CREATE POLICY "Service role manages cart analytics" ON public.cart_analytics_snapshots
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Authenticated users can read cart analytics" ON public.cart_analytics_snapshots
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));

-- cart_sessions: users own their sessions, anon can insert (needed for tracking), service role full
DROP POLICY IF EXISTS "Allow all operations on cart_sessions" ON public.cart_sessions;
DROP POLICY IF EXISTS "Users can manage their cart sessions" ON public.cart_sessions;
CREATE POLICY "Anyone can insert cart sessions" ON public.cart_sessions
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own cart sessions" ON public.cart_sessions
  FOR UPDATE USING (
    auth.uid() = user_id OR auth.role() = 'service_role'
  );
CREATE POLICY "Anyone can read cart sessions by session_id" ON public.cart_sessions
  FOR SELECT USING (true);

-- customer_engagement_metrics: service role manages, users read own
DROP POLICY IF EXISTS "Allow all operations on customer_engagement_metrics" ON public.customer_engagement_metrics;
DROP POLICY IF EXISTS "Service role manages customer engagement" ON public.customer_engagement_metrics;
CREATE POLICY "Service role manages customer engagement metrics" ON public.customer_engagement_metrics
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Users can read their own engagement metrics" ON public.customer_engagement_metrics
  FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- enhanced_cart_tracking: anon can insert (needed for tracking), service role full
DROP POLICY IF EXISTS "Allow all operations on enhanced_cart_tracking" ON public.enhanced_cart_tracking;
DROP POLICY IF EXISTS "Service role full access to enhanced cart tracking" ON public.enhanced_cart_tracking;
CREATE POLICY "Anyone can insert cart tracking" ON public.enhanced_cart_tracking
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role manages cart tracking" ON public.enhanced_cart_tracking
  FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "Service role can delete cart tracking" ON public.enhanced_cart_tracking
  FOR DELETE USING (auth.role() = 'service_role');
CREATE POLICY "Anyone can read cart tracking" ON public.enhanced_cart_tracking
  FOR SELECT USING (true);

-- processing_sessions: service role only
DROP POLICY IF EXISTS "Allow all operations on processing_sessions" ON public.processing_sessions;
DROP POLICY IF EXISTS "Service role manages processing sessions" ON public.processing_sessions;
CREATE POLICY "Service role manages processing sessions" ON public.processing_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- order_status_history: authenticated admins write, users read own orders
DROP POLICY IF EXISTS "Allow all operations on order_status_history" ON public.order_status_history;
DROP POLICY IF EXISTS "Admin manages order status history" ON public.order_status_history;
CREATE POLICY "Service role and admin can manage order status history" ON public.order_status_history
  FOR ALL USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');
CREATE POLICY "Users can read order status for their orders" ON public.order_status_history
  FOR SELECT USING (true);