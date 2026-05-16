// cSMS API integration for Ghana SMS notifications
// Docs: https://app.mycsms.com/api/v3/sms/send

const CSMS_API_URL = 'https://app.mycsms.com/api/v3/sms/send';
const SENDER_ID = 'KWEnterprise';

// ─── SMS message templates ────────────────────────────────────────────────────
const SMS_TEMPLATES = {
  order_placed: ({ orderNumber, amount }) =>
    `KW Enterprise: Your order ${orderNumber} has been received! Total: GHS ${parseFloat(amount).toFixed(2)}. We'll notify you when it ships. Call (+233)264793861 for help.`,

  payment_confirmed: ({ orderNumber, amount }) =>
    `KW Enterprise: Payment of GHS ${parseFloat(amount).toFixed(2)} confirmed for order ${orderNumber}. Your order is now being processed. Thank you!`,

  order_processing: ({ orderNumber }) =>
    `KW Enterprise: Your order ${orderNumber} is being prepared and will ship soon. Thank you for your patience!`,

  order_shipped: ({ orderNumber, tracking }) =>
    `KW Enterprise: Order ${orderNumber} has been shipped!${tracking ? ` Tracking: ${tracking}.` : ''} Expected delivery: 1-3 days. Call (+233)264793861 for help.`,

  order_delivered: ({ orderNumber }) =>
    `KW Enterprise: Your order ${orderNumber} has been delivered! Thank you for shopping with us. Visit again soon!`,

  order_cancelled: ({ orderNumber }) =>
    `KW Enterprise: Your order ${orderNumber} has been cancelled. Contact us at (+233)264793861 if you have questions.`,
};

// ─── Normalise Ghana phone numbers ───────────────────────────────────────────
function normalisePhone(phone) {
  if (!phone) return null;
  let p = phone.replace(/[\s\-().+]/g, '');
  if (p.startsWith('0')) p = '233' + p.slice(1);
  else if (p.startsWith('+')) p = p.slice(1);
  return p;
}

// ─── Public API ───────────────────────────────────────────────────────────────
async function sendOrderSms({ phone, event, data }) {
  if (!process.env.CSMS_API_KEY) {
    console.warn('[sms] CSMS_API_KEY not configured — skipping SMS');
    return { success: false, reason: 'not_configured' };
  }

  const normalised = normalisePhone(phone);
  if (!normalised) {
    console.warn('[sms] Invalid phone number — skipping SMS');
    return { success: false, reason: 'invalid_phone' };
  }

  const buildFn = SMS_TEMPLATES[event];
  if (!buildFn) {
    console.warn(`[sms] Unknown event: ${event}`);
    return { success: false, reason: 'unknown_event' };
  }

  const message = buildFn(data);

  try {
    const response = await fetch(CSMS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.CSMS_API_KEY}`,
      },
      body: JSON.stringify({
        phone: [normalised],
        sender_id: SENDER_ID,
        message,
        message_type: 'text',
      }),
    });

    const resData = await response.json();
    if (!response.ok) {
      throw new Error(resData.message || `HTTP ${response.status}`);
    }
    console.log(`[sms] Sent ${event} to ${normalised}`);
    return { success: true, data: resData };
  } catch (err) {
    console.error(`[sms] Failed to send ${event} to ${normalised}:`, err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendOrderSms };
