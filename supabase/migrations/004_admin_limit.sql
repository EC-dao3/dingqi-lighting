-- ============================================
-- DINGQI - Admin Limit Enforcement (max 3)
-- Run this ENTIRE script in Supabase Dashboard SQL Editor:
--   https://supabase.com/dashboard/project/yhfjnvpdaxqoyltsbzhs/sql/new
-- ============================================

-- 1. Admin registry table
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies (re-create safely)
DROP POLICY IF EXISTS "Allow admins select" ON admins;
CREATE POLICY "Allow admins select" ON admins
  FOR SELECT TO authenticated USING (
    COALESCE((auth.jwt()->'user_metadata'->>'full_name') ~ '^admin\d*-dingqi\d*$', false)
  );

DROP POLICY IF EXISTS "Allow admins insert" ON admins;
CREATE POLICY "Allow admins insert" ON admins
  FOR INSERT TO authenticated WITH CHECK (
    COALESCE((auth.jwt()->'user_metadata'->>'full_name') ~ '^admin\d*-dingqi\d*$', false)
  );

DROP POLICY IF EXISTS "Allow admins delete" ON admins;
CREATE POLICY "Allow admins delete" ON admins
  FOR DELETE TO authenticated USING (
    COALESCE((auth.jwt()->'user_metadata'->>'full_name') ~ '^admin\d*-dingqi\d*$', false)
  );

-- 4. Function: count current admins
CREATE OR REPLACE FUNCTION count_admins()
RETURNS INTEGER AS $$
DECLARE
  cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt FROM admins;
  RETURN cnt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger function: prevent inserting beyond 3
CREATE OR REPLACE FUNCTION enforce_admin_limit()
RETURNS TRIGGER AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM admins;
  IF admin_count >= 3 THEN
    RAISE EXCEPTION 'Admin limit reached: maximum 3 admin accounts allowed.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger on admins table
DROP TRIGGER IF EXISTS check_admin_limit ON admins;
CREATE TRIGGER check_admin_limit
  BEFORE INSERT ON admins
  FOR EACH ROW
  EXECUTE FUNCTION enforce_admin_limit();

-- 7. Auto-register admin: when a new auth user matches admin pattern, add to admins
CREATE OR REPLACE FUNCTION register_new_admin()
RETURNS TRIGGER AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  IF COALESCE(NEW.raw_user_meta_data->>'full_name', '') ~ '^admin\d*-dingqi\d*$' THEN
    SELECT COUNT(*) INTO admin_count FROM admins;
    IF admin_count >= 3 THEN
      RAISE EXCEPTION 'Admin limit reached: maximum 3 admin accounts allowed.';
    END IF;
    INSERT INTO admins (user_id, name, email)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION register_new_admin();

-- 9. Grant execute permissions
GRANT EXECUTE ON FUNCTION count_admins() TO authenticated, anon;
