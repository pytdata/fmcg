const router = require('express').Router();
const pool = require('../db/pool');
const { auth, adminOnly } = require('../middleware/auth');

// GET /api/customers  (admin)
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const params = [];
    const wheres = ["role = 'customer'"];
    if (search) {
      params.push(`%${search}%`);
      wheres.push(`(full_name ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }
    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit), offset);

    const { rows } = await pool.query(
      `SELECT id, full_name, email, phone, created_at
       FROM profiles WHERE ${wheres.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// GET /api/customers/:id  (admin)
router.get('/:id', auth, adminOnly, async (req, res) => {
  try {
    const [profileRes, ordersRes] = await Promise.all([
      pool.query(
        'SELECT id, full_name, email, phone, created_at FROM profiles WHERE id = $1',
        [req.params.id],
      ),
      pool.query(
        `SELECT order_number, total_amount, status, payment_status, created_at
         FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
        [req.params.id],
      ),
    ]);
    if (!profileRes.rows.length) return res.status(404).json({ error: 'Customer not found' });
    res.json({ ...profileRes.rows[0], orders: ordersRes.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

module.exports = router;
