const router = require('express').Router();
const pool = require('../db/pool');
const { auth } = require('../middleware/auth');

// GET /api/cart  (requires auth)
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ci.id, ci.product_id, ci.quantity,
              p.name, p.price, p.compare_price, p.images, p.stock_quantity, p.slug
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.user_id = $1
       ORDER BY ci.created_at`,
      [req.user.id],
    );
    // Shape to match CartItem type used by frontend
    const items = rows.map(r => ({
      id: r.id,
      product_id: r.product_id,
      quantity: r.quantity,
      product: {
        id: r.product_id,
        name: r.name,
        price: parseFloat(r.price),
        compare_price: r.compare_price ? parseFloat(r.compare_price) : null,
        images: r.images,
        stock_quantity: r.stock_quantity,
        slug: r.slug,
      },
    }));
    res.json(items);
  } catch (err) {
    console.error('[cart/get]', err);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

// POST /api/cart  { product_id, quantity }
router.post('/', auth, async (req, res) => {
  const { product_id, quantity = 1 } = req.body;
  if (!product_id) return res.status(400).json({ error: 'product_id is required' });
  try {
    await pool.query(
      `INSERT INTO cart_items (user_id, product_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, product_id)
       DO UPDATE SET quantity = cart_items.quantity + $3`,
      [req.user.id, product_id, quantity],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add to cart' });
  }
});

// PUT /api/cart/:id  { quantity }
router.put('/:id', auth, async (req, res) => {
  const { quantity } = req.body;
  if (!quantity || quantity < 1) return res.status(400).json({ error: 'Invalid quantity' });
  try {
    await pool.query(
      'UPDATE cart_items SET quantity = $1 WHERE id = $2 AND user_id = $3',
      [quantity, req.params.id, req.user.id],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update cart' });
  }
});

// DELETE /api/cart/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM cart_items WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove from cart' });
  }
});

// DELETE /api/cart  (clear all)
router.delete('/', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM cart_items WHERE user_id = $1', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

module.exports = router;
