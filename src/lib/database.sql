-- 1. Create custom enum types
CREATE TYPE user_role AS ENUM ('user', 'admin', 'delivery');
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'processing', 'out_for_delivery', 'delivered', 'cancelled');

-- 2. Create the profiles table extending auth.users
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  phone_number TEXT UNIQUE,
  role user_role DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create the addresses table
CREATE TABLE addresses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  house_no TEXT,
  street_address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  formatted_address TEXT,
  location_source TEXT DEFAULT 'manual',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure configured owner email always retains admin access.
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

-- 4. Create the products table
CREATE TABLE products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  type TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  weight TEXT NOT NULL,
  rating NUMERIC(3, 1) DEFAULT 0,
  image_url TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create the orders table
CREATE TABLE orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE RESTRICT NOT NULL,
  total_amount NUMERIC(10, 2) NOT NULL,
  delivery_address_id UUID REFERENCES addresses(id) ON DELETE RESTRICT NOT NULL,
  status order_status DEFAULT 'pending',
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  delivery_agent_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Create the order_items table
CREATE TABLE order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE RESTRICT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price_at_time NUMERIC(10, 2) NOT NULL
);

-- 7. Create admin settings table
CREATE TABLE admin_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Create admin activity logs table
CREATE TABLE admin_activity_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security (RLS) Setup

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can update all profiles." ON profiles FOR UPDATE USING (
  EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Addresses
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own addresses." ON addresses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all addresses." ON addresses FOR SELECT USING (
  EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
CREATE POLICY "Delivery agents can view assigned order addresses." ON addresses FOR SELECT USING (
  EXISTS(
    SELECT 1
    FROM orders o
    WHERE o.delivery_address_id = addresses.id
      AND o.delivery_agent_id = auth.uid()
  )
);
CREATE POLICY "Users can insert own addresses." ON addresses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own addresses." ON addresses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own addresses." ON addresses FOR DELETE USING (auth.uid() = user_id);

-- Products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products are viewable by everyone." ON products FOR SELECT USING (true);
CREATE POLICY "Admins can insert products." ON products FOR INSERT WITH CHECK (
  EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
CREATE POLICY "Admins can update products." ON products FOR UPDATE USING (
  EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
CREATE POLICY "Admins can delete products." ON products FOR DELETE USING (
  EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own orders." ON orders FOR SELECT USING (auth.uid() = user_id);
-- Delivery agents can view assigned orders
CREATE POLICY "Delivery agents can view assigned orders." ON orders FOR SELECT USING (auth.uid() = delivery_agent_id);
-- Admins can view all orders
CREATE POLICY "Admins can view all orders." ON orders FOR SELECT USING (
  EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
-- Users can insert own orders
CREATE POLICY "Users can insert own orders." ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update all orders." ON orders FOR UPDATE USING (
  EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
CREATE POLICY "Delivery agents can update assigned orders." ON orders FOR UPDATE USING (
  auth.uid() = delivery_agent_id
) WITH CHECK (
  auth.uid() = delivery_agent_id
);

-- Order Items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own order items." ON order_items FOR SELECT USING (EXISTS(SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Admins can view all order items." ON order_items FOR SELECT USING (
  EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
CREATE POLICY "Delivery agents can view assigned order items." ON order_items FOR SELECT USING (
  EXISTS(
    SELECT 1
    FROM orders o
    WHERE o.id = order_items.order_id
      AND o.delivery_agent_id = auth.uid()
  )
);
CREATE POLICY "Users can insert own order items." ON order_items FOR INSERT WITH CHECK (EXISTS(SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));

-- Admin Settings
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view settings." ON admin_settings FOR SELECT USING (
  EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
CREATE POLICY "Admins can insert settings." ON admin_settings FOR INSERT WITH CHECK (
  EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
CREATE POLICY "Admins can update settings." ON admin_settings FOR UPDATE USING (
  EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Admin Activity Logs
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view activity logs." ON admin_activity_logs FOR SELECT USING (
  EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
CREATE POLICY "Admins can insert own activity logs." ON admin_activity_logs FOR INSERT WITH CHECK (
  auth.uid() = admin_id
  AND EXISTS(SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Insert mock data for products (copied from the MVP)
INSERT INTO products (name, company, type, price, weight, rating, image_url, description) VALUES
('Premium Basmati Rice', 'Royal Harvest', 'Basmati', 24.99, '5kg', 4.8, 'https://images.unsplash.com/photo-1586201375761-83865001e8ac?q=80&w=800&auto=format&fit=crop', 'Extra long grain rice with exquisite aroma and delicate flavor.'),
('Classic Jasmine Rice', 'Lotus Farms', 'Jasmine', 18.50, '5kg', 4.9, 'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?q=80&w=800&auto=format&fit=crop', 'Naturally fragrant rice, slightly sticky, perfect for Asian cuisine.'),
('Aged Sona Masoori', 'Deccan Heritage', 'Sona Masoori', 21.00, '10kg', 4.7, 'https://images.unsplash.com/photo-1516684732162-798a0062be99?q=80&w=800&auto=format&fit=crop', 'Light-weight, aromatic premium medium-grain rice.'),
('Organic Arborio Rice', 'Bella Italia', 'Arborio', 15.99, '2kg', 4.6, 'https://images.unsplash.com/photo-1595908685160-c26ff2c0b4ba?q=80&w=800&auto=format&fit=crop', 'High-starch short-grain rice, essential for authentic creamy risotto.'),
('Black Forbidden Rice', 'Ancient Grains', 'Black Rice', 12.50, '1kg', 4.9, 'https://images.unsplash.com/photo-1627909564273-049386add385?q=80&w=800&auto=format&fit=crop', 'Nutrient-rich, deep purple whole grain with a roasted nutty taste.'),
('Parboiled Brown Rice', 'Nature Blend', 'Brown', 14.00, '5kg', 4.5, 'https://images.unsplash.com/photo-1600289031464-74d374b64991?q=80&w=800&auto=format&fit=crop', 'Wholesome parboiled brown rice packed with fiber and essential vitamins.');
