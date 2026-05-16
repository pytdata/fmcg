// Notification orchestrator — sends both SMS + email and logs results to DB
const pool = require('../db/pool');
const { sendOrderEmail } = require('./email');
const { sendOrderSms } = require('./sms');

async function logNotification(orderId, orderNumber, type, event, recipient, status, errorMsg) {
  try {
    await pool.query(
      `INSERT INTO order_notifications
         (order_id, order_number, notification_type, event, recipient, status, error_message, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [orderId, orderNumber, type, event, recipient, status,
        errorMsg || null, status === 'sent' ? new Date() : null],
    );
  } catch (e) {
    console.error('[notify] log error:', e.message);
  }
}

/**
 * Dispatch order notification via both SMS and email.
 *
 * @param {object} opts
 * @param {string} opts.orderId
 * @param {string} opts.orderNumber
 * @param {string} opts.event  - order_placed | payment_confirmed | order_processing | order_shipped | order_delivered | order_cancelled
 * @param {string} [opts.phone]
 * @param {string} [opts.email]
 * @param {object} opts.data   - template variables (amount, tracking, shipping, …)
 */
async function notifyOrder({ orderId, orderNumber, event, phone, email, data }) {
  const results = {};

  // SMS
  if (phone) {
    const smsRes = await sendOrderSms({ phone, event, data: { orderNumber, ...data } });
    results.sms = smsRes.success;
    await logNotification(orderId, orderNumber, 'sms', event, phone,
      smsRes.success ? 'sent' : 'failed', smsRes.error);
  }

  // Email
  if (email) {
    const emailRes = await sendOrderEmail({ to: email, event, data: { orderNumber, ...data } });
    results.email = emailRes.success;
    await logNotification(orderId, orderNumber, 'email', event, email,
      emailRes.success ? 'sent' : 'failed', emailRes.error);
  }

  return results;
}

module.exports = { notifyOrder };
