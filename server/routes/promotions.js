const router = require('express').Router();
const pool = require('../db/pool');
const { auth, adminOnly } = require('../middleware/auth');

// ── Public: active promotions ─────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, code, name, discount_type, discount_value, min_order_amount,
              max_uses, used_count, valid_until, applies_to
       FROM promotions
       WHERE is_active = true
         AND (valid_until IS NULL OR valid_until > now())
         AND (max_uses IS NULL OR used_count < max_uses)
       ORDER BY created_at DESC`,
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch promotions' });
  }
});

// ── Public: validate coupon ───────────────────────────────────────────────────
router.post('/validate', async (req, res) => {
  const { code, subtotal = 0 } = req.body;
  if (!code) return res.status(400).json({ error: 'code is required' });
  try {
    const { rows } = await pool.query(
      `SELECT * FROM promotions
       WHERE LOWER(code) = LOWER($1) AND is_active = true
         AND (valid_until IS NULL OR valid_until > now())`,
      [code],
    );
    const promo = rows[0];
    if (!promo) return res.json({ valid: false, message: 'Invalid or expired coupon code.' });

    if (promo.max_uses && promo.used_count >= promo.max_uses) {
      return res.json({ valid: false, message: 'This coupon has reached its usage limit.' });
    }
    if (promo.min_order_amount && parseFloat(subtotal) < parseFloat(promo.min_order_amount)) {
      return res.json({
        valid: false,
        message: `Minimum order amount is GHS ${parseFloat(promo.min_order_amount).toFixed(2)}`,
      });
    }

    const sub = parseFloat(subtotal);
    let discount = 0;
    let freeShipping = false;
    let message = '';

    if (promo.discount_type === 'percentage') {
      discount = Math.min(sub * (parseFloat(promo.discount_value) / 100), sub);
      message = `${promo.discount_value}% off applied! You saved GHS ${discount.toFixed(2)}`;
    } else if (promo.discount_type === 'fixed') {
      discount = Math.min(parseFloat(promo.discount_value), sub);
      message = `GHS ${discount.toFixed(2)} discount applied!`;
    } else if (promo.discount_type === 'free_shipping') {
      freeShipping = true;
      message = 'Free shipping applied!';
    }

    res.json({
      valid: true,
      discount,
      free_shipping: freeShipping,
      promo: { id: promo.id, code: promo.code, name: promo.name,
               discount_type: promo.discount_type, discount_value: promo.discount_value },
      message,
    });
  } catch (err) {
    res.status(500).json({ error: 'Validation failed' });
  }
});

// ── Admin: all promotions ─────────────────────────────────────────────────────
router.get('/admin/all', auth, adminOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT *,
         CASE WHEN max_uses > 0 THEN ROUND((used_count::numeric / max_uses) * 100) ELSE NULL END AS usage_pct
       FROM promotions
       ORDER BY created_at DESC`,
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch promotions' });
  }
});

// ── Admin: discount stats overview ───────────────────────────────────────────
router.get('/admin/stats', auth, adminOnly, async (req, res) => {
  try {
    const [promoStats, tagStats, orderSavings] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int AS total_coupons,
          COUNT(*) FILTER (WHERE is_active = true)::int AS active_coupons,
          SUM(used_count)::int AS total_uses,
          COUNT(*) FILTER (WHERE valid_until < now() AND valid_until IS NOT NULL)::int AS expired_coupons
        FROM promotions
      `),
      pool.query(`
        SELECT
          COUNT(*)::int AS total_tags,
          COUNT(*) FILTER (WHERE is_active = true)::int AS active_tags,
          COUNT(DISTINCT ppt.product_id)::int AS tagged_products
        FROM pricing_tags pt
        LEFT JOIN product_pricing_tags ppt ON ppt.tag_id = pt.id
      `),
      pool.query(`
        SELECT
          SUM(discount_amount)::numeric AS total_saved,
          COUNT(*)::int AS orders_with_discount
        FROM orders
        WHERE discount_amount > 0
      `),
    ]);

    res.json({
      coupons: promoStats.rows[0],
      tags: tagStats.rows[0],
      savings: orderSavings.rows[0],
    });
  } catch (err) {
    console.error('[promotions/stats]', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── Admin: create promotion ───────────────────────────────────────────────────
router.post('/', auth, adminOnly, async (req, res) => {
  const { code, name, discount_type, discount_value, min_order_amount,
    max_uses, valid_from, valid_until, is_active, applies_to } = req.body;
  if (!code || !name || !discount_type) {
    return res.status(400).json({ error: 'code, name and discount_type are required' });
  }
  const needsValue = ['percentage', 'fixed'].includes(discount_type);
  if (needsValue && (discount_value === undefined || discount_value === null)) {
    return res.status(400).json({ error: 'discount_value is required for percentage/fixed types' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO promotions
         (code, name, discount_type, discount_value, min_order_amount, max_uses,
          valid_from, valid_until, is_active, applies_to)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [code.toUpperCase().trim(), name, discount_type,
       needsValue ? (parseFloat(discount_value) || 0) : 0,
       min_order_amount ? parseFloat(min_order_amount) : null,
       max_uses ? parseInt(max_uses) : null,
       valid_from || new Date(), valid_until || null,
       is_active ?? true, applies_to || 'all'],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Coupon code already exists' });
    console.error('[promotions/create]', err);
    res.status(500).json({ error: 'Failed to create promotion' });
  }
});

// ── Admin: update promotion ───────────────────────────────────────────────────
router.put('/:id', auth, adminOnly, async (req, res) => {
  const { code, name, discount_type, discount_value, min_order_amount,
    max_uses, valid_from, valid_until, is_active, applies_to } = req.body;
  const needsValue = ['percentage', 'fixed'].includes(discount_type);
  try {
    const { rows } = await pool.query(
      `UPDATE promotions SET
         code=$1, name=$2, discount_type=$3, discount_value=$4,
         min_order_amount=$5, max_uses=$6, valid_from=$7, valid_until=$8,
         is_active=$9, applies_to=$10
       WHERE id=$11 RETURNING *`,
      [code?.toUpperCase().trim(), name, discount_type,
       needsValue ? (parseFloat(discount_value) || 0) : 0,
       min_order_amount ? parseFloat(min_order_amount) : null,
       max_uses ? parseInt(max_uses) : null,
       valid_from || new Date(), valid_until || null,
       is_active ?? true, applies_to || 'all', req.params.id],
    );
    if (!rows.length) return res.status(404).json({ error: 'Promotion not found' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Coupon code already exists' });
    res.status(500).json({ error: 'Failed to update promotion' });
  }
});

// ── Admin: delete promotion ───────────────────────────────────────────────────
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM promotions WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete promotion' });
  }
});

module.exports = router;
