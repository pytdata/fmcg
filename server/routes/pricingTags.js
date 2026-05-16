const router = require('express').Router();
const pool = require('../db/pool');
const { auth, adminOnly } = require('../middleware/auth');

// ── Public: list active tags ─────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT pt.*,
         COUNT(DISTINCT ppt.product_id)::int AS product_count
       FROM pricing_tags pt
       LEFT JOIN product_pricing_tags ppt ON ppt.tag_id = pt.id
       WHERE pt.is_active = true
         AND (pt.valid_until IS NULL OR pt.valid_until > now())
       GROUP BY pt.id
       ORDER BY pt.created_at DESC`,
    );
    res.json(rows);
  } catch (err) {
    console.error('[pricingTags/list]', err);
    res.status(500).json({ error: 'Failed to fetch pricing tags' });
  }
});

// ── Public: products for a tag slug ─────────────────────────────────────────
router.get('/:slug/products', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*
       FROM products p
       JOIN product_pricing_tags ppt ON ppt.product_id = p.id
       JOIN pricing_tags pt ON pt.id = ppt.tag_id
       WHERE pt.slug = $1 AND p.is_active = true
       ORDER BY p.created_at DESC`,
      [req.params.slug],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tag products' });
  }
});

// ── Admin: all tags ──────────────────────────────────────────────────────────
router.get('/admin/all', auth, adminOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT pt.*,
         COUNT(DISTINCT ppt.product_id)::int AS product_count
       FROM pricing_tags pt
       LEFT JOIN product_pricing_tags ppt ON ppt.tag_id = pt.id
       GROUP BY pt.id
       ORDER BY pt.created_at DESC`,
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// ── Admin: create tag ────────────────────────────────────────────────────────
router.post('/', auth, adminOnly, async (req, res) => {
  const { name, slug, tag_type, color, bg_color, icon,
    discount_type, discount_value, valid_from, valid_until,
    is_active, description } = req.body;
  if (!name || !slug) return res.status(400).json({ error: 'name and slug are required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO pricing_tags
         (name, slug, tag_type, color, bg_color, icon, discount_type, discount_value,
          valid_from, valid_until, is_active, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [name, slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
       tag_type || 'custom', color || '#ffffff', bg_color || '#ef4444',
       icon || 'Tag', discount_type || 'none', discount_value || 0,
       valid_from || new Date(), valid_until || null,
       is_active ?? true, description || null],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Slug already exists' });
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

// ── Admin: update tag ────────────────────────────────────────────────────────
router.put('/:id', auth, adminOnly, async (req, res) => {
  const { name, slug, tag_type, color, bg_color, icon,
    discount_type, discount_value, valid_from, valid_until,
    is_active, description } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE pricing_tags SET
         name=$1, slug=$2, tag_type=$3, color=$4, bg_color=$5, icon=$6,
         discount_type=$7, discount_value=$8, valid_from=$9, valid_until=$10,
         is_active=$11, description=$12, updated_at=now()
       WHERE id=$13 RETURNING *`,
      [name, slug?.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
       tag_type || 'custom', color || '#ffffff', bg_color || '#ef4444',
       icon || 'Tag', discount_type || 'none', discount_value || 0,
       valid_from || new Date(), valid_until || null,
       is_active ?? true, description || null, req.params.id],
    );
    if (!rows.length) return res.status(404).json({ error: 'Tag not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update tag' });
  }
});

// ── Admin: delete tag ────────────────────────────────────────────────────────
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM pricing_tags WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

// ── Admin: get products assigned to a tag ────────────────────────────────────
router.get('/:id/products', auth, adminOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.name, p.slug, p.price, p.images, p.is_active
       FROM products p
       JOIN product_pricing_tags ppt ON ppt.product_id = p.id
       WHERE ppt.tag_id = $1
       ORDER BY p.name`,
      [req.params.id],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tag products' });
  }
});

// ── Admin: assign products to tag (replaces existing) ───────────────────────
router.put('/:id/products', auth, adminOnly, async (req, res) => {
  const { product_ids = [] } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM product_pricing_tags WHERE tag_id = $1', [req.params.id]);
    for (const pid of product_ids) {
      await client.query(
        'INSERT INTO product_pricing_tags (product_id, tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [pid, req.params.id],
      );
    }
    await client.query('COMMIT');
    res.json({ success: true, count: product_ids.length });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to assign products' });
  } finally {
    client.release();
  }
});

// ── Admin: add single product to tag ────────────────────────────────────────
router.post('/:id/products/:productId', auth, adminOnly, async (req, res) => {
  try {
    await pool.query(
      'INSERT INTO product_pricing_tags (product_id, tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [req.params.productId, req.params.id],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add product to tag' });
  }
});

// ── Admin: remove single product from tag ───────────────────────────────────
router.delete('/:id/products/:productId', auth, adminOnly, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM product_pricing_tags WHERE tag_id=$1 AND product_id=$2',
      [req.params.id, req.params.productId],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove product from tag' });
  }
});

module.exports = router;
