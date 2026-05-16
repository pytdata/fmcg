/**
 * Incremental migrations — safe to run multiple times (idempotent).
 * Called automatically on server startup from index.js.
 */
const pool = require('./pool');

async function runMigrations() {
  const client = await pool.connect();
  try {
    // ── 001: add parent_id to categories ──────────────────────────────────────
    await client.query(`
      ALTER TABLE categories
        ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES categories(id) ON DELETE SET NULL
    `);

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

    console.log('[migrations] All migrations applied successfully.');
  } catch (err) {
    console.error('[migrations] Migration error:', err.message);
  } finally {
    client.release();
  }
}

module.exports = runMigrations;
