const router = require('express').Router();
const pool = require('../db/pool');
const { auth, adminOnly } = require('../middleware/auth');

// GET /api/modules — public: list all modules (used by the website to show/hide sections)
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM site_modules ORDER BY sort_order, label');
    res.json(rows);
  } catch (err) {
    console.error('[modules GET]', err.message);
    res.status(500).json({ error: 'Failed to fetch modules' });
  }
});

// PATCH /api/modules/:key — admin: toggle / update a module
router.patch('/:key', auth, adminOnly, async (req, res) => {
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean')
    return res.status(400).json({ error: 'enabled (boolean) is required' });
  try {
    const { rows } = await pool.query(
      `UPDATE site_modules SET enabled = $1, updated_at = now() WHERE key = $2 RETURNING *`,
      [enabled, req.params.key],
    );
    if (!rows.length) return res.status(404).json({ error: 'Module not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[modules PATCH]', err.message);
    res.status(500).json({ error: 'Failed to update module' });
  }
});

module.exports = router;
