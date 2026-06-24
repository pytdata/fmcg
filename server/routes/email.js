const router = require('express').Router();
const pool = require('../db/pool');
const { auth, adminOnly } = require('../middleware/auth');
const { buildEmailHtml, sendRawEmail } = require('../services/email');

// All endpoints in this module are admin-only.
router.use(auth, adminOnly);

// ─── Helpers ────────────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseEmailList({ emails, text }) {
  const raw = [];
  if (Array.isArray(emails)) raw.push(...emails);
  if (typeof text === 'string') raw.push(...text.split(/[\s,;\n]+/));
  const seen = new Set();
  const valid = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const email = item.trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email) || seen.has(email)) continue;
    seen.add(email);
    valid.push(email);
  }
  return valid;
}

// ─── Subscribers ──────────────────────────────────────────────────────────────

// GET /api/email/subscribers
router.get('/subscribers', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM newsletter_subscribers ORDER BY created_at DESC',
    );
    res.json(rows);
  } catch (err) {
    console.error('[email/subscribers list]', err.message);
    res.status(500).json({ error: 'Failed to fetch subscribers' });
  }
});

// POST /api/email/subscribers
router.post('/subscribers', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const name = req.body.name?.trim() || null;
  if (!email || !EMAIL_RE.test(email))
    return res.status(400).json({ error: 'A valid email is required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO newsletter_subscribers (email, name, source, is_active)
       VALUES ($1, $2, 'manual', true)
       ON CONFLICT (email) DO UPDATE
         SET is_active = true,
             name = COALESCE(EXCLUDED.name, newsletter_subscribers.name)
       RETURNING *`,
      [email, name],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[email/subscribers add]', err.message);
    res.status(500).json({ error: 'Failed to add subscriber' });
  }
});

// POST /api/email/subscribers/bulk
router.post('/subscribers/bulk', async (req, res) => {
  const emails = parseEmailList(req.body);
  if (!emails.length)
    return res.status(400).json({ error: 'No valid emails found' });
  try {
    const values = [];
    const params = [];
    emails.forEach((email, i) => {
      params.push(email);
      values.push(`($${i + 1}, 'manual', true)`);
    });
    const { rows } = await pool.query(
      `INSERT INTO newsletter_subscribers (email, source, is_active)
       VALUES ${values.join(', ')}
       ON CONFLICT (email) DO UPDATE SET is_active = true
       RETURNING (xmax = 0) AS inserted`,
      params,
    );
    const inserted = rows.filter(r => r.inserted).length;
    const reactivated = rows.length - inserted;
    res.json({ inserted, reactivated, total: rows.length });
  } catch (err) {
    console.error('[email/subscribers bulk]', err.message);
    res.status(500).json({ error: 'Failed to import subscribers' });
  }
});

// PATCH /api/email/subscribers/:id — toggle is_active
router.patch('/subscribers/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'UPDATE newsletter_subscribers SET is_active = NOT is_active WHERE id = $1 RETURNING *',
      [req.params.id],
    );
    if (!rows.length) return res.status(404).json({ error: 'Subscriber not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[email/subscribers toggle]', err.message);
    res.status(500).json({ error: 'Failed to update subscriber' });
  }
});

// DELETE /api/email/subscribers/:id
router.delete('/subscribers/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM newsletter_subscribers WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[email/subscribers delete]', err.message);
    res.status(500).json({ error: 'Failed to delete subscriber' });
  }
});

// ─── Campaigns ──────────────────────────────────────────────────────────────

// GET /api/email/campaigns
router.get('/campaigns', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM email_campaigns ORDER BY created_at DESC',
    );
    res.json(rows);
  } catch (err) {
    console.error('[email/campaigns list]', err.message);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// POST /api/email/campaigns — create draft
router.post('/campaigns', async (req, res) => {
  const subject = (req.body.subject || '').trim();
  const { preheader, body_html, template } = req.body;
  if (!subject) return res.status(400).json({ error: 'subject is required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO email_campaigns (subject, preheader, body_html, template, status)
       VALUES ($1, $2, $3, $4, 'draft') RETURNING *`,
      [subject, preheader || null, body_html || '', template || null],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[email/campaigns create]', err.message);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// PUT /api/email/campaigns/:id — update draft fields (only when draft)
router.put('/campaigns/:id', async (req, res) => {
  const subject = (req.body.subject || '').trim();
  const { preheader, body_html, template } = req.body;
  if (!subject) return res.status(400).json({ error: 'subject is required' });
  try {
    const { rows } = await pool.query(
      `UPDATE email_campaigns
         SET subject = $1, preheader = $2, body_html = $3, template = $4
       WHERE id = $5 AND status = 'draft'
       RETURNING *`,
      [subject, preheader || null, body_html || '', template || null, req.params.id],
    );
    if (!rows.length)
      return res.status(404).json({ error: 'Draft campaign not found or already sent' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[email/campaigns update]', err.message);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// DELETE /api/email/campaigns/:id
router.delete('/campaigns/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM email_campaigns WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[email/campaigns delete]', err.message);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

// POST /api/email/campaigns/:id/send
router.post('/campaigns/:id/send', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows: campRows } = await pool.query(
      'SELECT * FROM email_campaigns WHERE id = $1',
      [id],
    );
    const campaign = campRows[0];
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (campaign.status === 'sending')
      return res.status(409).json({ error: 'Campaign is already being sent' });
    if (campaign.status === 'sent')
      return res.status(409).json({ error: 'Campaign has already been sent' });

    const { rows: subs } = await pool.query(
      'SELECT email FROM newsletter_subscribers WHERE is_active = true',
    );
    const total = subs.length;

    await pool.query(
      `UPDATE email_campaigns SET status = 'sending', recipients_count = $2, sent_count = 0 WHERE id = $1`,
      [id, total],
    );

    if (total === 0) {
      await pool.query(
        `UPDATE email_campaigns
           SET status = 'failed', error_message = $2 WHERE id = $1`,
        [id, 'No active subscribers'],
      );
      return res.status(400).json({ error: 'No active subscribers to send to' });
    }

    const html = buildEmailHtml({
      title: campaign.subject,
      preheader: campaign.preheader || '',
      bodyHtml: campaign.body_html || '',
    });

    let sent = 0;
    for (const sub of subs) {
      try {
        await sendRawEmail({ to: sub.email, subject: campaign.subject, html });
        sent += 1;
      } catch (err) {
        console.error(`[email/campaign ${id}] failed for ${sub.email}:`, err.message);
      }
    }

    await pool.query(
      `UPDATE email_campaigns
         SET status = 'sent', sent_at = now(), sent_count = $2, recipients_count = $3
       WHERE id = $1`,
      [id, sent, total],
    );

    res.json({ sent, total });
  } catch (err) {
    console.error('[email/campaigns send]', err.message);
    await pool
      .query(
        `UPDATE email_campaigns SET status = 'failed', error_message = $2 WHERE id = $1`,
        [id, err.message],
      )
      .catch(() => {});
    res.status(500).json({ error: 'Failed to send campaign' });
  }
});

// POST /api/email/test — send a single preview/test email
router.post('/test', async (req, res) => {
  const to = (req.body.to || '').trim().toLowerCase();
  const subject = (req.body.subject || '').trim() || 'Test Email';
  const { body_html, preheader } = req.body;
  if (!to || !EMAIL_RE.test(to))
    return res.status(400).json({ error: 'A valid recipient email is required' });
  try {
    const html = buildEmailHtml({
      title: subject,
      preheader: preheader || '',
      bodyHtml: body_html || '',
    });
    await sendRawEmail({ to, subject: `[TEST] ${subject}`, html });
    res.json({ success: true });
  } catch (err) {
    console.error('[email/test]', err.message);
    res.status(500).json({ error: err.message || 'Failed to send test email' });
  }
});

module.exports = router;
