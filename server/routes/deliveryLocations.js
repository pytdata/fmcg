const router = require('express').Router();
const pool = require('../db/pool');
const { auth, adminOnly } = require('../middleware/auth');

// GET /api/delivery-locations  (public — needed on checkout)
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM delivery_locations
       WHERE is_active = true
       ORDER BY sort_order, name`,
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch delivery locations' });
  }
});

// GET /api/delivery-locations/admin/all  (admin — includes inactive)
router.get('/admin/all', auth, adminOnly, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM delivery_locations ORDER BY sort_order, name',
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch delivery locations' });
  }
});

// POST /api/delivery-locations  (admin)
router.post('/', auth, adminOnly, async (req, res) => {
  const { name, region, delivery_fee, is_active, sort_order } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  if (delivery_fee === undefined || delivery_fee === null)
    return res.status(400).json({ error: 'delivery_fee is required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO delivery_locations (name, region, delivery_fee, is_active, sort_order)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, region || null, delivery_fee, is_active !== false, sort_order || 0],
    );
    res.status(201).json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Failed to create delivery location' });
  }
});

// PUT /api/delivery-locations/:id  (admin)
router.put('/:id', auth, adminOnly, async (req, res) => {
  const { name, region, delivery_fee, is_active, sort_order } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE delivery_locations
       SET name=$1, region=$2, delivery_fee=$3, is_active=$4, sort_order=$5
       WHERE id=$6 RETURNING *`,
      [name, region || null, delivery_fee, is_active !== false, sort_order || 0, req.params.id],
    );
    if (!rows.length) return res.status(404).json({ error: 'Location not found' });
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Failed to update delivery location' });
  }
});

// DELETE /api/delivery-locations/:id  (admin)
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM delivery_locations WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete delivery location' });
  }
});

module.exports = router;
