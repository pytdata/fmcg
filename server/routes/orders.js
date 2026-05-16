const router = require('express').Router();
const pool = require('../db/pool');
const { auth, adminOnly, optionalAuth } = require('../middleware/auth');
const { notifyOrder } = require('../services/notify');

// ── Helpers ───────────────────────────────────────────────────────────────────
function orderNumber() {
  return 'KW-' + Date.now().toString(36).toUpperCase();
}

async function verifyPaystack(reference) {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const body = await res.json();
    return body.data || null;
  } catch (err) {
    console.error('[paystack verify]', err.message);
    return null;
  }
}

// ── Public / customer routes ──────────────────────────────────────────────────

// POST /api/orders  — place a new order
router.post('/', optionalAuth, async (req, res) => {
  const {
    items, shipping_name, shipping_phone, shipping_address, shipping_city,
    shipping_region, guest_email, guest_phone, payment_method,
    subtotal, discount_amount, delivery_fee, total_amount, coupon_code,
    order_type, gift_box_id, custom_gift_box_id, notes,
  } = req.body;

  if (!items?.length) return res.status(400).json({ error: 'Order must have at least one item' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const num = orderNumber();
    const { rows: [order] } = await client.query(
      `INSERT INTO orders
         (order_number, user_id, guest_email, guest_phone, status, payment_status,
          payment_method, subtotal, discount_amount, delivery_fee, total_amount,
          coupon_code, shipping_name, shipping_phone, shipping_address,
          shipping_city, shipping_region, order_type, gift_box_id, custom_gift_box_id, notes)
       VALUES ($1,$2,$3,$4,'pending','pending',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       RETURNING *`,
      [num, req.user?.id || null, guest_email || null, guest_phone || null,
       payment_method || 'paystack', subtotal, discount_amount || 0,
       delivery_fee || 0, total_amount, coupon_code || null,
       shipping_name, shipping_phone, shipping_address,
       shipping_city, shipping_region, order_type || 'regular',
       gift_box_id || null, custom_gift_box_id || null, notes || null],
    );

    // Insert order items
    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, name, quantity, unit_price, total_price, image_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [order.id, item.product_id || null, item.name, item.quantity,
         item.unit_price, item.total_price, item.image_url || null],
      );
      // Decrement stock
      if (item.product_id) {
        await client.query(
          'UPDATE products SET stock_quantity = GREATEST(0, stock_quantity - $1) WHERE id = $2',
          [item.quantity, item.product_id],
        );
      }
    }

    // Increment coupon usage
    if (coupon_code) {
      await client.query(
        'UPDATE promotions SET used_count = used_count + 1 WHERE code = $1',
        [coupon_code],
      );
    }

    await client.query('COMMIT');

    // Send COD notifications async (non-blocking)
    if (payment_method === 'cod') {
      const email = req.user?.email || guest_email;
      const phone = shipping_phone || guest_phone;
      notifyOrder({
        orderId: order.id, orderNumber: num, event: 'order_placed',
        phone, email,
        data: { amount: total_amount, shipping: { name: shipping_name, address: shipping_address, city: shipping_city } },
      }).catch(console.error);
    }

    res.status(201).json(order);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[orders/create]', err);
    res.status(500).json({ error: 'Failed to place order' });
  } finally {
    client.release();
  }
});

// POST /api/orders/verify-payment  — verify PayStack transaction
router.post('/verify-payment', optionalAuth, async (req, res) => {
  const { reference, orderId } = req.body;
  if (!reference) return res.status(400).json({ error: 'reference is required' });

  try {
    // Optimistic lock — only update if still pending
    const { rows: [order] } = await pool.query(
      `SELECT * FROM orders WHERE id = $1 AND status = 'pending'`,
      [orderId],
    );
    if (!order) {
      // May already be verified
      const { rows: [existing] } = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
      if (existing?.payment_status === 'paid') return res.json({ verified: true, order: existing });
      return res.status(404).json({ error: 'Order not found or already processed' });
    }

    const txn = await verifyPaystack(reference);
    if (!txn || txn.status !== 'success') {
      return res.json({ verified: false, status: txn?.status || 'unknown' });
    }

    const { rows: [updated] } = await pool.query(
      `UPDATE orders SET payment_status='paid', status='processing',
         paystack_trx_ref=$1, updated_at=now()
       WHERE id=$2 AND status='pending' RETURNING *`,
      [reference, orderId],
    );

    if (!updated) return res.json({ verified: true, alreadyProcessed: true });

    // Notify async
    const phone = updated.shipping_phone || updated.guest_phone;
    const email = updated.guest_email;
    notifyOrder({
      orderId: updated.id, orderNumber: updated.order_number, event: 'payment_confirmed',
      phone, email,
      data: { amount: updated.total_amount, shipping: { name: updated.shipping_name } },
    }).catch(console.error);

    res.json({ verified: true, order: updated });
  } catch (err) {
    console.error('[orders/verify]', err);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

// GET /api/orders/mine  — logged-in user's orders
router.get('/mine', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT o.*, json_agg(oi.*) AS items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [req.user.id],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/orders/track/:orderNumber  — public order tracking
router.get('/track/:orderNumber', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT o.order_number, o.status, o.payment_status, o.shipping_name,
              o.shipping_city, o.shipping_region, o.tracking_number, o.created_at,
              json_agg(oi.name ORDER BY oi.created_at) AS item_names
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.order_number = $1
       GROUP BY o.id`,
      [req.params.orderNumber],
    );
    if (!rows.length) return res.status(404).json({ error: 'Order not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to track order' });
  }
});

// ── Admin routes ──────────────────────────────────────────────────────────────

// GET /api/orders  (admin)
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const params = [];
    const wheres = [];
    if (status && status !== 'all') {
      params.push(status);
      wheres.push(`o.status = $${params.length}`);
    }
    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit), offset);

    const { rows } = await pool.query(
      `SELECT o.*, json_agg(oi.* ORDER BY oi.created_at) AS items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       ${wheres.length ? 'WHERE ' + wheres.join(' AND ') : ''}
       GROUP BY o.id
       ORDER BY o.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/orders/:id  (admin)
router.get('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT o.*, json_agg(oi.* ORDER BY oi.created_at) AS items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.id = $1 GROUP BY o.id`,
      [req.params.id],
    );
    if (!rows.length) return res.status(404).json({ error: 'Order not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// PATCH /api/orders/:id/status  (admin)
router.patch('/:id/status', auth, adminOnly, async (req, res) => {
  const { status, tracking_number, payment_status } = req.body;
  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  const validPayments = ['pending', 'paid', 'failed', 'refunded'];

  const updates = [];
  const params = [];

  if (status) {
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    params.push(status);
    updates.push(`status = $${params.length}`);
  }
  if (payment_status) {
    if (!validPayments.includes(payment_status)) return res.status(400).json({ error: 'Invalid payment_status' });
    params.push(payment_status);
    updates.push(`payment_status = $${params.length}`);
  }
  if (tracking_number) {
    params.push(tracking_number);
    updates.push(`tracking_number = $${params.length}`);
  }

  if (!updates.length) return res.status(400).json({ error: 'No fields to update' });

  params.push(req.params.id);
  updates.push('updated_at = now()');

  try {
    const { rows: [order] } = await pool.query(
      `UPDATE orders SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params,
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Only fire notifications on status changes (not payment_status-only updates)
    if (status) {
      const eventMap = {
        processing: 'order_processing', shipped: 'order_shipped',
        delivered: 'order_delivered', cancelled: 'order_cancelled',
      };
      const event = eventMap[status];
      if (event) {
        const phone = order.shipping_phone || order.guest_phone;
        const email = order.guest_email;
        notifyOrder({
          orderId: order.id, orderNumber: order.order_number, event,
          phone, email,
          data: {
            amount: order.total_amount,
            tracking: order.tracking_number,
            shipping: { name: order.shipping_name, address: order.shipping_address, city: order.shipping_city },
          },
        }).catch(console.error);
      }
    }

    res.json(order);
  } catch (err) {
    console.error('[orders/status]', err);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// GET /api/orders/admin/stats  (admin dashboard)
router.get('/admin/stats', auth, adminOnly, async (req, res) => {
  try {
    const [totals, byStatus, topProducts, recentOrders, monthlyRevenue, categoryRevenue] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total_orders,
                         COALESCE(SUM(total_amount), 0) AS total_revenue,
                         COUNT(DISTINCT COALESCE(user_id::text, guest_email)) AS total_customers
                  FROM orders WHERE payment_status = 'paid'`),
      pool.query(`SELECT status, COUNT(*) AS count FROM orders GROUP BY status ORDER BY count DESC`),
      pool.query(`SELECT oi.name, SUM(oi.quantity) AS qty_sold, SUM(oi.quantity * oi.unit_price) AS revenue
                  FROM order_items oi
                  JOIN orders o ON o.id = oi.order_id
                  WHERE o.payment_status = 'paid'
                  GROUP BY oi.name ORDER BY qty_sold DESC LIMIT 8`),
      pool.query(`SELECT order_number, shipping_name, total_amount, status, created_at
                  FROM orders ORDER BY created_at DESC LIMIT 8`),
      pool.query(`SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS month,
                         DATE_TRUNC('month', created_at) AS month_date,
                         COALESCE(SUM(total_amount), 0) AS revenue,
                         COUNT(*) AS orders
                  FROM orders
                  WHERE payment_status = 'paid'
                    AND created_at >= NOW() - INTERVAL '12 months'
                  GROUP BY DATE_TRUNC('month', created_at)
                  ORDER BY month_date ASC`),
      pool.query(`SELECT c.name AS category,
                         COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS revenue,
                         COUNT(DISTINCT o.id) AS orders
                  FROM order_items oi
                  JOIN orders o ON o.id = oi.order_id
                  JOIN products p ON p.id = oi.product_id
                  JOIN categories c ON c.id = p.category_id
                  WHERE o.payment_status = 'paid'
                  GROUP BY c.name ORDER BY revenue DESC LIMIT 6`),
    ]);

    res.json({
      totals: totals.rows[0],
      byStatus: byStatus.rows,
      topProducts: topProducts.rows,
      recentOrders: recentOrders.rows,
      monthlyRevenue: monthlyRevenue.rows,
      categoryRevenue: categoryRevenue.rows,
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
