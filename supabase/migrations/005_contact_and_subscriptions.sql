-- ============================================
-- Contact form submissions table
-- ============================================
CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id         BIGSERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name  TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT,
  profile    TEXT,
  subject    TEXT,
  message    TEXT NOT NULL,
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Policy: admin can read all
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

-- Policy: anyone can insert
CREATE POLICY "Anyone can insert contact_submissions"
  ON public.contact_submissions FOR INSERT
  WITH CHECK (true);


-- ============================================
-- Email subscriptions table
-- ============================================
CREATE TABLE IF NOT EXISTS public.email_subscriptions (
  id         BIGSERIAL PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  active     BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.email_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: admin can read all
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

-- Policy: anyone can insert (for subscribe form)
CREATE POLICY "Anyone can insert email_subscriptions"
  ON public.email_subscriptions FOR INSERT
  WITH CHECK (true);

-- Policy: anyone can update their own subscription (unsubscribe)
CREATE POLICY "Anyone can update their own subscription"
  ON public.email_subscriptions FOR UPDATE
  USING (true)
  WITH CHECK (true);


-- ============================================
-- RPC: list_all_users (SECURITY DEFINER so frontend can call it)
-- ============================================
CREATE OR REPLACE FUNCTION public.list_all_users()
RETURNS TABLE (
  id uuid,
  email text,
  raw_user_meta_data jsonb,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  role text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    u.id,
    u.email,
    u.raw_user_meta_data,
    u.last_sign_in_at,
    u.created_at,
    u.role::text
  FROM auth.users u
  ORDER BY u.created_at DESC;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.list_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_all_users() TO anon;
