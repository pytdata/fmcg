/**
 * Seed script – run once to insert admin user + default pricing tags
 * Usage: node server/db/seed.js
 */
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const pool = require('./pool');

async function seed() {
  console.log('🌱 Seeding database…');

  // ── Admin user ────────────────────────────────────────────────────────────
  const email    = 'tech.dataglow@gmail.com';
  const password = 'admin@123';
  const hash     = await bcrypt.hash(password, 12);

  await pool.query(
    `INSERT INTO profiles (full_name, email, phone, password_hash, role)
     VALUES ($1, $2, $3, $4, 'admin')
     ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           role          = 'admin',
           full_name     = EXCLUDED.full_name`,
    ['KW Admin', email, '+233264793861', hash],
  );
  console.log(`✅ Admin user seeded: ${email}`);

  // ── Default pricing tags ──────────────────────────────────────────────────
  const tags = [
    {
      name: 'Black Friday',  slug: 'black-friday',  tag_type: 'black_friday',
      color: '#ffffff',      bg_color: '#111827',    icon: 'Zap',
      discount_type: 'percentage', discount_value: 20,
      description: 'Biggest sale of the year – up to 20% off selected products',
    },
    {
      name: 'Flash Sale',    slug: 'flash-sale',    tag_type: 'flash_sale',
      color: '#ffffff',      bg_color: '#dc2626',    icon: 'Flame',
      discount_type: 'percentage', discount_value: 15,
      description: 'Limited time flash sale – 15% off',
    },
    {
      name: 'Clearance',     slug: 'clearance',     tag_type: 'clearance',
      color: '#ffffff',      bg_color: '#7c3aed',    icon: 'Tag',
      discount_type: 'fixed', discount_value: 5,
      description: 'End-of-line clearance – GHS 5 off per item',
    },
    {
      name: 'New Arrival',   slug: 'new-arrival',   tag_type: 'new_arrival',
      color: '#ffffff',      bg_color: '#0891b2',    icon: 'Sparkles',
      discount_type: 'none', discount_value: 0,
      description: 'Freshly stocked products',
    },
  ];

  for (const t of tags) {
    await pool.query(
      `INSERT INTO pricing_tags
         (name, slug, tag_type, color, bg_color, icon, discount_type, discount_value, description, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true)
       ON CONFLICT (slug) DO NOTHING`,
      [t.name, t.slug, t.tag_type, t.color, t.bg_color, t.icon,
       t.discount_type, t.discount_value, t.description],
    );
  }
  console.log('✅ Default pricing tags seeded');

  // ── Order notifications table (idempotent) ────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_notifications (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id          UUID REFERENCES orders(id) ON DELETE CASCADE,
      order_number      TEXT,
      notification_type TEXT NOT NULL CHECK (notification_type IN ('email','sms')),
      event             TEXT NOT NULL,
      recipient         TEXT,
      status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
      error_message     TEXT,
      sent_at           TIMESTAMPTZ,
      created_at        TIMESTAMPTZ DEFAULT now()
    )
  `);
  console.log('✅ order_notifications table ensured');

  // ── Pricing tags tables (idempotent) ─────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pricing_tags (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name           TEXT NOT NULL,
      slug           TEXT UNIQUE NOT NULL,
      tag_type       TEXT NOT NULL DEFAULT 'custom' CHECK (tag_type IN ('black_friday','flash_sale','clearance','new_arrival','custom')),
      color          TEXT NOT NULL DEFAULT '#ffffff',
      bg_color       TEXT NOT NULL DEFAULT '#ef4444',
      icon           TEXT DEFAULT 'Tag',
      discount_type  TEXT CHECK (discount_type IN ('percentage','fixed','free_shipping','none')) DEFAULT 'none',
      discount_value NUMERIC(10,2) DEFAULT 0,
      valid_from     TIMESTAMPTZ DEFAULT now(),
      valid_until    TIMESTAMPTZ,
      is_active      BOOLEAN DEFAULT true,
      description    TEXT,
      created_at     TIMESTAMPTZ DEFAULT now(),
      updated_at     TIMESTAMPTZ DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_pricing_tags (
      product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      tag_id      UUID NOT NULL REFERENCES pricing_tags(id) ON DELETE CASCADE,
      assigned_at TIMESTAMPTZ DEFAULT now(),
      PRIMARY KEY (product_id, tag_id)
    )
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_ppt_product ON product_pricing_tags(product_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_ppt_tag ON product_pricing_tags(tag_id)`);
  console.log('✅ pricing_tags + product_pricing_tags tables ensured');

  // ── Promotions: ensure free_shipping type is allowed ─────────────────────
  await pool.query(`
    ALTER TABLE promotions
      DROP CONSTRAINT IF EXISTS promotions_discount_type_check
  `);
  await pool.query(`
    ALTER TABLE promotions
      ADD CONSTRAINT promotions_discount_type_check
      CHECK (discount_type IN ('percentage','fixed','free_shipping'))
  `);
  console.log('✅ Promotions discount_type updated to include free_shipping');

  console.log('\n🎉 Seed complete!');
  process.exit(0);
}

seed().catch(err => { console.error('❌ Seed failed:', err.message); process.exit(1); });
