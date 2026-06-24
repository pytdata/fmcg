const router = require('express').Router();
const pool = require('../db/pool');
const { auth, adminOnly } = require('../middleware/auth');

// GET /api/brands  (public — active only)
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM brands
       WHERE is_active = true
       ORDER BY sort_order, name`,
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

// GET /api/brands/admin/all  (admin — includes inactive)
router.get('/admin/all', auth, adminOnly, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM brands ORDER BY sort_order, name',
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

// POST /api/brands  (admin)
router.post('/', auth, adminOnly, async (req, res) => {
  const { name, logo_url, website_url, sort_order, is_active } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO brands (name, logo_url, website_url, sort_order, is_active)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, logo_url || null, website_url || null, sort_order || 0, is_active !== false],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[brands POST]', err.message);
    res.status(500).json({ error: 'Failed to create brand', detail: err.message });
  }
});

// PUT /api/brands/:id  (admin)
router.put('/:id', auth, adminOnly, async (req, res) => {
  const { name, logo_url, website_url, sort_order, is_active } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE brands
       SET name=$1, logo_url=$2, website_url=$3, sort_order=$4, is_active=$5
       WHERE id=$6 RETURNING *`,
      [name, logo_url || null, website_url || null, sort_order || 0, is_active !== false, req.params.id],
    );
    if (!rows.length) return res.status(404).json({ error: 'Brand not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[brands PUT]', err.message);
    res.status(500).json({ error: 'Failed to update brand', detail: err.message });
  }
});

// DELETE /api/brands/:id  (admin)
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM brands WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[brands DELETE]', err.message);
    res.status(500).json({ error: 'Failed to delete brand', detail: err.message });
  }
});

module.exports = router;
