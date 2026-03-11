-- Apply this migration in Supabase SQL Editor for existing projects.
-- It is idempotent and safe to run multiple times.

ALTER TABLE addresses ADD COLUMN IF NOT EXISTS house_no TEXT;
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS formatted_address TEXT;
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS location_source TEXT DEFAULT 'manual';

CREATE TABLE IF NOT EXISTS admin_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created_at ON admin_activity_logs(created_at DESC);

CREATE OR REPLACE FUNCTION sync_admin_role_by_email()
RETURNS TRIGGER AS $$
DECLARE
  auth_email TEXT;
BEGIN
  SELECT email INTO auth_email FROM auth.users WHERE id = NEW.id;
  IF lower(coalesce(auth_email, '')) = 'ramasaniluckyn@gmail.com' THEN
    NEW.role := 'admin';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_admin_role_for_owner ON profiles;
CREATE TRIGGER set_admin_role_for_owner
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION sync_admin_role_by_email();

UPDATE profiles p
SET role = 'admin'
FROM auth.users u
WHERE p.id = u.id
  AND lower(u.email) = 'ramasaniluckyn@gmail.com';

-- RLS policy fixes for profile updates + admin pages
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own profile." ON profiles;
CREATE POLICY "Users can insert own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can update all profiles." ON profiles;
CREATE POLICY "Admins can update all profiles." ON profiles FOR UPDATE USING (
  EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "Admins can view all addresses." ON addresses;
CREATE POLICY "Admins can view all addresses." ON addresses FOR SELECT USING (
  EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "Delivery agents can view assigned order addresses." ON addresses;
CREATE POLICY "Delivery agents can view assigned order addresses." ON addresses FOR SELECT USING (
  EXISTS(
    SELECT 1
    FROM orders o
    WHERE o.delivery_address_id = addresses.id
      AND o.delivery_agent_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can insert products." ON products;
CREATE POLICY "Admins can insert products." ON products FOR INSERT WITH CHECK (
  EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "Admins can update products." ON products;
CREATE POLICY "Admins can update products." ON products FOR UPDATE USING (
  EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "Admins can delete products." ON products;
CREATE POLICY "Admins can delete products." ON products FOR DELETE USING (
  EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "Admins can view all orders." ON orders;
CREATE POLICY "Admins can view all orders." ON orders FOR SELECT USING (
  EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "Admins can update all orders." ON orders;
CREATE POLICY "Admins can update all orders." ON orders FOR UPDATE USING (
  EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "Delivery agents can update assigned orders." ON orders;
CREATE POLICY "Delivery agents can update assigned orders." ON orders FOR UPDATE USING (
  auth.uid() = delivery_agent_id
) WITH CHECK (
  auth.uid() = delivery_agent_id
);

DROP POLICY IF EXISTS "Admins can view all order items." ON order_items;
CREATE POLICY "Admins can view all order items." ON order_items FOR SELECT USING (
  EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "Delivery agents can view assigned order items." ON order_items;
CREATE POLICY "Delivery agents can view assigned order items." ON order_items FOR SELECT USING (
  EXISTS(
    SELECT 1
    FROM orders o
    WHERE o.id = order_items.order_id
      AND o.delivery_agent_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can view settings." ON admin_settings;
CREATE POLICY "Admins can view settings." ON admin_settings FOR SELECT USING (
  EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "Admins can insert settings." ON admin_settings;
CREATE POLICY "Admins can insert settings." ON admin_settings FOR INSERT WITH CHECK (
  EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "Admins can update settings." ON admin_settings;
CREATE POLICY "Admins can update settings." ON admin_settings FOR UPDATE USING (
  EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "Admins can view activity logs." ON admin_activity_logs;
CREATE POLICY "Admins can view activity logs." ON admin_activity_logs FOR SELECT USING (
  EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "Admins can insert own activity logs." ON admin_activity_logs;
CREATE POLICY "Admins can insert own activity logs." ON admin_activity_logs FOR INSERT WITH CHECK (
  auth.uid() = admin_id
  AND EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
