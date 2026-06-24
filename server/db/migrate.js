/**
 * Incremental migrations — safe to run multiple times (idempotent).
 * Called automatically on server startup from index.js.
 */
const pool = require('./pool');
const fs = require('fs');
const path = require('path');

// FMCG catalog (main categories, sub categories, products) generated from the
// supplied product-list spreadsheet. Seeded/merged on startup (idempotent).
let CATALOG = { main_categories: [], sub_categories: [], products: [] };
try {
  CATALOG = JSON.parse(fs.readFileSync(path.join(__dirname, 'fmcg-catalog.json'), 'utf8'));
} catch (e) {
  console.error('[migrations] catalog load failed:', e.message);
}

// Modules that can be activated / deactivated by the admin to show or hide
// sections + features across the website.
const DEFAULT_MODULES = [
  { key: 'categories_section', label: 'Shop by Category',     description: 'Category grid on the homepage', sort_order: 1 },
  { key: 'featured_products',  label: 'Featured Products',    description: 'Featured products section on the homepage', sort_order: 2 },
  { key: 'flash_sale',         label: 'Flash Sale Banner',    description: 'Promotional flash-sale strip on the homepage', sort_order: 3 },
  { key: 'promo_banners',      label: 'Promo Banners',        description: 'Two-column promotional banners', sort_order: 4 },
  { key: 'stats',              label: 'Stats Bar',            description: 'Company stats counter bar', sort_order: 5 },
  { key: 'why_choose_us',      label: 'Why Choose Us',        description: 'Value-proposition cards', sort_order: 6 },
  { key: 'gift_boxes',         label: 'Gift Boxes',           description: 'Gift box catalogue + navigation', sort_order: 7 },
  { key: 'custom_gift_box',    label: 'Custom Gift Box',      description: 'Build-your-own gift box feature', sort_order: 8 },
  { key: 'testimonials',       label: 'Testimonials',         description: 'Customer reviews section', sort_order: 9 },
  { key: 'trusted_brands',     label: 'Trusted Brands',       description: 'Trusted brand logos section', sort_order: 10 },
  { key: 'team',               label: 'Our Team',             description: 'Team members section on the About page', sort_order: 11 },
  { key: 'blog',               label: 'Blog & Tips',          description: 'Blog/tips section on the homepage', sort_order: 12 },
  { key: 'newsletter',         label: 'Newsletter',           description: 'Newsletter signup section', sort_order: 13 },
  { key: 'app_promo',          label: 'App Download CTA',     description: 'Mobile app coming-soon banner', sort_order: 14 },
  { key: 'social',             label: 'Social Links',         description: 'Follow-us social links section', sort_order: 15 },
  { key: 'services_page',      label: 'Services Page',        description: 'Services page + navigation link', sort_order: 16 },
  { key: 'faq_page',           label: 'FAQ Page',             description: 'FAQ page + navigation link', sort_order: 17 },
];

// Bump this whenever new migration steps are added so they run once per DB.
const SCHEMA_VERSION = '8';

// Default gift packaging options (admin can edit/add more afterwards).
const DEFAULT_PACKAGING = [
  { name: 'Premium Gold Wrap',  style: 'Luxury',   material: 'Gold foil paper + satin ribbon', price: 12, details: 'Our most premium finish — rich gold foil wrap with a hand-tied satin ribbon. Perfect for special occasions.' },
  { name: 'Elegant Silver Wrap', style: 'Elegant',  material: 'Silver matte paper + ribbon',     price: 10, details: 'Understated and classy silver matte wrap with a coordinated ribbon.' },
  { name: 'Soft Pink Wrap',      style: 'Romantic', material: 'Pink gift paper + gold ribbon',    price: 8,  details: 'Soft pink wrap with a gold ribbon — ideal for birthdays and celebrations.' },
  { name: 'Classic Kraft Wrap',  style: 'Rustic',   material: 'Recycled kraft paper + twine',     price: 6,  details: 'Eco-friendly rustic kraft wrap finished with natural twine.' },
];

async function runMigrations() {
  const client = await pool.connect();
  try {
    // ── Meta + CRITICAL schema guarantees (always run, isolated) ──────────────
    // These must succeed even if a later step fails, because public endpoints
    // depend on them. Each is idempotent.
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_meta (
        key TEXT PRIMARY KEY, value TEXT, updated_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    await client.query(`
      ALTER TABLE categories
        ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES categories(id) ON DELETE SET NULL
    `);
    await client.query(`
      ALTER TABLE categories
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true
    `);

    // Run the (heavier) full migration body only once per schema version — keeps
    // serverless cold starts cheap and avoids re-doing work on every invocation.
    const { rows: verRows } = await client.query(
      `SELECT value FROM app_meta WHERE key = 'schema_version'`,
    );
    if (verRows[0]?.value === SCHEMA_VERSION) {
      return;
    }

    // ── 002: create delivery_locations table ──────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS delivery_locations (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name         TEXT NOT NULL,
        region       TEXT,
        delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
        is_active    BOOLEAN DEFAULT true,
        sort_order   INTEGER DEFAULT 0,
        created_at   TIMESTAMPTZ DEFAULT now()
      )
    `);

    // ── 003: ensure cms_pages table exists ────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS cms_pages (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug         TEXT UNIQUE NOT NULL,
        title        TEXT NOT NULL,
        content      JSONB NOT NULL DEFAULT '{}',
        meta_title   TEXT,
        meta_desc    TEXT,
        is_published BOOLEAN DEFAULT false,
        updated_at   TIMESTAMPTZ DEFAULT now()
      )
    `);

    // ── 004: seed default cms_pages if missing ────────────────────────────────
    const pages = [
      {
        slug: 'home',
        title: 'Home Page',
        content: JSON.stringify({
          hero: { heading: 'Premium FMCG Products', subheading: 'Quality groceries, beverages and household essentials at unbeatable prices across Ghana.', button_text: 'Shop Now', button_link: '/shop' },
          features: [
            { icon: 'Truck', title: 'Fast Delivery', desc: 'Accra & beyond' },
            { icon: 'ShieldCheck', title: 'Secure Payment', desc: 'PayStack & MoMo' },
            { icon: 'Award', title: 'Quality Products', desc: 'Verified brands' },
            { icon: 'Headphones', title: '24/7 Support', desc: 'Always here' },
          ],
          flash_sale: { enabled: true, title: 'Up to 30% Off Selected Items', subtitle: "Limited time offer — grab your favourites before they're gone!", badge: 'Flash Sale' },
          stats: [
            { value: '500+', label: 'Products' },
            { value: '5,000+', label: 'Happy Customers' },
            { value: '10+', label: 'Cities Covered' },
            { value: '5', label: 'Years of Excellence' },
          ],
          promo_banners: [
            { title: 'Fresh Stock Just In', subtitle: 'New products added weekly. Be the first to shop!', badge: 'New Arrivals', link: '/shop', button_text: 'Shop New' },
            { title: 'Best Deals Just For You', subtitle: 'Exclusive savings on your favourites every week.', badge: 'Best Deals', link: '/shop', button_text: 'Grab Deals' },
          ],
          categories_heading: 'Shop by Category',
          categories_subheading: 'Browse our wide selection of product categories',
          featured_heading: 'Featured Products',
          featured_subheading: 'Hand-picked best sellers and new arrivals',
          testimonials: [
            { name: 'Abena Mensah', role: 'Regular Customer', text: 'KW Enterprise has the best quality products. Delivery is always on time and the packaging is perfect.', rating: 5 },
            { name: 'Kwame Asante', role: 'Business Owner', text: "I've been ordering wholesale from KW for 2 years. The prices are competitive and they always have stock.", rating: 5 },
            { name: 'Ama Boateng', role: 'Homemaker', text: "The gift boxes are absolutely beautiful! I ordered one for my mother's birthday and she loved it.", rating: 5 },
          ],
          newsletter: { heading: 'Get Exclusive Deals & Offers', subheading: 'Subscribe to our newsletter and be the first to know about promotions and new products.' },
          brands: ['Nestlé', 'Unilever', 'Procter & Gamble', 'Coca-Cola', 'Heineken', "Kellogg's"],
        }),
        is_published: true,
      },
      {
        slug: 'about',
        title: 'About Us',
        content: JSON.stringify({
          hero: { heading: 'About KW Enterprise', subheading: 'Your Trusted FMCG Distributor in Ghana', image_url: '' },
          mission: 'We are committed to delivering quality FMCG products across Ghana with speed and integrity.',
          vision: 'To become the leading FMCG distribution company in West Africa.',
          values: [
            { title: 'Integrity', desc: 'We do what we say.' },
            { title: 'Quality', desc: 'Only the best products.' },
            { title: 'Speed', desc: 'Fast, reliable delivery.' },
          ],
          team: [],
          stats: [
            { label: 'Products', value: '500+' },
            { label: 'Cities', value: '10+' },
            { label: 'Customers', value: '5000+' },
            { label: 'Years', value: '5+' },
          ],
        }),
        is_published: true,
      },
      {
        slug: 'services',
        title: 'Our Services',
        content: JSON.stringify({
          hero: { heading: 'Our Services', subheading: 'Everything you need, delivered to your doorstep', image_url: '' },
          intro: 'We offer a comprehensive range of FMCG distribution services tailored to meet the needs of businesses and individuals across Ghana.',
          services: [
            { title: 'Wholesale Distribution', icon: 'Truck', desc: 'Bulk FMCG product distribution to retailers and businesses across Ghana.', image_url: '' },
            { title: 'Retail Sales', icon: 'ShoppingBag', desc: 'Individual product sales through our online platform with same-day delivery.', image_url: '' },
            { title: 'Gift Box Curation', icon: 'Gift', desc: 'Custom and pre-curated gift boxes for every occasion.', image_url: '' },
            { title: 'Corporate Supply', icon: 'Building', desc: 'Dedicated supply chain solutions for corporate clients.', image_url: '' },
          ],
          process: [
            { step: '1', title: 'Browse & Order', desc: 'Select products or gift boxes online' },
            { step: '2', title: 'Payment', desc: 'Secure payment via PayStack or Mobile Money' },
            { step: '3', title: 'Processing', desc: 'We pack your order with care' },
            { step: '4', title: 'Delivery', desc: 'Fast delivery to your location' },
          ],
        }),
        is_published: true,
      },
      {
        slug: 'contact',
        title: 'Contact Us',
        content: JSON.stringify({
          hero: { heading: "We'd Love to Hear from You", subheading: 'Our team is here for you.', image_url: '' },
          address: 'East Legon, Accra, Greater Accra Region, Ghana',
          phone: '+233 26 479 3861',
          email: 'info@werekoenterprise.com',
          hours: 'Mon – Fri: 8am – 6pm | Sat: 9am – 4pm | Sun: Closed',
          social: { facebook: '', instagram: '', twitter: '', whatsapp: 'https://wa.me/233264793861' },
        }),
        is_published: true,
      },
      {
        slug: 'faq',
        title: 'FAQ',
        content: JSON.stringify({
          hero: { heading: 'Frequently Asked Questions', subheading: 'Everything you need to know.' },
          faqs: [
            { question: 'How long does delivery take?', answer: 'We deliver within 24–48 hours in Accra and 3–5 business days elsewhere.' },
            { question: 'Can I return a product?', answer: 'Yes, we accept returns within 7 days of delivery for unopened products.' },
          ],
        }),
        is_published: true,
      },
      {
        slug: 'terms',
        title: 'Terms & Conditions',
        content: JSON.stringify({
          hero: { heading: 'Terms & Conditions', subheading: 'Please read these terms carefully.' },
          sections: [
            { title: 'Acceptance of Terms', body: 'By using our website, you agree to be bound by these terms and conditions.' },
            { title: 'Use of Service', body: 'You may use our services only for lawful purposes and in accordance with these terms.' },
            { title: 'Orders & Payment', body: 'All orders are subject to availability. Payment must be made in full before dispatch.' },
          ],
          last_updated: new Date().toISOString().split('T')[0],
        }),
        is_published: true,
      },
      {
        slug: 'privacy',
        title: 'Privacy Policy',
        content: JSON.stringify({
          hero: { heading: 'Privacy Policy', subheading: 'Your privacy is important to us.' },
          sections: [
            { title: 'Information We Collect', body: 'We collect information you provide directly, such as name, email, and phone number when you place an order or contact us.' },
            { title: 'How We Use Your Data', body: 'We use your data to process orders, send updates, and improve our services. We never sell your data to third parties.' },
            { title: 'Data Security', body: 'We implement appropriate security measures to protect your personal information.' },
          ],
          last_updated: new Date().toISOString().split('T')[0],
        }),
        is_published: true,
      },
    ];

    for (const page of pages) {
      await client.query(
        `INSERT INTO cms_pages (slug, title, content, is_published)
         VALUES ($1, $2, $3::jsonb, $4)
         ON CONFLICT (slug) DO NOTHING`,
        [page.slug, page.title, page.content, page.is_published],
      );
    }

    // ── 005: ensure contact_messages table exists ─────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name       TEXT NOT NULL,
        email      TEXT NOT NULL,
        phone      TEXT,
        subject    TEXT,
        message    TEXT NOT NULL,
        is_read    BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_contact_messages_created
        ON contact_messages(created_at DESC)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_contact_messages_email
        ON contact_messages(email)
    `);

    // ── 006: app_meta key/value table (used for one-time seed guards) ─────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_meta (
        key   TEXT PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    // ── 007: site_modules (admin activates/deactivates website modules) ───────
    await client.query(`
      CREATE TABLE IF NOT EXISTS site_modules (
        key         TEXT PRIMARY KEY,
        label       TEXT NOT NULL,
        description TEXT,
        enabled     BOOLEAN NOT NULL DEFAULT true,
        sort_order  INTEGER DEFAULT 0,
        updated_at  TIMESTAMPTZ DEFAULT now()
      )
    `);
    for (const m of DEFAULT_MODULES) {
      await client.query(
        `INSERT INTO site_modules (key, label, description, sort_order)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (key) DO UPDATE
           SET label = EXCLUDED.label,
               description = EXCLUDED.description,
               sort_order = EXCLUDED.sort_order`,
        [m.key, m.label, m.description, m.sort_order],
      );
    }

    // ── 008: trusted brands (admin uploads brand logo URLs) ───────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS brands (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        TEXT NOT NULL,
        logo_url    TEXT,
        website_url TEXT,
        sort_order  INTEGER DEFAULT 0,
        is_active   BOOLEAN DEFAULT true,
        created_at  TIMESTAMPTZ DEFAULT now()
      )
    `);

    // ── 009: team members (admin manages the team) ────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS team_members (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name         TEXT NOT NULL,
        role         TEXT,
        photo_url    TEXT,
        bio          TEXT,
        email        TEXT,
        linkedin_url TEXT,
        twitter_url  TEXT,
        sort_order   INTEGER DEFAULT 0,
        is_active    BOOLEAN DEFAULT true,
        created_at   TIMESTAMPTZ DEFAULT now()
      )
    `);

    // ── 010: first-party analytics events ─────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id          BIGSERIAL PRIMARY KEY,
        event_type  TEXT NOT NULL DEFAULT 'pageview',
        path        TEXT,
        referrer    TEXT,
        device      TEXT,
        session_id  TEXT,
        user_id     UUID,
        meta        JSONB DEFAULT '{}',
        created_at  TIMESTAMPTZ DEFAULT now()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_analytics_path ON analytics_events(path)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics_events(session_id)`);

    // ── 011: SEO meta per page/path + audit history ───────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS seo_meta (
        path             TEXT PRIMARY KEY,
        title            TEXT,
        meta_title       TEXT,
        meta_description TEXT,
        keywords         TEXT,
        og_image         TEXT,
        canonical_url    TEXT,
        h1               TEXT,
        focus_keyword    TEXT,
        noindex          BOOLEAN DEFAULT false,
        score            INTEGER DEFAULT 0,
        updated_at       TIMESTAMPTZ DEFAULT now()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS seo_audits (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        overall_score INTEGER NOT NULL DEFAULT 0,
        results       JSONB NOT NULL DEFAULT '[]',
        created_at    TIMESTAMPTZ DEFAULT now()
      )
    `);
    // Seed default SEO rows for the main public paths (merge — never overwrite).
    const seoDefaults = [
      { path: '/',         title: 'KW Enterprise — Trusted FMCG Distribution in Ghana', meta_description: 'KW Enterprise is a leading FMCG distributor in Ghana supplying quality household, personal-care and food products to retailers and homes.' },
      { path: '/shop',     title: 'Shop FMCG Products — KW Enterprise', meta_description: 'Browse hundreds of quality FMCG products across personal care, home care, food and more. Fast, reliable delivery across Ghana.' },
      { path: '/about',    title: 'About Us — KW Enterprise', meta_description: 'Learn about KW Enterprise, our mission, values and the team behind Ghana’s trusted FMCG distribution business.' },
      { path: '/services', title: 'Our Services — KW Enterprise', meta_description: 'Wholesale distribution, retail supply and corporate solutions from KW Enterprise.' },
      { path: '/contact',  title: 'Contact Us — KW Enterprise', meta_description: 'Get in touch with KW Enterprise for orders, wholesale enquiries and support.' },
    ];
    for (const s of seoDefaults) {
      await client.query(
        `INSERT INTO seo_meta (path, title, meta_title, meta_description)
         VALUES ($1,$2,$2,$3)
         ON CONFLICT (path) DO NOTHING`,
        [s.path, s.title, s.meta_description],
      );
    }

    // ── 012: seed FMCG catalog (categories + sub-categories + products) ────────
    // Isolated so a seeding hiccup can never block schema_version from being set.
    try {
    const { rows: seededRows } = await client.query(
      `SELECT value FROM app_meta WHERE key = 'catalog_seeded_v1'`,
    );
    if (!seededRows.length && CATALOG.main_categories.length) {
      const slugToId = {};
      // main categories
      for (const c of CATALOG.main_categories) {
        const { rows } = await client.query(
          `INSERT INTO categories (name, slug, sort_order)
           VALUES ($1,$2,$3)
           ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [c.name, c.slug, c.sort_order || 0],
        );
        slugToId[c.slug] = rows[0].id;
      }
      // sub categories (link to parent; merge parent if missing)
      for (const c of CATALOG.sub_categories) {
        const parentId = slugToId[c.parent_slug] || null;
        const { rows } = await client.query(
          `INSERT INTO categories (name, slug, sort_order, parent_id)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (slug) DO UPDATE
             SET parent_id = COALESCE(categories.parent_id, EXCLUDED.parent_id),
                 name = EXCLUDED.name
           RETURNING id`,
          [c.name, c.slug, c.sort_order || 0, parentId],
        );
        slugToId[c.slug] = rows[0].id;
      }
      // products (price defaults to 0 — admin sets prices afterwards)
      let inserted = 0;
      for (const p of CATALOG.products) {
        const catId = slugToId[p.category_slug] || null;
        await client.query(
          `INSERT INTO products (name, slug, sku, category_id, price, stock_quantity, is_active)
           VALUES ($1,$2,$3,$4,0,0,true)
           ON CONFLICT (slug) DO NOTHING`,
          [p.name, p.slug, p.sku || null, catId],
        );
        inserted++;
      }
      await client.query(
        `INSERT INTO app_meta (key, value) VALUES ('catalog_seeded_v1', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [String(inserted)],
      );
      console.log(`[migrations] FMCG catalog seeded: ${CATALOG.main_categories.length} main, ${CATALOG.sub_categories.length} sub, ${inserted} products.`);
    }
    } catch (seedErr) {
      console.error('[migrations] Catalog seed skipped:', seedErr.message);
    }

    // ── 014: product video URLs (Google-Drive style media links) ──────────────
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS video_urls TEXT[] DEFAULT '{}'`);

    // ── 015: gift packaging options (admin-managed) ───────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS gift_packaging (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        TEXT NOT NULL,
        style       TEXT,
        material    TEXT,
        price       NUMERIC(10,2) NOT NULL DEFAULT 0,
        details     TEXT,
        image_url   TEXT,
        sort_order  INTEGER DEFAULT 0,
        is_active   BOOLEAN DEFAULT true,
        created_at  TIMESTAMPTZ DEFAULT now()
      )
    `);
    {
      const { rows: pkgCount } = await client.query('SELECT COUNT(*)::int AS n FROM gift_packaging');
      if (pkgCount[0].n === 0) {
        let i = 0;
        for (const p of DEFAULT_PACKAGING) {
          await client.query(
            `INSERT INTO gift_packaging (name, style, material, price, details, sort_order)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [p.name, p.style, p.material, p.price, p.details, i++],
          );
        }
      }
    }

    // ── 016: blog posts (Blog & Tips) ─────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title           TEXT NOT NULL,
        slug            TEXT UNIQUE NOT NULL,
        excerpt         TEXT,
        content         TEXT,
        cover_image_url TEXT,
        category        TEXT,
        author          TEXT,
        read_time       TEXT,
        is_published    BOOLEAN DEFAULT false,
        published_at    TIMESTAMPTZ,
        created_at      TIMESTAMPTZ DEFAULT now(),
        updated_at      TIMESTAMPTZ DEFAULT now()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_blog_published ON blog_posts(is_published, published_at DESC)`);

    // ── 017: newsletter subscriber fields + email campaigns ───────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email      TEXT UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    await client.query(`ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS name TEXT`);
    await client.query(`ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`);
    await client.query(`ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'signup'`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_campaigns (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subject          TEXT NOT NULL,
        preheader        TEXT,
        body_html        TEXT NOT NULL DEFAULT '',
        template         TEXT DEFAULT 'basic',
        status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sending','sent','failed')),
        recipients_count INTEGER DEFAULT 0,
        sent_count       INTEGER DEFAULT 0,
        error_message    TEXT,
        created_at       TIMESTAMPTZ DEFAULT now(),
        sent_at          TIMESTAMPTZ
      )
    `);

    // ── 018: ensure pricing-tags tables exist (admin endpoints depend on them) ─
    await client.query(`
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
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_pricing_tags (
        product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        tag_id      UUID NOT NULL REFERENCES pricing_tags(id) ON DELETE CASCADE,
        assigned_at TIMESTAMPTZ DEFAULT now(),
        PRIMARY KEY (product_id, tag_id)
      )
    `);

    // ── Mark this schema version complete so the heavy body is skipped next time.
    await client.query(
      `INSERT INTO app_meta (key, value) VALUES ('schema_version', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [SCHEMA_VERSION],
    );

    console.log('[migrations] All migrations applied successfully.');
  } catch (err) {
    console.error('[migrations] Migration error:', err.message);
  } finally {
    client.release();
  }
}

// Memoised gate: ensures the schema is ready before a request touches the DB.
// On serverless, the module-load migration is a race — the first requests after a
// cold start can hit the DB before it finishes. Awaiting this in middleware closes
// that race. After the first success it resolves instantly (cheap version check).
let _migrationPromise = null;
function ensureMigrated() {
  if (!_migrationPromise) {
    _migrationPromise = runMigrations().catch(err => {
      // Allow a retry on the next request if it failed.
      _migrationPromise = null;
      throw err;
    });
  }
  return _migrationPromise;
}

module.exports = runMigrations;
module.exports.runMigrations = runMigrations;
module.exports.ensureMigrated = ensureMigrated;
