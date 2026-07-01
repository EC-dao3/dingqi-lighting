-- ============================================
-- 006 补丁：修复 contact_submissions / email_subscriptions 的 RLS 读取策略
-- 原因：RLS 策略里不能直接查询 auth.users，否则会报 permission denied for table users
-- 改用 auth.jwt()->'user_metadata'->>'full_name' 读取当前用户的元数据
-- ============================================

-- 修复 contact_submissions 读取策略
DROP POLICY IF EXISTS "Admins can read contact_submissions" ON public.contact_submissions;
CREATE POLICY "Admins can read contact_submissions"
  ON public.contact_submissions FOR SELECT
  TO authenticated
  USING (
    COALESCE((auth.jwt()->'user_metadata'->>'full_name') ~ '^admin[0-9]*-dingqi[0-9]*$', false)
  );

-- 修复 email_subscriptions 读取策略
DROP POLICY IF EXISTS "Admins can read email_subscriptions" ON public.email_subscriptions;
CREATE POLICY "Admins can read email_subscriptions"
  ON public.email_subscriptions FOR SELECT
  TO authenticated
  USING (
    COALESCE((auth.jwt()->'user_metadata'->>'full_name') ~ '^admin[0-9]*-dingqi[0-9]*$', false)
  );

-- 顺带确保插入/更新策略面向 authenticated + anon 都正确
DROP POLICY IF EXISTS "Anyone can insert contact_submissions" ON public.contact_submissions;
CREATE POLICY "Anyone can insert contact_submissions"
  ON public.contact_submissions FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can insert email_subscriptions" ON public.email_subscriptions;
CREATE POLICY "Anyone can insert email_subscriptions"
  ON public.email_subscriptions FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update their own subscription" ON public.email_subscriptions;
CREATE POLICY "Anyone can update their own subscription"
  ON public.email_subscriptions FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);
