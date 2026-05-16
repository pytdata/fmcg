const router = require('express').Router();
const pool = require('../db/pool');
const { auth, adminOnly } = require('../middleware/auth');

// GET /api/banners
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM banners WHERE is_active = true ORDER BY sort_order, created_at`,
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch banners' });
  }
});

// GET /api/banners/admin/all  (admin)
router.get('/admin/all', auth, adminOnly, async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM banners ORDER BY sort_order, created_at');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch banners' });
  }
});

// POST /api/banners  (admin)
router.post('/', auth, adminOnly, async (req, res) => {
  const { title, subtitle, image_url, link, button_text, sort_order, is_active } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO banners (title, subtitle, image_url, link, button_text, sort_order, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [title, subtitle || null, image_url || null, link || null,
       button_text || null, sort_order || 0, is_active ?? true],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create banner' });
  }
});

// PUT /api/banners/:id  (admin)
router.put('/:id', auth, adminOnly, async (req, res) => {
  const { title, subtitle, image_url, link, button_text, sort_order, is_active } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE banners SET title=$1, subtitle=$2, image_url=$3, link=$4,
         button_text=$5, sort_order=$6, is_active=$7
       WHERE id=$8 RETURNING *`,
      [title, subtitle || null, image_url || null, link || null,
       button_text || null, sort_order || 0, is_active ?? true, req.params.id],
    );
    if (!rows.length) return res.status(404).json({ error: 'Banner not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update banner' });
  }
});

// DELETE /api/banners/:id  (admin)
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM banners WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete banner' });
  }
});

module.exports = router;
