const router = require('express').Router();
const pool = require('../db/pool');
const { auth, adminOnly } = require('../middleware/auth');

// GET /api/categories — PUBLIC: only ACTIVE categories, and only sub-categories
// whose parent is also active (an inactive parent hides its whole branch).
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*,
             CAST(COUNT(DISTINCT p.id) AS INTEGER) AS product_count
      FROM categories c
      LEFT JOIN categories parent ON parent.id = c.parent_id
      LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true
      WHERE c.is_active = true
        AND (c.parent_id IS NULL OR parent.is_active = true)
      GROUP BY c.id
      ORDER BY c.sort_order, c.name
    `);
    res.json(rows);
  } catch (err) {
    console.error('[categories GET]', err.message);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET /api/categories/admin/all — ADMIN: every category (active + inactive)
router.get('/admin/all', auth, adminOnly, async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*,
             CAST(COUNT(DISTINCT p.id) AS INTEGER) AS product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true
      GROUP BY c.id
      ORDER BY c.sort_order, c.name
    `);
    res.json(rows);
  } catch (err) {
    console.error('[categories GET admin/all]', err.message);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST /api/categories  (admin)
router.post('/', auth, adminOnly, async (req, res) => {
  const { name, slug, description, image_url, sort_order, parent_id, is_active } = req.body;
  if (!name || !slug) return res.status(400).json({ error: 'name and slug are required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO categories (name, slug, description, image_url, sort_order, parent_id, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name, slug, description || null, image_url || null, sort_order || 0, parent_id || null, is_active !== false],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[categories POST]', err.message);
    if (err.code === '23505') return res.status(409).json({ error: 'Slug already exists' });
    res.status(500).json({ error: 'Failed to create category', detail: err.message });
  }
});

// PUT /api/categories/:id  (admin)
router.put('/:id', auth, adminOnly, async (req, res) => {
  const { name, slug, description, image_url, sort_order, parent_id, is_active } = req.body;
  // prevent self-reference
  const resolvedParent = parent_id === req.params.id ? null : (parent_id || null);
  try {
    const { rows } = await pool.query(
      `UPDATE categories SET name=$1, slug=$2, description=$3, image_url=$4,
              sort_order=$5, parent_id=$6, is_active=$7
       WHERE id=$8 RETURNING *`,
      [name, slug, description || null, image_url || null, sort_order || 0, resolvedParent, is_active !== false, req.params.id],
    );
    if (!rows.length) return res.status(404).json({ error: 'Category not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[categories PUT]', err.message);
    if (err.code === '23505') return res.status(409).json({ error: 'Slug already exists' });
    res.status(500).json({ error: 'Failed to update category', detail: err.message });
  }
});

// PATCH /api/categories/:id/active  (admin) — quick toggle of active status
router.patch('/:id/active', auth, adminOnly, async (req, res) => {
  const { is_active } = req.body;
  if (typeof is_active !== 'boolean')
    return res.status(400).json({ error: 'is_active (boolean) is required' });
  try {
    const { rows } = await pool.query(
      `UPDATE categories SET is_active=$1 WHERE id=$2 RETURNING *`,
      [is_active, req.params.id],
    );
    if (!rows.length) return res.status(404).json({ error: 'Category not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[categories PATCH active]', err.message);
    res.status(500).json({ error: 'Failed to update category status' });
  }
});

// DELETE /api/categories/:id  (admin)
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    // promote children to top-level before deleting parent
    await pool.query('UPDATE categories SET parent_id=NULL WHERE parent_id=$1', [req.params.id]);
    await pool.query('DELETE FROM categories WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[categories DELETE]', err.message);
    res.status(500).json({ error: 'Failed to delete category', detail: err.message });
  }
});

module.exports = router;
