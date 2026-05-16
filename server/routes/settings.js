const router = require('express').Router();
const pool = require('../db/pool');
const { auth, adminOnly } = require('../middleware/auth');

// GET /api/settings — public
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM site_settings LIMIT 1');
    res.json(rows[0] || {});
  } catch {
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
  if (!email || !email.includes('@'))
    return res.status(400).json({ error: 'Valid email required' });
  try {
    await pool.query(
      `INSERT INTO newsletter_subscribers (email) VALUES ($1) ON CONFLICT (email) DO NOTHING`,
      [email.trim().toLowerCase()],
    );
    res.json({ success: true, message: 'Subscribed successfully' });
  } catch (err) {
    console.error('[newsletter/subscribe]', err);
    res.status(500).json({ error: 'Subscription failed' });
  }
});

// POST /api/settings/contact-message — save contact form submission (36h rate limit)
router.post('/contact-message', async (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  if (!name || !email || !message)
    return res.status(400).json({ error: 'name, email, and message are required.' });

  const cleanEmail = email.trim().toLowerCase();

  try {
    // ── 36-hour rate limit per email ──────────────────────────────────────
    const { rows: recent } = await pool.query(
      `SELECT id, created_at FROM contact_messages
       WHERE email = $1 AND created_at > now() - interval '36 hours'
       ORDER BY created_at DESC LIMIT 1`,
      [cleanEmail],
    );
    if (recent.length > 0) {
      const nextAllowed = new Date(recent[0].created_at);
      nextAllowed.setHours(nextAllowed.getHours() + 36);
      return res.status(429).json({
        error: 'rate_limited',
        message: 'You have already sent a message recently. Please wait before sending another.',
        next_allowed_at: nextAllowed.toISOString(),
      });
    }

    await pool.query(
      `INSERT INTO contact_messages (name, email, phone, subject, message)
       VALUES ($1, $2, $3, $4, $5)`,
      [name.trim(), cleanEmail, phone?.trim() || null, subject?.trim() || null, message.trim()],
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[contact-message]', err.message);
    res.status(500).json({ error: 'Failed to send message. Please try again.' });
  }
});

// GET /api/settings/contact-messages — admin: list all messages
router.get('/contact-messages', auth, adminOnly, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 50;
    const offset = (page - 1) * limit;
    const { rows } = await pool.query(
      `SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    const { rows: countRows } = await pool.query('SELECT COUNT(*) FROM contact_messages');
    res.json({ messages: rows, total: parseInt(countRows[0].count), page, limit });
  } catch (err) {
    console.error('[contact-messages/list]', err.message);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// PATCH /api/settings/contact-messages/:id/read — mark as read
router.patch('/contact-messages/:id/read', auth, adminOnly, async (req, res) => {
  try {
    await pool.query(
      `UPDATE contact_messages SET is_read = $1 WHERE id = $2`,
      [req.body.is_read !== false, req.params.id],
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[contact-messages/read]', err.message);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// DELETE /api/settings/contact-messages/:id — admin delete
router.delete('/contact-messages/:id', auth, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM contact_messages WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[contact-messages/delete]', err.message);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

module.exports = router;
