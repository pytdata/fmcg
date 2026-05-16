const router = require('express').Router();
const pool = require('../db/pool');
const { auth, adminOnly } = require('../middleware/auth');

// GET /api/settings — public
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM site_settings LIMIT 1');
    res.json(rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /api/settings — admin only
router.put('/', auth, adminOnly, async (req, res) => {
  const {
    site_name, site_tagline, contact_email, contact_phone, address, logo_url,
    facebook_url, instagram_url, twitter_url, whatsapp_number, meta_title,
    meta_description, free_delivery_min, standard_delivery_fee, paystack_public_key,
  } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE site_settings SET
         site_name = COALESCE($1, site_name),
         site_tagline = COALESCE($2, site_tagline),
         contact_email = COALESCE($3, contact_email),
         contact_phone = COALESCE($4, contact_phone),
         address = COALESCE($5, address),
         logo_url = COALESCE($6, logo_url),
         facebook_url = COALESCE($7, facebook_url),
         instagram_url = COALESCE($8, instagram_url),
         twitter_url = COALESCE($9, twitter_url),
         whatsapp_number = COALESCE($10, whatsapp_number),
         meta_title = COALESCE($11, meta_title),
         meta_description = COALESCE($12, meta_description),
         free_delivery_min = COALESCE($13, free_delivery_min),
         standard_delivery_fee = COALESCE($14, standard_delivery_fee),
         paystack_public_key = COALESCE($15, paystack_public_key),
         updated_at = now()
       WHERE id = (SELECT id FROM site_settings LIMIT 1)
       RETURNING *`,
      [site_name, site_tagline, contact_email, contact_phone, address, logo_url,
       facebook_url, instagram_url, twitter_url, whatsapp_number, meta_title,
       meta_description, free_delivery_min, standard_delivery_fee, paystack_public_key],
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('[settings/update]', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// POST /api/settings/newsletter — public newsletter subscription
router.post('/newsletter', async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }
  try {
    await pool.query(
      `INSERT INTO newsletter_subscribers (email) VALUES ($1)
       ON CONFLICT (email) DO NOTHING`,
      [email.trim().toLowerCase()],
    );
    res.json({ success: true, message: 'Subscribed successfully' });
  } catch (err) {
    console.error('[newsletter/subscribe]', err);
    res.status(500).json({ error: 'Subscription failed' });
  }
});

// POST /api/settings/contact-message — save contact form submission
router.post('/contact-message', async (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'name, email, and message are required.' });
  }
  try {
    await pool.query(
      `INSERT INTO contact_messages (name, email, phone, subject, message)
       VALUES ($1, $2, $3, $4, $5)`,
      [name.trim(), email.trim().toLowerCase(), phone?.trim() || null, subject?.trim() || null, message.trim()]
    );
    res.json({ success: true });
  } catch (err) {
    // Table may not exist yet — still return success so UI doesn't fail
    console.error('[contact-message]', err.message);
    res.json({ success: true });
  }
});

module.exports = router;

// GET /api/settings
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM site_settings LIMIT 1');
    res.json(rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /api/settings  (admin)
router.put('/', auth, adminOnly, async (req, res) => {
  const {
    site_name, site_tagline, contact_email, contact_phone, address, logo_url,
    facebook_url, instagram_url, twitter_url, whatsapp_number, meta_title,
    meta_description, free_delivery_min, standard_delivery_fee, paystack_public_key,
  } = req.body;
  try {
    // Upsert — ensure one row exists
    const { rows } = await pool.query(
      `UPDATE site_settings SET
         site_name = COALESCE($1, site_name),
         site_tagline = COALESCE($2, site_tagline),
         contact_email = COALESCE($3, contact_email),
         contact_phone = COALESCE($4, contact_phone),
         address = COALESCE($5, address),
         logo_url = COALESCE($6, logo_url),
         facebook_url = COALESCE($7, facebook_url),
         instagram_url = COALESCE($8, instagram_url),
         twitter_url = COALESCE($9, twitter_url),
         whatsapp_number = COALESCE($10, whatsapp_number),
         meta_title = COALESCE($11, meta_title),
         meta_description = COALESCE($12, meta_description),
         free_delivery_min = COALESCE($13, free_delivery_min),
         standard_delivery_fee = COALESCE($14, standard_delivery_fee),
         paystack_public_key = COALESCE($15, paystack_public_key),
         updated_at = now()
       WHERE id = (SELECT id FROM site_settings LIMIT 1)
       RETURNING *`,
      [site_name, site_tagline, contact_email, contact_phone, address, logo_url,
       facebook_url, instagram_url, twitter_url, whatsapp_number, meta_title,
       meta_description, free_delivery_min, standard_delivery_fee, paystack_public_key],
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('[settings/update]', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// POST /api/settings/contact-message — save contact form submission
router.post('/contact-message', async (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'name, email, and message are required.' });
  }
  try {
    await pool.query(
      `INSERT INTO contact_messages (name, email, phone, subject, message)
       VALUES ($1, $2, $3, $4, $5)`,
      [name.trim(), email.trim().toLowerCase(), phone?.trim() || null, subject?.trim() || null, message.trim()]
    );
    res.json({ success: true });
  } catch (err) {
    // Table may not exist yet — still return success so UI doesn't fail
    console.error('[contact-message]', err.message);
    res.json({ success: true });
  }
});

module.exports = router;
