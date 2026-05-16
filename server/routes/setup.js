/**
 * One-time setup route – creates the admin user and default pricing tags.
 * Protected by SETUP_TOKEN env var (or falls back to JWT_SECRET prefix).
 * Disable by setting SETUP_DISABLED=true in server/.env after first use.
 */
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const pool   = require('../db/pool');

// POST /api/setup/admin
router.post('/admin', async (req, res) => {
  if (process.env.SETUP_DISABLED === 'true') {
    return res.status(403).json({ error: 'Setup is disabled. Remove SETUP_DISABLED from .env to re-enable.' });
  }

  const { setup_token, email, password, full_name, phone } = req.body;

  // Validate setup token
  const expectedToken = process.env.SETUP_TOKEN || (process.env.JWT_SECRET || '').slice(0, 16);
  if (!setup_token || setup_token !== expectedToken) {
    return res.status(401).json({ error: 'Invalid setup token.' });
  }

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required.' });
  }

  try {
    const hash = await bcrypt.hash(password, 12);

    // Upsert admin user
    const { rows } = await pool.query(
      `INSERT INTO profiles (full_name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, 'admin')
       ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             role          = 'admin',
             full_name     = COALESCE(EXCLUDED.full_name, profiles.full_name)
       RETURNING id, full_name, email, role`,
      [full_name || 'Admin', email.toLowerCase(), phone || null, hash],
    );

    return res.json({
      success: true,
      message: `Admin user created/updated: ${rows[0].email}`,
      user: rows[0],
    });
  } catch (err) {
    console.error('[setup/admin]', err);
    return res.status(500).json({ error: 'Setup failed: ' + err.message });
  }
});

// GET /api/setup/status – check if setup has been run
router.get('/status', async (_req, res) => {
  if (process.env.SETUP_DISABLED === 'true') {
    return res.json({ setup_disabled: true });
  }
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*) AS count FROM profiles WHERE role = 'admin'`,
    );
    res.json({ admin_count: parseInt(rows[0].count, 10) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
