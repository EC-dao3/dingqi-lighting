-- Migration: Create product catalog tables
-- Categories (main), series (sub), and products (models)

-- Main categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  gradient TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subcategories / series
CREATE TABLE IF NOT EXISTS series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(category_id, name)
);

-- Products / models
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  real_image TEXT,
  line_image TEXT,
  params JSONB NOT NULL DEFAULT '[]',
  colors JSONB NOT NULL DEFAULT '[]',
  accessories JSONB NOT NULL DEFAULT '[]',
  installation_method TEXT,
  options_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(series_id, product_id)
);

CREATE INDEX idx_series_category ON series(category_id);
CREATE INDEX idx_products_series ON products(series_id);
CREATE INDEX idx_categories_sort ON categories(sort_order);
CREATE INDEX idx_series_sort ON series(category_id, sort_order);
CREATE INDEX idx_products_sort ON products(series_id, sort_order);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE series ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Helper: is current user an admin by full_name pattern admin*-dingqi
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt()->'user_metadata'->>'full_name') ~ '^admin\d*-dingqi\d*$',
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Public read policies
CREATE POLICY "Allow public read categories"
  ON categories FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read series"
  ON series FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read products"
  ON products FOR SELECT
  TO anon, authenticated
  USING (true);

-- Admin write policies
CREATE POLICY "Allow admin manage categories"
  ON categories FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Allow admin manage series"
  ON series FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Allow admin manage products"
  ON products FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
