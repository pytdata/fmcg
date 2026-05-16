-- KW Enterprise FMCG E-Commerce Platform
-- PostgreSQL Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────
-- PROFILES (users)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name    TEXT NOT NULL DEFAULT '',
  email        TEXT UNIQUE,
  phone        TEXT,
  role         TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')),
  avatar_url   TEXT,
  password_hash TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────
-- CATEGORIES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url   TEXT,
  sort_order  INTEGER DEFAULT 0,
  parent_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────
-- DELIVERY LOCATIONS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS delivery_locations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  region       TEXT,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active    BOOLEAN DEFAULT true,
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────
-- PRODUCTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  description     TEXT,
  price           NUMERIC(10,2) NOT NULL DEFAULT 0,
  compare_price   NUMERIC(10,2),
  stock_quantity  INTEGER NOT NULL DEFAULT 0,
  category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
  images          TEXT[] DEFAULT '{}',
  sku             TEXT,
  weight_kg       NUMERIC(8,3),
  is_featured     BOOLEAN DEFAULT false,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);

-- ─────────────────────────────────────────────
-- GIFT BOXES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gift_boxes (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  slug                 TEXT UNIQUE NOT NULL,
  description          TEXT,
  image_url            TEXT,
  price                NUMERIC(10,2) NOT NULL DEFAULT 0,
  compare_price        NUMERIC(10,2),
  items                JSONB DEFAULT '[]',
  packaging_style      TEXT,
  promotional_discount NUMERIC(5,2) DEFAULT 0,
  coupon_code          TEXT,
  is_published         BOOLEAN DEFAULT false,
  is_active            BOOLEAN DEFAULT true,
  sort_order           INTEGER DEFAULT 0,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────
-- CUSTOM GIFT BOXES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_gift_boxes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name             TEXT,
  packaging_style  TEXT NOT NULL DEFAULT 'standard',
  personal_message TEXT,
  items            JSONB DEFAULT '[]',
  total_price      NUMERIC(10,2) DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ordered')),
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────
-- PROMOTIONS / COUPONS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promotions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code              TEXT UNIQUE NOT NULL,
  name              TEXT NOT NULL,
  discount_type     TEXT NOT NULL CHECK (discount_type IN ('percentage','fixed')),
  discount_value    NUMERIC(10,2) NOT NULL,
  min_order_amount  NUMERIC(10,2),
  max_uses          INTEGER,
  used_count        INTEGER DEFAULT 0,
  valid_from        TIMESTAMPTZ DEFAULT now(),
  valid_until       TIMESTAMPTZ,
  is_active         BOOLEAN DEFAULT true,
  applies_to        TEXT NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all','products','gift_boxes')),
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────
-- BANNERS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS banners (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  subtitle    TEXT,
  image_url   TEXT,
  link        TEXT,
  button_text TEXT,
  sort_order  INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────
-- CART ITEMS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cart_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- ─────────────────────────────────────────────
-- WISHLISTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlists (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- ─────────────────────────────────────────────
-- ORDERS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number            TEXT UNIQUE NOT NULL,
  user_id                 UUID REFERENCES profiles(id) ON DELETE SET NULL,
  guest_email             TEXT,
  guest_phone             TEXT,
  status                  TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','processing','shipped','delivered','cancelled')),
  payment_status          TEXT NOT NULL DEFAULT 'pending'
                          CHECK (payment_status IN ('pending','paid','failed','refunded')),
  payment_method          TEXT DEFAULT 'paystack',
  payment_reference       TEXT,
  paystack_trx_ref        TEXT,
  subtotal                NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount         NUMERIC(10,2) DEFAULT 0,
  delivery_fee            NUMERIC(10,2) DEFAULT 0,
  total_amount            NUMERIC(10,2) NOT NULL DEFAULT 0,
  coupon_code             TEXT,
  shipping_name           TEXT,
  shipping_phone          TEXT,
  shipping_address        TEXT,
  shipping_city           TEXT,
  shipping_region         TEXT,
  tracking_number         TEXT,
  notes                   TEXT,
  order_type              TEXT DEFAULT 'regular' CHECK (order_type IN ('regular','gift_box','custom_gift_box')),
  gift_box_id             UUID REFERENCES gift_boxes(id) ON DELETE SET NULL,
  custom_gift_box_id      UUID REFERENCES custom_gift_boxes(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_paystack ON orders(paystack_trx_ref);

-- ─────────────────────────────────────────────
-- ORDER ITEMS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES products(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  quantity    INTEGER NOT NULL DEFAULT 1,
  unit_price  NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  image_url   TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────
-- ORDER NOTIFICATIONS LOG
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_notifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID REFERENCES orders(id) ON DELETE CASCADE,
  order_number      TEXT NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('email','sms')),
  event             TEXT NOT NULL,
  recipient         TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  error_message     TEXT,
  sent_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────
-- SITE SETTINGS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_settings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name            TEXT DEFAULT 'KW Enterprise',
  site_tagline         TEXT,
  contact_email        TEXT,
  contact_phone        TEXT DEFAULT '(+233) 26 479 3861',
  address              TEXT DEFAULT 'Accra, Ghana',
  logo_url             TEXT,
  favicon_url          TEXT,
  facebook_url         TEXT,
  instagram_url        TEXT,
  twitter_url          TEXT,
  whatsapp_number      TEXT,
  meta_title           TEXT,
  meta_description     TEXT,
  free_delivery_min    NUMERIC(10,2) DEFAULT 200,
  standard_delivery_fee NUMERIC(10,2) DEFAULT 15,
  currency             TEXT DEFAULT 'GHS',
  paystack_public_key  TEXT,
  updated_at           TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────
-- SEED DEFAULT SETTINGS ROW
-- ─────────────────────────────────────────────
INSERT INTO site_settings (site_name, contact_phone, address)
VALUES ('KW Enterprise', '(+233) 26 479 3861', 'Accra, Ghana')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────
-- NEWSLETTER SUBSCRIBERS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────
-- CMS PAGES (About, Services, etc.)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cms_pages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,   -- 'about', 'services'
  title         TEXT NOT NULL,
  content       JSONB NOT NULL DEFAULT '{}', -- flexible sections
  meta_title    TEXT,
  meta_desc     TEXT,
  is_published  BOOLEAN DEFAULT false,
  updated_at    TIMESTAMPTZ DEFAULT now()
);

INSERT INTO cms_pages (slug, title, content, is_published)
VALUES
  ('about',    'About Us',  '{"hero":{"heading":"About KW Enterprise","subheading":"Your Trusted FMCG Distributor in Ghana","image_url":""},"mission":"We are committed to delivering quality FMCG products across Ghana with speed and integrity.","vision":"To become the leading FMCG distribution company in West Africa.","values":[{"title":"Integrity","desc":"We do what we say."},{"title":"Quality","desc":"Only the best products."},{"title":"Speed","desc":"Fast, reliable delivery."}],"team":[],"stats":[{"label":"Products","value":"500+"},{"label":"Cities","value":"10+"},{"label":"Customers","value":"5000+"},{"label":"Years","value":"5+"}]}','{"hero":{"heading":"About KW Enterprise","subheading":"Your Trusted FMCG Distributor in Ghana","image_url":""},"mission":"","vision":"","values":[],"team":[],"stats":[]}'::jsonb),
  ('services', 'Our Services', '{"hero":{"heading":"Our Services","subheading":"Everything you need, delivered to your doorstep","image_url":""},"intro":"We offer a comprehensive range of FMCG distribution services tailored to meet the needs of businesses and individuals across Ghana.","services":[{"title":"Wholesale Distribution","icon":"Truck","desc":"Bulk FMCG product distribution to retailers and businesses across Ghana.","image_url":""},{"title":"Retail Sales","icon":"ShoppingBag","desc":"Individual product sales through our online platform with same-day delivery.","image_url":""},{"title":"Gift Box Curation","icon":"Gift","desc":"Custom and pre-curated gift boxes for every occasion.","image_url":""},{"title":"Corporate Supply","icon":"Building","desc":"Dedicated supply chain solutions for corporate clients.","image_url":""}],"process":[{"step":"1","title":"Browse & Order","desc":"Select products or gift boxes online"},{"step":"2","title":"Payment","desc":"Secure payment via PayStack or Mobile Money"},{"step":"3","title":"Processing","desc":"We pack your order with care"},{"step":"4","title":"Delivery","desc":"Fast delivery to your location"}]}', true)
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────
-- PRODUCT VARIATIONS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_variation_types (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,  -- e.g. 'Size', 'Colour', 'Pack'
  sort_order  INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS product_variation_options (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_id     UUID NOT NULL REFERENCES product_variation_types(id) ON DELETE CASCADE,
  value       TEXT NOT NULL,  -- e.g. 'Small', 'Red', '6-Pack'
  price_modifier NUMERIC(10,2) DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  sku         TEXT,
  image_url   TEXT,
  sort_order  INTEGER DEFAULT 0
);

-- ─────────────────────────────────────────────
-- PRODUCT MEDIA (images + videos with variants)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_media (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  media_type    TEXT NOT NULL CHECK (media_type IN ('image','video')),
  -- for images: three sizes
  url_original  TEXT NOT NULL,
  url_large     TEXT,          -- ~1200px
  url_medium    TEXT,          -- ~600px
  url_small     TEXT,          -- ~300px
  -- for video
  url_video     TEXT,
  thumbnail_url TEXT,
  duration_sec  INTEGER,
  alt_text      TEXT,
  sort_order    INTEGER DEFAULT 0,
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','ready','failed')),
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_media_product ON product_media(product_id);

-- ─────────────────────────────────────────────
-- MEDIA QUEUE JOBS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS media_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id      UUID REFERENCES product_media(id) ON DELETE CASCADE,
  entity_type   TEXT NOT NULL,   -- 'product', 'banner', 'page', 'category'
  entity_id     TEXT NOT NULL,
  original_path TEXT NOT NULL,
  status        TEXT DEFAULT 'queued' CHECK (status IN ('queued','processing','done','failed')),
  error_msg     TEXT,
  attempts      INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  processed_at  TIMESTAMPTZ
);

-- ─────────────────────────────────────────────
-- PRICING TAGS (Black Friday, Sale, Custom)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pricing_tags (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  slug           TEXT UNIQUE NOT NULL,
  tag_type       TEXT NOT NULL DEFAULT 'custom' CHECK (tag_type IN ('black_friday','flash_sale','clearance','new_arrival','custom')),
  color          TEXT NOT NULL DEFAULT '#ef4444',
  bg_color       TEXT NOT NULL DEFAULT '#fef2f2',
  icon           TEXT DEFAULT 'Tag',
  discount_type  TEXT CHECK (discount_type IN ('percentage','fixed','free_shipping','none')) DEFAULT 'none',
  discount_value NUMERIC(10,2) DEFAULT 0,
  valid_from     TIMESTAMPTZ DEFAULT now(),
  valid_until    TIMESTAMPTZ,
  is_active      BOOLEAN DEFAULT true,
  description    TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_pricing_tags (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag_id     UUID NOT NULL REFERENCES pricing_tags(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (product_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_product_pricing_tags_product ON product_pricing_tags(product_id);
CREATE INDEX IF NOT EXISTS idx_product_pricing_tags_tag ON product_pricing_tags(tag_id);


-- ─────────────────────────────────────────────
-- Contact Messages
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT,
  subject    TEXT,
  message    TEXT NOT NULL,
  is_read    BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created ON contact_messages(created_at DESC);

-- ─────────────────────────────────────────────
-- SEED: Admin user
-- ─────────────────────────────────────────────
-- password hash for 'admin@123' using bcrypt cost 12
-- Generated offline: $2b$12$6QIvVZPSUNy6cInlEe8.oOb8TuJ9Z2Z3n0FKwf4CovvNpC3t5RYOK
INSERT INTO profiles (full_name, email, phone, password_hash, role)
VALUES ('KW Admin', 'tech.dataglow@gmail.com', '+233264793861',
        '$2b$12$Placeholder.WillBeReplacedByScript', 'admin')
ON CONFLICT (email) DO UPDATE SET role = 'admin';

