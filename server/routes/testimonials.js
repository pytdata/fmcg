const router = require('express').Router();
const pool = require('../db/pool');
const { auth, adminOnly } = require('../middleware/auth');

// GET /api/testimonials — public: active only
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM testimonials WHERE is_active = true ORDER BY sort_order, created_at DESC`,
    );
    res.json(rows);
  } catch (err) {
    console.error('[testimonials GET]', err.message);
    res.status(500).json({ error: 'Failed to fetch testimonials' });
  }
});

// GET /api/testimonials/admin/all — admin
router.get('/admin/all', auth, adminOnly, async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM testimonials ORDER BY sort_order, created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error('[testimonials admin/all]', err.message);
    res.status(500).json({ error: 'Failed to fetch testimonials' });
  }
});

// POST /api/testimonials — admin
router.post('/', auth, adminOnly, async (req, res) => {
  const { name, role, text, rating, avatar_url, sort_order, is_active } = req.body;
  if (!name || !text) return res.status(400).json({ error: 'name and text are required' });
  const r = Math.min(5, Math.max(1, parseInt(rating, 10) || 5));
  try {
    const { rows } = await pool.query(
      `INSERT INTO testimonials (name, role, text, rating, avatar_url, sort_order, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name, role || null, text, r, avatar_url || null, sort_order || 0, is_active !== false],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[testimonials POST]', err.message);
    res.status(500).json({ error: 'Failed to create testimonial' });
  }
});

// PUT /api/testimonials/:id — admin
router.put('/:id', auth, adminOnly, async (req, res) => {
  const { name, role, text, rating, avatar_url, sort_order, is_active } = req.body;
  const r = Math.min(5, Math.max(1, parseInt(rating, 10) || 5));
  try {
    const { rows } = await pool.query(
      `UPDATE testimonials SET name=$1, role=$2, text=$3, rating=$4, avatar_url=$5,
              sort_order=$6, is_active=$7
       WHERE id=$8 RETURNING *`,
      [name, role || null, text, r, avatar_url || null, sort_order || 0, is_active !== false, req.params.id],
    );
    if (!rows.length) return res.status(404).json({ error: 'Testimonial not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[testimonials PUT]', err.message);
    res.status(500).json({ error: 'Failed to update testimonial' });
  }
});

// DELETE /api/testimonials/:id — admin
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM testimonials WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[testimonials DELETE]', err.message);
    res.status(500).json({ error: 'Failed to delete testimonial' });
  }
});

module.exports = router;
