-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  image_url text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  price numeric(12,2) NOT NULL DEFAULT 0,
  compare_price numeric(12,2),
  stock_quantity int NOT NULL DEFAULT 0,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  images text[] DEFAULT '{}',
  sku text,
  weight_kg numeric(8,2),
  is_featured boolean DEFAULT false,
  is_active boolean DEFAULT true,
  meta_title text,
  meta_description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Promotions / Coupons
CREATE TABLE IF NOT EXISTS promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric(12,2) NOT NULL DEFAULT 0,
  min_order_amount numeric(12,2),
  max_uses int,
  used_count int DEFAULT 0,
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,
  is_active boolean DEFAULT true,
  applies_to text DEFAULT 'all' CHECK (applies_to IN ('all', 'products', 'gift_boxes')),
  created_at timestamptz DEFAULT now()
);

-- Gift Boxes (admin curated)
CREATE TABLE IF NOT EXISTS gift_boxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  image_url text,
  price numeric(12,2) NOT NULL DEFAULT 0,
  compare_price numeric(12,2),
  items jsonb DEFAULT '[]',
  packaging_style text,
  promotional_discount numeric(12,2) DEFAULT 0,
  coupon_code text,
  is_published boolean DEFAULT false,
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Custom Gift Boxes (user created)
CREATE TABLE IF NOT EXISTS custom_gift_boxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  packaging_style text NOT NULL,
  personal_message text,
  items jsonb DEFAULT '[]',
  total_price numeric(12,2) NOT NULL DEFAULT 0,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'ordered')),
  created_at timestamptz DEFAULT now()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_email text,
  guest_phone text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_method text,
  payment_reference text,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  discount_amount numeric(12,2) DEFAULT 0,
  delivery_fee numeric(12,2) DEFAULT 0,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  coupon_code text,
  shipping_name text,
  shipping_phone text,
  shipping_address text,
  shipping_city text,
  shipping_region text,
  tracking_number text,
  notes text,
  order_type text DEFAULT 'regular' CHECK (order_type IN ('regular', 'gift_box')),
  gift_box_id uuid REFERENCES gift_boxes(id) ON DELETE SET NULL,
  custom_gift_box_id uuid REFERENCES custom_gift_boxes(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  name text NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  total_price numeric(12,2) NOT NULL DEFAULT 0,
  image_url text,
  created_at timestamptz DEFAULT now()
);

-- Cart Items
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  quantity int NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Wishlist
CREATE TABLE IF NOT EXISTS wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Banners / Slides
CREATE TABLE IF NOT EXISTS banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  image_url text,
  link text,
  button_text text,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Site Settings
CREATE TABLE IF NOT EXISTS site_settings (
  id int PRIMARY KEY DEFAULT 1,
  site_name text DEFAULT 'KW Enterprise',
  site_description text,
  contact_phone text DEFAULT '(+233) 26 479 3861',
  contact_email text,
  contact_address text DEFAULT 'Accra, Ghana',
  facebook_url text,
  instagram_url text,
  twitter_url text,
  whatsapp_number text,
  delivery_fee numeric(12,2) DEFAULT 15,
  free_delivery_threshold numeric(12,2) DEFAULT 200,
  meta_title text,
  meta_description text,
  CONSTRAINT single_row CHECK (id = 1)
);

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  address text,
  city text,
  region text,
  role text DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Newsletter subscribers
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Helper function to check admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_gift_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Categories: public read
CREATE POLICY "Categories public read" ON categories FOR SELECT USING (true);
CREATE POLICY "Categories admin write" ON categories FOR ALL USING (is_admin());

-- Products: public read active
CREATE POLICY "Products public read" ON products FOR SELECT USING (is_active = true);
CREATE POLICY "Products admin write" ON products FOR ALL USING (is_admin());

-- Promotions: public read active
CREATE POLICY "Promotions public read" ON promotions FOR SELECT USING (is_active = true);
CREATE POLICY "Promotions admin write" ON promotions FOR ALL USING (is_admin());

-- Gift boxes: public read published and active
CREATE POLICY "Gift boxes public read" ON gift_boxes FOR SELECT USING (is_published = true AND is_active = true);
CREATE POLICY "Gift boxes admin write" ON gift_boxes FOR ALL USING (is_admin());

-- Custom gift boxes: owner only
CREATE POLICY "Custom gift boxes owner" ON custom_gift_boxes FOR ALL USING (user_id = auth.uid() OR is_admin());

-- Orders: owner
CREATE POLICY "Orders owner" ON orders FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "Orders owner insert" ON orders FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Orders admin update" ON orders FOR UPDATE USING (is_admin());

-- Order items: via orders
CREATE POLICY "Order items via orders" ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (orders.user_id = auth.uid() OR is_admin()))
);
CREATE POLICY "Order items owner insert" ON order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);

-- Cart: owner
CREATE POLICY "Cart owner" ON cart_items FOR ALL USING (user_id = auth.uid());

-- Wishlist: owner
CREATE POLICY "Wishlist owner" ON wishlist FOR ALL USING (user_id = auth.uid());

-- Banners: public read active
CREATE POLICY "Banners public read" ON banners FOR SELECT USING (is_active = true);
CREATE POLICY "Banners admin write" ON banners FOR ALL USING (is_admin());

-- Site settings: public read
CREATE POLICY "Site settings public read" ON site_settings FOR SELECT USING (true);
CREATE POLICY "Site settings admin write" ON site_settings FOR ALL USING (is_admin());

-- Profiles: self
CREATE POLICY "Profiles self" ON profiles FOR SELECT USING (id = auth.uid() OR is_admin());
CREATE POLICY "Profiles self update" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Profiles admin insert" ON profiles FOR INSERT WITH CHECK (true);

-- Newsletter: public insert
CREATE POLICY "Newsletter public insert" ON newsletter_subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "Newsletter admin read" ON newsletter_subscribers FOR SELECT USING (is_admin());
