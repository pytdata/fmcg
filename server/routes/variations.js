/**
 * Product Variations routes — /api/products/:productId/variations
 *
 * Each product can have multiple variation TYPES (Size, Color, Pack)
 * Each type has multiple OPTIONS (Small/Red/6-Pack) with price modifiers and stock.
 */

const router = require('express').Router({ mergeParams: true });
const pool = require('../db/pool');
const { auth, adminOnly } = require('../middleware/auth');

// GET /api/products/:productId/variations
router.get('/', async (req, res) => {
  try {
    const { rows: types } = await pool.query(
      `SELECT * FROM product_variation_types WHERE product_id=$1 ORDER BY sort_order`,
      [req.params.productId],
    );
    const typeIds = types.map(t => t.id);
    if (!typeIds.length) return res.json([]);

    const { rows: options } = await pool.query(
      `SELECT * FROM product_variation_options
       WHERE type_id = ANY($1::uuid[])
       ORDER BY sort_order`,
      [typeIds],
    );

    const result = types.map(t => ({
      ...t,
      options: options.filter(o => o.type_id === t.id),
    }));
    res.json(result);
  } catch (err) {
    console.error('[variations/list]', err);
    res.status(500).json({ error: 'Failed to fetch variations' });
  }
});

// POST /api/products/:productId/variations — create variation type
router.post('/', auth, adminOnly, async (req, res) => {
  const { name, sort_order, options = [] } = req.body;
  if (!name) return res.status(400).json({ error: 'Variation type name required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO product_variation_types (product_id, name, sort_order)
       VALUES ($1, $2, COALESCE($3::int, (
         SELECT COALESCE(MAX(sort_order) + 1, 0)
         FROM product_variation_types WHERE product_id = $1
       ))) RETURNING *`,
      [req.params.productId, name, sort_order ?? null],
    );
    const typeId = rows[0].id;

    // Insert options if provided
    for (const opt of options) {
      await pool.query(
        `INSERT INTO product_variation_options
         (type_id, value, price_modifier, stock_quantity, sku, image_url, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [typeId, opt.value, opt.price_modifier || 0, opt.stock_quantity || 0,
         opt.sku || null, opt.image_url || null, opt.sort_order || 0],
      );
    }

    res.status(201).json({ ...rows[0], options });
  } catch (err) {
    console.error('[variations/create]', err);
    res.status(500).json({ error: 'Failed to create variation' });
  }
});

// PUT /api/products/:productId/variations/:typeId
router.put('/:typeId', auth, adminOnly, async (req, res) => {
  const { name, sort_order } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE product_variation_types
       SET name=COALESCE($1,name), sort_order=COALESCE($2,sort_order)
       WHERE id=$3 AND product_id=$4 RETURNING *`,
      [name, sort_order, req.params.typeId, req.params.productId],
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update variation type' });
  }
});

// DELETE /api/products/:productId/variations/:typeId
router.delete('/:typeId', auth, adminOnly, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM product_variation_types WHERE id=$1 AND product_id=$2`,
      [req.params.typeId, req.params.productId],
    );
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete variation type' });
  }
});

// ── Options ───────────────────────────────────────────────────────────────────

// POST /api/products/:productId/variations/:typeId/options
router.post('/:typeId/options', auth, adminOnly, async (req, res) => {
  const { value, price_modifier = 0, stock_quantity = 0, sku, image_url, sort_order } = req.body;
  if (!value) return res.status(400).json({ error: 'Option value required' });
  try {
    // Guard: the option's type must belong to the product in the URL.
    const { rows } = await pool.query(
      `INSERT INTO product_variation_options
         (type_id, value, price_modifier, stock_quantity, sku, image_url, sort_order)
       SELECT $1, $2, $3, $4, $5, $6,
         COALESCE($7::int, (SELECT COALESCE(MAX(sort_order) + 1, 0)
                       FROM product_variation_options WHERE type_id = $1))
       FROM product_variation_types
       WHERE id = $1 AND product_id = $8
       RETURNING *`,
      [req.params.typeId, value, price_modifier, stock_quantity,
       sku || null, image_url || null, sort_order ?? null, req.params.productId],
    );
    if (!rows.length) return res.status(404).json({ error: 'Variation type not found' });
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[variations/option-create]', err);
    res.status(500).json({ error: 'Failed to create option' });
  }
});

// PUT /api/products/:productId/variations/:typeId/options/:optionId
router.put('/:typeId/options/:optionId', auth, adminOnly, async (req, res) => {
  const { value, price_modifier, stock_quantity, sku, image_url, sort_order } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE product_variation_options
       SET value=COALESCE($1,value),
           price_modifier=COALESCE($2,price_modifier),
           stock_quantity=COALESCE($3,stock_quantity),
           sku=COALESCE($4,sku),
           image_url=COALESCE($5,image_url),
           sort_order=COALESCE($6,sort_order)
       WHERE id=$7 AND type_id=$8 RETURNING *`,
      [value, price_modifier, stock_quantity, sku, image_url, sort_order,
       req.params.optionId, req.params.typeId],
    );
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Failed to update option' });
  }
});

// DELETE /api/products/:productId/variations/:typeId/options/:optionId
router.delete('/:typeId/options/:optionId', auth, adminOnly, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM product_variation_options WHERE id=$1 AND type_id=$2`,
      [req.params.optionId, req.params.typeId],
    );
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete option' });
  }
});

module.exports = router;
