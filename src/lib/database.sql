-- ============================================================
--  GoldenGrain Rice Shop — Database Schema v2
--  Scalable, production-grade architecture.
--
--  Run this entire file in the Supabase SQL Editor to
--  fully recreate the database from scratch.
--
--  Tables:
--    profiles, addresses
--    product_categories, products, product_images, inventory, product_reviews
--    wishlists, wishlist_items
--    coupons, orders, order_items, order_status_history, payments, coupon_redemptions
--    delivery_zones, serviceable_pincodes
--    admin_settings, admin_activity_logs, notifications
--
--  Views:  v_products_full · v_orders_full · v_admin_stats
--  MV:     mv_daily_revenue
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ── Teardown ────────────────────────────────────────────────
DROP TABLE IF EXISTS admin_activity_logs       CASCADE;
DROP TABLE IF EXISTS admin_settings            CASCADE;
DROP TABLE IF EXISTS notifications             CASCADE;
DROP TABLE IF EXISTS coupon_redemptions        CASCADE;
DROP TABLE IF EXISTS coupons                   CASCADE;
DROP TABLE IF EXISTS order_status_history      CASCADE;
DROP TABLE IF EXISTS payments                  CASCADE;
DROP TABLE IF EXISTS order_items               CASCADE;
DROP TABLE IF EXISTS orders                    CASCADE;
DROP TABLE IF EXISTS wishlist_items            CASCADE;
DROP TABLE IF EXISTS wishlists                 CASCADE;
DROP TABLE IF EXISTS product_reviews           CASCADE;
DROP TABLE IF EXISTS inventory                 CASCADE;
DROP TABLE IF EXISTS product_images            CASCADE;
DROP TABLE IF EXISTS products                  CASCADE;
DROP TABLE IF EXISTS product_categories        CASCADE;
DROP TABLE IF EXISTS serviceable_pincodes      CASCADE;
DROP TABLE IF EXISTS delivery_zones            CASCADE;
DROP TABLE IF EXISTS addresses                 CASCADE;
DROP TABLE IF EXISTS profiles                  CASCADE;
DROP FUNCTION IF EXISTS moddatetime()                       CASCADE;
DROP FUNCTION IF EXISTS sync_admin_role_by_email()          CASCADE;
DROP FUNCTION IF EXISTS auto_create_profile()               CASCADE;
DROP FUNCTION IF EXISTS refresh_product_rating()            CASCADE;
DROP FUNCTION IF EXISTS is_admin()                          CASCADE;
DROP FUNCTION IF EXISTS is_delivery()                       CASCADE;
DROP TYPE IF EXISTS user_role                  CASCADE;
DROP TYPE IF EXISTS order_status               CASCADE;
DROP TYPE IF EXISTS payment_status             CASCADE;
DROP TYPE IF EXISTS payment_method             CASCADE;
DROP TYPE IF EXISTS notification_type          CASCADE;
DROP TYPE IF EXISTS coupon_type                CASCADE;
DROP TYPE IF EXISTS address_type               CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_daily_revenue           CASCADE;

-- ============================================================
-- PHASE 1 — Enums & shared trigger functions
-- ============================================================
CREATE TYPE user_role          AS ENUM ('user', 'admin', 'delivery');
CREATE TYPE order_status       AS ENUM ('pending','paid','processing','out_for_delivery','delivered','cancelled','refunded');
CREATE TYPE payment_status     AS ENUM ('initiated','captured','failed','refunded');
CREATE TYPE payment_method     AS ENUM ('razorpay','cod','wallet','upi');
CREATE TYPE notification_type  AS ENUM ('order_placed','order_paid','order_processing','order_out_for_delivery','order_delivered','order_cancelled','promo','system');
CREATE TYPE coupon_type        AS ENUM ('percent','flat');
CREATE TYPE address_type       AS ENUM ('home','work','other');

CREATE OR REPLACE FUNCTION moddatetime()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = timezone('utc', now()); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_admin_role_by_email()
RETURNS TRIGGER AS $$
DECLARE v_email TEXT; BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = NEW.id;
  IF lower(coalesce(v_email,'')) = 'ramasaniluckyn@gmail.com' THEN NEW.role := 'admin'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auto_create_profile()
RETURNS TRIGGER AS $$
DECLARE v_role user_role := 'user'; BEGIN
  IF lower(coalesce(NEW.email,'')) = 'ramasaniluckyn@gmail.com' THEN v_role := 'admin'; END IF;
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), NEW.email, v_role)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION refresh_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products SET
    rating       = COALESCE((SELECT ROUND(AVG(rating)::numeric,1) FROM product_reviews WHERE product_id = COALESCE(NEW.product_id, OLD.product_id) AND is_approved = true), 0),
    review_count = (SELECT COUNT(*) FROM product_reviews WHERE product_id = COALESCE(NEW.product_id, OLD.product_id) AND is_approved = true)
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  RETURN NULL;
END; $$ LANGUAGE plpgsql;

-- ============================================================
-- PHASE 2 — Core Tables
-- ============================================================
CREATE TABLE profiles (
  id           UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    TEXT        NOT NULL DEFAULT '',
  email        TEXT,
  phone_number TEXT        UNIQUE,
  avatar_url   TEXT,
  role         user_role   NOT NULL DEFAULT 'user',
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  metadata     JSONB       NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_sync_admin_role        BEFORE INSERT OR UPDATE OF role ON profiles FOR EACH ROW EXECUTE FUNCTION sync_admin_role_by_email();
CREATE TRIGGER trg_profiles_moddatetime   BEFORE UPDATE ON profiles              FOR EACH ROW EXECUTE FUNCTION moddatetime();
CREATE TRIGGER trg_auto_create_profile    AFTER  INSERT ON auth.users             FOR EACH ROW EXECUTE FUNCTION auto_create_profile();

INSERT INTO profiles (id, full_name, email, role)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email,'@',1)), u.email,
  CASE WHEN lower(u.email) = 'ramasaniluckyn@gmail.com' THEN 'admin'::user_role ELSE 'user'::user_role END
FROM auth.users u ON CONFLICT (id) DO NOTHING;

CREATE TABLE addresses (
  id                UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label             TEXT         NOT NULL DEFAULT 'Home',
  address_type      address_type NOT NULL DEFAULT 'home',
  house_no          TEXT,
  street_address    TEXT         NOT NULL,
  landmark          TEXT,
  city              TEXT         NOT NULL,
  state             TEXT         NOT NULL,
  pincode           TEXT         NOT NULL,
  country           TEXT         NOT NULL DEFAULT 'India',
  latitude          DOUBLE PRECISION,
  longitude         DOUBLE PRECISION,
  formatted_address TEXT,
  location_source   TEXT         NOT NULL DEFAULT 'manual',
  is_default        BOOLEAN      NOT NULL DEFAULT false,
  is_active         BOOLEAN      NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_addresses_moddatetime BEFORE UPDATE ON addresses FOR EACH ROW EXECUTE FUNCTION moddatetime();

CREATE OR REPLACE FUNCTION enforce_single_default_address() RETURNS TRIGGER AS $$
BEGIN IF NEW.is_default = true THEN UPDATE addresses SET is_default = false WHERE user_id = NEW.user_id AND id <> NEW.id; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_single_default_address AFTER INSERT OR UPDATE OF is_default ON addresses FOR EACH ROW WHEN (NEW.is_default = true) EXECUTE FUNCTION enforce_single_default_address();

CREATE TABLE product_categories (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT        NOT NULL UNIQUE,
  slug        TEXT        NOT NULL UNIQUE,
  description TEXT,
  image_url   TEXT,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  metadata    JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_categories_moddatetime BEFORE UPDATE ON product_categories FOR EACH ROW EXECUTE FUNCTION moddatetime();

CREATE TABLE products (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id   UUID          REFERENCES product_categories(id) ON DELETE SET NULL,
  name          TEXT          NOT NULL,
  slug          TEXT          NOT NULL UNIQUE,
  company       TEXT          NOT NULL,
  description   TEXT,
  price         NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  compare_price NUMERIC(10,2) CHECK (compare_price >= 0),
  weight        TEXT          NOT NULL,
  weight_grams  INTEGER,
  image_url     TEXT,
  rating        NUMERIC(3,1)  NOT NULL DEFAULT 0 CHECK (rating BETWEEN 0 AND 5),
  review_count  INTEGER       NOT NULL DEFAULT 0,
  sku           TEXT          UNIQUE,
  tags          TEXT[]        NOT NULL DEFAULT '{}',
  is_active     BOOLEAN       NOT NULL DEFAULT true,
  is_featured   BOOLEAN       NOT NULL DEFAULT false,
  metadata      JSONB         NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);
CREATE TRIGGER trg_products_moddatetime BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION moddatetime();
CREATE INDEX idx_products_tags       ON products USING GIN(tags);
CREATE INDEX idx_products_name_trgm  ON products USING GIN(name gin_trgm_ops);
CREATE INDEX idx_products_active     ON products (is_active, is_featured) WHERE deleted_at IS NULL;

CREATE TABLE product_images (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url        TEXT        NOT NULL,
  alt_text   TEXT,
  sort_order INTEGER     NOT NULL DEFAULT 0,
  is_primary BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_product_images_product ON product_images(product_id, sort_order);

CREATE TABLE inventory (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id          UUID        NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  quantity_in_stock   INTEGER     NOT NULL DEFAULT 0 CHECK (quantity_in_stock >= 0),
  low_stock_threshold INTEGER     NOT NULL DEFAULT 10,
  allow_backorder     BOOLEAN     NOT NULL DEFAULT false,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by          UUID        REFERENCES profiles(id) ON DELETE SET NULL
);
CREATE TRIGGER trg_inventory_moddatetime BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION moddatetime();

CREATE TABLE product_reviews (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id    UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id      UUID,
  rating        INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title         TEXT,
  body          TEXT,
  is_approved   BOOLEAN     NOT NULL DEFAULT false,
  is_flagged    BOOLEAN     NOT NULL DEFAULT false,
  helpful_count INTEGER     NOT NULL DEFAULT 0,
  metadata      JSONB       NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id, order_id)
);
CREATE TRIGGER trg_reviews_moddatetime  BEFORE UPDATE ON product_reviews             FOR EACH ROW EXECUTE FUNCTION moddatetime();
CREATE TRIGGER trg_refresh_rating       AFTER INSERT OR UPDATE OF is_approved OR DELETE ON product_reviews FOR EACH ROW EXECUTE FUNCTION refresh_product_rating();

CREATE TABLE wishlists      (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE wishlist_items (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), wishlist_id UUID NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE, product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE, added_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(wishlist_id, product_id));

-- ============================================================
-- PHASE 3 — Commerce Tables
-- ============================================================
CREATE TABLE coupons (
  id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                TEXT          NOT NULL UNIQUE,
  description         TEXT,
  coupon_type         coupon_type   NOT NULL DEFAULT 'flat',
  discount_value      NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  min_order_amount    NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_discount_amount NUMERIC(10,2),
  max_uses            INTEGER,
  max_uses_per_user   INTEGER       NOT NULL DEFAULT 1,
  used_count          INTEGER       NOT NULL DEFAULT 0,
  is_active           BOOLEAN       NOT NULL DEFAULT true,
  valid_from          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  valid_until         TIMESTAMPTZ,
  created_by          UUID          REFERENCES profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_coupons_moddatetime BEFORE UPDATE ON coupons FOR EACH ROW EXECUTE FUNCTION moddatetime();

CREATE TABLE orders (
  id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number        TEXT          NOT NULL UNIQUE DEFAULT 'ORD-' || upper(substring(uuid_generate_v4()::text,1,8)),
  user_id             UUID          NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  delivery_address_id UUID          NOT NULL REFERENCES addresses(id) ON DELETE RESTRICT,
  delivery_agent_id   UUID          REFERENCES profiles(id) ON DELETE SET NULL,
  coupon_id           UUID          REFERENCES coupons(id) ON DELETE SET NULL,
  subtotal            NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  discount_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_fee        NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_amount          NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount        NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
  status              order_status  NOT NULL DEFAULT 'pending',
  notes               TEXT,
  estimated_delivery  TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  cancel_reason       TEXT,
  metadata            JSONB         NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_orders_moddatetime BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION moddatetime();
CREATE INDEX idx_orders_user   ON orders(user_id, created_at DESC);
CREATE INDEX idx_orders_agent  ON orders(delivery_agent_id) WHERE delivery_agent_id IS NOT NULL;
CREATE INDEX idx_orders_status ON orders(status, created_at DESC);

CREATE TABLE order_items (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID          NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    UUID          NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name  TEXT          NOT NULL,
  product_image TEXT,
  quantity      INTEGER       NOT NULL CHECK (quantity > 0),
  unit_price    NUMERIC(10,2) NOT NULL,
  total_price   NUMERIC(10,2) NOT NULL,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_order_items_order ON order_items(order_id);
ALTER TABLE product_reviews ADD CONSTRAINT fk_review_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;

CREATE TABLE order_status_history (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID         NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status order_status,
  to_status   order_status NOT NULL,
  changed_by  UUID         REFERENCES profiles(id) ON DELETE SET NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_status_history_order ON order_status_history(order_id, created_at DESC);

CREATE OR REPLACE FUNCTION log_order_status_change() RETURNS TRIGGER AS $$
BEGIN IF (OLD.status IS DISTINCT FROM NEW.status) THEN INSERT INTO order_status_history (order_id,from_status,to_status) VALUES (NEW.id,OLD.status,NEW.status); END IF; RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_order_status_history AFTER UPDATE OF status ON orders FOR EACH ROW EXECUTE FUNCTION log_order_status_change();

CREATE TABLE payments (
  id                  UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id            UUID           NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  user_id             UUID           NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  payment_method      payment_method NOT NULL DEFAULT 'razorpay',
  payment_status      payment_status NOT NULL DEFAULT 'initiated',
  amount              NUMERIC(10,2)  NOT NULL CHECK (amount > 0),
  currency            TEXT           NOT NULL DEFAULT 'INR',
  razorpay_order_id   TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature  TEXT,
  gateway_response    JSONB          NOT NULL DEFAULT '{}',
  failure_reason      TEXT,
  refunded_amount     NUMERIC(10,2)  NOT NULL DEFAULT 0,
  refunded_at         TIMESTAMPTZ,
  captured_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ    NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_payments_moddatetime BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION moddatetime();
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_user  ON payments(user_id, created_at DESC);

CREATE TABLE coupon_redemptions (
  id         UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id  UUID          NOT NULL REFERENCES coupons(id)  ON DELETE CASCADE,
  user_id    UUID          NOT NULL REFERENCES profiles(id)  ON DELETE CASCADE,
  order_id   UUID          NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  discount   NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ============================================================
-- PHASE 4 — Operations & Admin
-- ============================================================
CREATE TABLE delivery_zones (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT          NOT NULL UNIQUE,
  description   TEXT,
  delivery_fee  NUMERIC(10,2) NOT NULL DEFAULT 0,
  free_above    NUMERIC(10,2),
  min_order     NUMERIC(10,2) NOT NULL DEFAULT 0,
  est_hours_min INTEGER       NOT NULL DEFAULT 2,
  est_hours_max INTEGER       NOT NULL DEFAULT 6,
  is_active     BOOLEAN       NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_zones_moddatetime BEFORE UPDATE ON delivery_zones FOR EACH ROW EXECUTE FUNCTION moddatetime();

CREATE TABLE serviceable_pincodes (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  pincode    TEXT        NOT NULL UNIQUE,
  city       TEXT        NOT NULL,
  state      TEXT        NOT NULL,
  zone_id    UUID        REFERENCES delivery_zones(id) ON DELETE SET NULL,
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pincodes_active ON serviceable_pincodes(pincode) WHERE is_active = true;
CREATE TRIGGER trg_pincodes_moddatetime BEFORE UPDATE ON serviceable_pincodes FOR EACH ROW EXECUTE FUNCTION moddatetime();

CREATE TABLE admin_settings (
  key         TEXT        PRIMARY KEY,
  value       JSONB       NOT NULL DEFAULT '{}',
  description TEXT,
  category    TEXT        NOT NULL DEFAULT 'general',
  is_secret   BOOLEAN     NOT NULL DEFAULT false,
  updated_by  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_settings_moddatetime BEFORE UPDATE ON admin_settings FOR EACH ROW EXECUTE FUNCTION moddatetime();

CREATE TABLE admin_activity_logs (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id     UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  action_type  TEXT        NOT NULL,
  entity_type  TEXT        NOT NULL,
  entity_id    TEXT,
  before_state JSONB,
  after_state  JSONB,
  details      JSONB       NOT NULL DEFAULT '{}',
  ip_address   TEXT,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_admin_logs_admin  ON admin_activity_logs(admin_id, created_at DESC);
CREATE INDEX idx_admin_logs_entity ON admin_activity_logs(entity_type, entity_id);

CREATE TABLE notifications (
  id         UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID              NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  title      TEXT              NOT NULL,
  body       TEXT              NOT NULL,
  data       JSONB             NOT NULL DEFAULT '{}',
  is_read    BOOLEAN           NOT NULL DEFAULT false,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ       NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user   ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE is_read = false;

-- (paste RLS, views, seed data from migration files or Supabase dashboard)
-- See supabase migration files: v2_phase5_rls_policies, v2_phase6_seed_data, v2_phase7_views_and_helpers
