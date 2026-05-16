const router = require('express').Router();
const pool = require('../db/pool');
const { auth, adminOnly } = require('../middleware/auth');

// GET /api/gift-boxes
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM gift_boxes WHERE is_published = true AND is_active = true ORDER BY sort_order, created_at DESC`,
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch gift boxes' });
  }
});

// GET /api/gift-boxes/:slug
router.get('/:slug', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM gift_boxes WHERE slug = $1 AND is_published = true`,
      [req.params.slug],
    );
    if (!rows.length) return res.status(404).json({ error: 'Gift box not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch gift box' });
  }
});

// ── Admin ─────────────────────────────────────────────────────────────────────

// GET /api/gift-boxes/admin/all
router.get('/admin/all', auth, adminOnly, async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM gift_boxes ORDER BY sort_order, created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch gift boxes' });
  }
});

// POST /api/gift-boxes  (admin)
router.post('/', auth, adminOnly, async (req, res) => {
  const { name, slug, description, image_url, price, compare_price, items,
    packaging_style, promotional_discount, coupon_code, is_published, is_active, sort_order } = req.body;
  if (!name || !slug) return res.status(400).json({ error: 'name and slug are required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO gift_boxes
         (name, slug, description, image_url, price, compare_price, items,
          packaging_style, promotional_discount, coupon_code, is_published, is_active, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [name, slug, description || null, image_url || null, price || 0, compare_price || null,
       JSON.stringify(items || []), packaging_style || null, promotional_discount || 0,
       coupon_code || null, is_published ?? false, is_active ?? true, sort_order || 0],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Slug already exists' });
    res.status(500).json({ error: 'Failed to create gift box' });
  }
});

// PUT /api/gift-boxes/:id  (admin)
router.put('/:id', auth, adminOnly, async (req, res) => {
  const { name, slug, description, image_url, price, compare_price, items,
    packaging_style, promotional_discount, coupon_code, is_published, is_active, sort_order } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE gift_boxes SET name=$1, slug=$2, description=$3, image_url=$4, price=$5,
         compare_price=$6, items=$7, packaging_style=$8, promotional_discount=$9,
         coupon_code=$10, is_published=$11, is_active=$12, sort_order=$13, updated_at=now()
       WHERE id=$14 RETURNING *`,
      [name, slug, description || null, image_url || null, price || 0, compare_price || null,
       JSON.stringify(items || []), packaging_style || null, promotional_discount || 0,
       coupon_code || null, is_published ?? false, is_active ?? true, sort_order || 0, req.params.id],
    );
    if (!rows.length) return res.status(404).json({ error: 'Gift box not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update gift box' });
  }
});

// DELETE /api/gift-boxes/:id  (admin)
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM gift_boxes WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete gift box' });
  }
});

// POST /api/gift-boxes/custom  — save a user's custom gift box
router.post('/custom', async (req, res) => {
  const { user_id, name, packaging_style, personal_message, items, total_price } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO custom_gift_boxes (user_id, name, packaging_style, personal_message, items, total_price)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [user_id || null, name || null, packaging_style || 'standard',
       personal_message || null, JSON.stringify(items || []), total_price || 0],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save custom gift box' });
  }
});

module.exports = router;
