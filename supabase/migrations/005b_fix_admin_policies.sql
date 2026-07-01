-- ============================================
-- 005 补丁：修复管理员判断正则，让 admin1-dingqi 这类账号也能读取数据
-- ============================================

-- 修复 contact_submissions 读取策略
DROP POLICY IF EXISTS "Admins can read contact_submissions" ON public.contact_submissions;
CREATE POLICY "Admins can read contact_submissions"
  ON public.contact_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = (SELECT auth.uid())
      AND u.raw_user_meta_data->>'full_name' ~ '^admin[0-9]*-dingqi[0-9]*$'
    )
  );

-- 修复 email_subscriptions 读取策略
DROP POLICY IF EXISTS "Admins can read email_subscriptions" ON public.email_subscriptions;
CREATE POLICY "Admins can read email_subscriptions"
  ON public.email_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = (SELECT auth.uid())
      AND u.raw_user_meta_data->>'full_name' ~ '^admin[0-9]*-dingqi[0-9]*$'
    )
  );
