const router = require('express').Router();
const pool = require('../db/pool');
const { randomUUID } = require('node:crypto');
const { auth, adminOnly, optionalAuth } = require('../middleware/auth');
const { notifyOrder } = require('../services/notify');
const { money } = require('../services/delivery');
const { priceOrder, couponDiscount, UUID, invalid } = require('../services/orderPricing');
const { fingerprint, canAccess, checkoutResponse } = require('../services/orderAccess');
const rateLimit = require('../middleware/rateLimit');

async function verifyPaystack(reference) {
  if (!process.env.PAYSTACK_SECRET_KEY) throw invalid('Payment verification is unavailable', 503);
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }, signal: AbortSignal.timeout(10000),
  });
  const body = await response.json();
  if (!response.ok || !body.status) throw invalid('Payment provider is temporarily unavailable', 502);
  return body.data;
}

router.post('/', optionalAuth, rateLimit('orders', 10, 600), async (req, res) => {
  const body = req.body;
  const { shipping_name, shipping_phone, guest_email, payment_method = 'paystack', idempotency_key, coupon_code, notes } = body;
  if (!UUID.test(idempotency_key || '')) return res.status(400).json({ error: 'A valid checkout idempotency key is required' });
  if (!['delivery','pickup'].includes(body.delivery_mode) || !['paystack','cod'].includes(payment_method)) return res.status(400).json({ error: 'Invalid delivery or payment method' });
  if (typeof shipping_name !== 'string' || !shipping_name.trim() || shipping_name.length > 150 || typeof shipping_phone !== 'string' || !/^[+\d() .-]{7,30}$/.test(shipping_phone)) return res.status(400).json({ error: 'Enter a valid name and phone number' });
  const email = req.user?.email || guest_email;
  if ((payment_method === 'paystack' || email) && (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return res.status(400).json({ error: 'A valid email is required' });
  if ((coupon_code != null && (typeof coupon_code !== 'string' || coupon_code.length > 80)) || (notes != null && (typeof notes !== 'string' || notes.length > 2000))) return res.status(400).json({ error: 'Invalid coupon or notes' });
  const hash = fingerprint(body, req.user?.id);
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [idempotency_key]);
    const { rows: [existing] } = await client.query('SELECT * FROM orders WHERE idempotency_key=$1', [idempotency_key]);
    if (existing) {
      if (existing.request_hash !== hash) throw invalid('This checkout was already submitted with different details. Start a new checkout.', 409);
      await client.query('COMMIT');
      return res.json(checkoutResponse(existing));
    }
    const priced = await priceOrder(client, body);
    if (typeof body.subtotal !== 'number' || money(body.subtotal) !== priced.subtotal) throw invalid('Product prices changed. Refresh your cart before checking out.', 409);
    let deliveryQuote = null;
    let fee = 0;
    if (body.delivery_mode === 'delivery') {
      if (!UUID.test(body.delivery_quote_id || '')) throw invalid('Select a delivery location to get a quote');
      const { rows: [saved] } = await client.query('SELECT details FROM delivery_quotes WHERE id=$1 AND expires_at > now()', [body.delivery_quote_id]);
      if (!saved) throw invalid('Delivery quote expired. Please select your location again.', 409);
      deliveryQuote = saved.details;
      fee = deliveryQuote.feeGhs;
      if (!Number.isFinite(fee) || fee < 0) throw invalid('Invalid delivery quote', 409);
      if (deliveryQuote.countryCode !== 'GH') {
        const { rows: [group] } = await client.query(`SELECT g.is_active FROM delivery_groups g JOIN delivery_countries c ON c.continent_code=g.code WHERE c.code=$1 FOR SHARE OF g`, [deliveryQuote.countryCode]);
        if (!group?.is_active) throw invalid('Delivery to this destination has been disabled', 409);
      }
    }
    let discount = 0;
    let promo = null;
    if (coupon_code) {
      const { rows: promos } = await client.query('SELECT * FROM promotions WHERE LOWER(code)=LOWER($1) FOR UPDATE', [coupon_code]);
      promo = promos[0];
      const applied = couponDiscount(promo, priced.subtotal, priced.type);
      discount = applied.discount;
      if (applied.freeShipping) fee = 0;
    }
    const total = money(priced.subtotal + fee - discount);
    if (!Number.isFinite(total) || total > 99999999 || typeof body.total_amount !== 'number' || money(body.total_amount) !== total) throw invalid('Your total changed. Refresh checkout and try again.', 409);
    if (payment_method === 'paystack' && total <= 0) throw invalid('Choose Cash on Delivery for a zero-total order');
    const reference = payment_method === 'paystack' ? `KW-${randomUUID()}` : null;
    const number = `KW-${randomUUID().replace(/-/g,'').toUpperCase()}`;
    const { rows: [order] } = await client.query(`INSERT INTO orders
      (order_number,user_id,guest_email,guest_phone,payment_method,subtotal,discount_amount,delivery_fee,total_amount,coupon_code,
       shipping_name,shipping_phone,shipping_address,shipping_city,shipping_region,order_type,gift_box_id,notes,delivery_mode,
       idempotency_key,request_hash,payment_reference,delivery_quote)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23) RETURNING *`,
      [number,req.user?.id || null,email || null,shipping_phone,payment_method,priced.subtotal,discount,fee,total,promo?.code || null,
       shipping_name.trim(),shipping_phone,deliveryQuote?.address || 'In-store pickup',deliveryQuote?.city || '',deliveryQuote?.region || '',priced.type,priced.giftBoxId,notes || null,body.delivery_mode,
       idempotency_key,hash,reference,deliveryQuote]);
    for (const item of priced.items) {
      if (item.product_id) {
        const { rows } = await client.query('UPDATE products SET stock_quantity=stock_quantity-$1 WHERE id=$2 AND stock_quantity >= $1 RETURNING id', [item.quantity,item.product_id]);
        if (!rows.length) throw invalid(`Insufficient stock for "${item.name}"`, 409);
      }
      await client.query(`INSERT INTO order_items (order_id,product_id,name,quantity,unit_price,total_price,image_url) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [order.id,item.product_id,item.name,item.quantity,item.unit_price,item.total_price,item.image_url]);
    }
    if (promo) await client.query('UPDATE promotions SET used_count=used_count+1 WHERE id=$1', [promo.id]);
    await client.query('COMMIT');
    if (payment_method === 'cod') notifyOrder({ orderId:order.id,orderNumber:number,event:'order_placed',phone:shipping_phone,email,data:{amount:total,shipping:{name:shipping_name,address:deliveryQuote?.address || 'In-store pickup'}} }).catch(console.error);
    res.status(201).json(checkoutResponse(order));
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    if (!err.status) console.error('[orders/create]', err.message);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Failed to place order' });
  } finally { client?.release(); }
});

router.post('/verify-payment', optionalAuth, rateLimit('verify-payment', 30), async (req, res) => {
  const { reference, orderId } = req.body;
  if (!UUID.test(orderId || '') || typeof reference !== 'string' || !/^[A-Za-z0-9.-]{1,100}$/.test(reference)) return res.status(400).json({ error:'Invalid payment reference or order' });
  try {
    const { rows: [order] } = await pool.query('SELECT * FROM orders WHERE id=$1', [orderId]);
    if (!order || !canAccess(req,order)) return res.status(404).json({ error:'Order not found' });
    if (order.payment_method !== 'paystack' || order.payment_reference !== reference) return res.status(400).json({ error:'Payment reference does not belong to this order' });
    if (order.payment_status === 'paid') return res.json({ verified:true,order:{order_number:order.order_number} });
    if (order.status !== 'pending') return res.status(409).json({ error:'Order is no longer awaiting payment' });
    const txn = await verifyPaystack(reference);
    if (txn?.status !== 'success') return res.json({ verified:false,status:txn?.status || 'unknown' });
    let metadata = txn.metadata;
    if (typeof metadata === 'string') { try { metadata = JSON.parse(metadata); } catch { metadata = null; } }
    if (txn.reference !== reference || txn.amount !== Math.round(Number(order.total_amount)*100) || txn.currency !== 'GHS' || metadata?.order_id !== order.id) return res.status(400).json({ error:'Payment does not match this order',verified:false });
    const { rows: [updated] } = await pool.query(`UPDATE orders SET payment_status='paid',status='processing',paystack_trx_ref=$1,updated_at=now() WHERE id=$2 AND status='pending' AND payment_status='pending' RETURNING *`, [reference,orderId]);
    if (!updated) {
      const { rows: [current] } = await pool.query('SELECT payment_status,paystack_trx_ref FROM orders WHERE id=$1', [orderId]);
      return res.status(current?.payment_status === 'paid' && current.paystack_trx_ref === reference ? 200 : 409).json({ verified:current?.payment_status === 'paid' && current.paystack_trx_ref === reference });
    }
    notifyOrder({orderId:updated.id,orderNumber:updated.order_number,event:'payment_confirmed',phone:updated.shipping_phone,email:updated.guest_email,data:{amount:updated.total_amount,shipping:{name:updated.shipping_name}}}).catch(console.error);
    res.json({verified:true,order:{order_number:updated.order_number}});
  } catch (err) {
    console.error('[orders/verify]',err.message);
    res.status(err.status || (err.code === '23505' ? 409 : 502)).json({error:'Payment could not be verified. Please retry.'});
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
router.get('/track/:orderNumber', rateLimit('order-tracking', 30), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT o.order_number, o.status, o.payment_status, o.payment_method,
              o.total_amount, o.created_at
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
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) FROM orders o ${wheres.length ? 'WHERE ' + wheres.join(' AND ') : ''}`,
      params,
    );

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
    res.set('X-Total-Count', countRows[0].count);
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
