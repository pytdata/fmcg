const router = require('express').Router();
const pool = require('../db/pool');
const { auth, adminOnly } = require('../middleware/auth');

// GET /api/gift-packaging  (public — shown on the custom gift box page)
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM gift_packaging
       WHERE is_active = true
       ORDER BY sort_order, name`,
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch gift packaging' });
  }
});

// GET /api/gift-packaging/admin/all  (admin — includes inactive)
router.get('/admin/all', auth, adminOnly, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM gift_packaging ORDER BY sort_order, name',
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch gift packaging' });
  }
});

// POST /api/gift-packaging  (admin)
router.post('/', auth, adminOnly, async (req, res) => {
  const { name, style, material, price, details, image_url, sort_order, is_active } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO gift_packaging (name, style, material, price, details, image_url, sort_order, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        name,
        style || null,
        material || null,
        price || 0,
        details || null,
        image_url || null,
        sort_order || 0,
        is_active !== false,
      ],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[gift-packaging POST]', err.message);
    res.status(500).json({ error: 'Failed to create gift packaging', detail: err.message });
  }
});

// PUT /api/gift-packaging/:id  (admin)
router.put('/:id', auth, adminOnly, async (req, res) => {
  const { name, style, material, price, details, image_url, sort_order, is_active } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE gift_packaging
       SET name=$1, style=$2, material=$3, price=$4, details=$5, image_url=$6, sort_order=$7, is_active=$8
       WHERE id=$9 RETURNING *`,
      [
        name,
        style || null,
        material || null,
        price || 0,
        details || null,
        image_url || null,
        sort_order || 0,
        is_active !== false,
        req.params.id,
      ],
    );
    if (!rows.length) return res.status(404).json({ error: 'Packaging not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[gift-packaging PUT]', err.message);
    res.status(500).json({ error: 'Failed to update gift packaging', detail: err.message });
  }
});

// DELETE /api/gift-packaging/:id  (admin)
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM gift_packaging WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[gift-packaging DELETE]', err.message);
    res.status(500).json({ error: 'Failed to delete gift packaging', detail: err.message });
  }
});

module.exports = router;
