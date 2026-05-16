const router = require('express').Router();
const pool = require('../db/pool');
const { auth } = require('../middleware/auth');

// GET /api/wishlist  (auth)
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT w.id, w.product_id, p.name, p.price, p.images, p.slug, p.stock_quantity
       FROM wishlists w JOIN products p ON p.id = w.product_id
       WHERE w.user_id = $1 ORDER BY w.created_at DESC`,
      [req.user.id],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
});

// POST /api/wishlist  { product_id }
router.post('/', auth, async (req, res) => {
  const { product_id } = req.body;
  if (!product_id) return res.status(400).json({ error: 'product_id is required' });
  try {
    await pool.query(
      `INSERT INTO wishlists (user_id, product_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [req.user.id, product_id],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add to wishlist' });
  }
});

// DELETE /api/wishlist/:productId
router.delete('/:productId', auth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM wishlists WHERE user_id = $1 AND product_id = $2',
      [req.user.id, req.params.productId],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
});

module.exports = router;
