const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

// ─── HTML email template ──────────────────────────────────────────────────────
function buildEmailHtml({ title, preheader, bodyHtml }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { margin:0; padding:0; background:#f5f5f0; font-family: 'Segoe UI', Arial, sans-serif; }
    .wrapper { max-width:600px; margin:32px auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,.08); }
    .header { background: linear-gradient(135deg, #b45309 0%, #92400e 100%); padding:28px 32px; text-align:center; }
    .header h1 { margin:0; color:#ffffff; font-size:22px; font-weight:700; letter-spacing:.5px; }
    .header p  { margin:6px 0 0; color:#fde68a; font-size:13px; }
    .body { padding:32px; }
    .body p { color:#374151; font-size:15px; line-height:1.6; margin:0 0 16px; }
    .info-box { background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:16px 20px; margin:20px 0; }
    .info-box .row { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #fef3c7; font-size:14px; }
    .info-box .row:last-child { border-bottom:none; }
    .info-box .label { color:#92400e; font-weight:600; }
    .info-box .value { color:#1f2937; }
    .status-badge { display:inline-block; padding:4px 12px; border-radius:20px; font-size:13px; font-weight:600; }
    .status-paid { background:#dcfce7; color:#166534; }
    .status-processing { background:#dbeafe; color:#1e40af; }
    .status-shipped { background:#ede9fe; color:#6d28d9; }
    .status-delivered { background:#dcfce7; color:#166534; }
    .status-cancelled { background:#fee2e2; color:#991b1b; }
    .cta { text-align:center; margin:24px 0; }
    .cta a { background:#b45309; color:#ffffff; text-decoration:none; padding:12px 28px; border-radius:8px; font-size:15px; font-weight:600; display:inline-block; }
    .divider { border:none; border-top:1px solid #f3f4f6; margin:24px 0; }
    .footer { background:#f9fafb; padding:20px 32px; text-align:center; }
    .footer p { color:#9ca3af; font-size:12px; margin:4px 0; }
    .footer strong { color:#374151; }
  </style>
</head>
<body>
  <div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>
  <div class="wrapper">
    <div class="header">
      <h1>🛒 KW Enterprise</h1>
      <p>Ghana's Trusted FMCG Distributor</p>
    </div>
    <div class="body">
      ${bodyHtml}
    </div>
    <div class="footer">
      <p><strong>KW Enterprise</strong></p>
      <p>Accra, Ghana &nbsp;|&nbsp; (+233) 26 479 3861</p>
      <p style="margin-top:10px;color:#d1d5db;">© ${new Date().getFullYear()} KW Enterprise. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Event templates ──────────────────────────────────────────────────────────
const TEMPLATES = {
  order_placed: ({ orderNumber, amount, shipping, items = [] }) => ({
    subject: `Order Confirmed – ${orderNumber} | KW Enterprise`,
    preheader: `Your order ${orderNumber} has been received! Total: GHS ${amount}`,
    bodyHtml: `
      <p>Hello <strong>${shipping?.name || 'Valued Customer'}</strong>,</p>
      <p>Thank you for shopping with <strong>KW Enterprise</strong>! 🎉 Your order has been received and is being reviewed.</p>
      <div class="info-box">
        <div class="row"><span class="label">Order Number</span><span class="value"><strong>${orderNumber}</strong></span></div>
        <div class="row"><span class="label">Total Amount</span><span class="value"><strong>GHS ${parseFloat(amount).toFixed(2)}</strong></span></div>
        <div class="row"><span class="label">Delivery Address</span><span class="value">${shipping?.address || ''}, ${shipping?.city || ''}</span></div>
        <div class="row"><span class="label">Payment Method</span><span class="value">Cash on Delivery</span></div>
      </div>
      ${items.length ? `<p style="font-weight:600;color:#1f2937;margin-bottom:8px;">Items Ordered:</p>
      <div class="info-box">
        ${items.map(i => `<div class="row"><span class="label">${i.name} ×${i.quantity}</span><span class="value">GHS ${(i.unit_price * i.quantity).toFixed(2)}</span></div>`).join('')}
      </div>` : ''}
      <p>Our team will contact you to confirm delivery. You can track your order using the order number above.</p>
      <hr class="divider" />
      <p style="font-size:13px;color:#6b7280;">Questions? Contact us at (+233) 26 479 3861 or reply to this email.</p>
    `,
  }),

  payment_confirmed: ({ orderNumber, amount, shipping }) => ({
    subject: `Payment Confirmed – ${orderNumber} | KW Enterprise`,
    preheader: `Payment of GHS ${amount} confirmed for order ${orderNumber}`,
    bodyHtml: `
      <p>Hello <strong>${shipping?.name || 'Valued Customer'}</strong>,</p>
      <p>Great news! Your payment has been confirmed and your order is now being processed. ✅</p>
      <div class="info-box">
        <div class="row"><span class="label">Order Number</span><span class="value"><strong>${orderNumber}</strong></span></div>
        <div class="row"><span class="label">Amount Paid</span><span class="value"><strong style="color:#166534;">GHS ${parseFloat(amount).toFixed(2)}</strong></span></div>
        <div class="row"><span class="label">Status</span><span class="value"><span class="status-badge status-processing">Processing</span></span></div>
      </div>
      <p>We are now preparing your order for dispatch. You will receive another notification when it is shipped.</p>
    `,
  }),

  order_processing: ({ orderNumber, shipping }) => ({
    subject: `Order Being Prepared – ${orderNumber} | KW Enterprise`,
    preheader: `Your order ${orderNumber} is being prepared`,
    bodyHtml: `
      <p>Hello <strong>${shipping?.name || 'Valued Customer'}</strong>,</p>
      <p>Your order <strong>${orderNumber}</strong> is currently being prepared by our team. 📦</p>
      <div class="info-box">
        <div class="row"><span class="label">Order Number</span><span class="value">${orderNumber}</span></div>
        <div class="row"><span class="label">Status</span><span class="value"><span class="status-badge status-processing">Processing</span></span></div>
      </div>
      <p>We will notify you once your order has been dispatched.</p>
    `,
  }),

  order_shipped: ({ orderNumber, tracking, shipping }) => ({
    subject: `Order Shipped – ${orderNumber} | KW Enterprise`,
    preheader: `Your order ${orderNumber} is on its way!`,
    bodyHtml: `
      <p>Hello <strong>${shipping?.name || 'Valued Customer'}</strong>,</p>
      <p>Exciting news! Your order is on its way to you. 🚚</p>
      <div class="info-box">
        <div class="row"><span class="label">Order Number</span><span class="value">${orderNumber}</span></div>
        ${tracking ? `<div class="row"><span class="label">Tracking Number</span><span class="value"><strong>${tracking}</strong></span></div>` : ''}
        <div class="row"><span class="label">Delivery To</span><span class="value">${shipping?.address || ''}, ${shipping?.city || ''}</span></div>
        <div class="row"><span class="label">Estimated Delivery</span><span class="value">1–3 Business Days</span></div>
      </div>
      <p>Please ensure someone is available to receive your order at the delivery address.</p>
    `,
  }),

  order_delivered: ({ orderNumber, shipping }) => ({
    subject: `Order Delivered – ${orderNumber} | KW Enterprise`,
    preheader: `Your order ${orderNumber} has been delivered!`,
    bodyHtml: `
      <p>Hello <strong>${shipping?.name || 'Valued Customer'}</strong>,</p>
      <p>Your order <strong>${orderNumber}</strong> has been successfully delivered. 🎉</p>
      <div class="info-box">
        <div class="row"><span class="label">Order Number</span><span class="value">${orderNumber}</span></div>
        <div class="row"><span class="label">Status</span><span class="value"><span class="status-badge status-delivered">Delivered</span></span></div>
      </div>
      <p>Thank you for choosing <strong>KW Enterprise</strong>! We hope you enjoy your purchase. We would love to serve you again.</p>
      <p>Visit our store again for fresh deals and new products!</p>
    `,
  }),

  order_cancelled: ({ orderNumber, shipping }) => ({
    subject: `Order Cancelled – ${orderNumber} | KW Enterprise`,
    preheader: `Your order ${orderNumber} has been cancelled`,
    bodyHtml: `
      <p>Hello <strong>${shipping?.name || 'Valued Customer'}</strong>,</p>
      <p>We regret to inform you that your order <strong>${orderNumber}</strong> has been cancelled.</p>
      <div class="info-box">
        <div class="row"><span class="label">Order Number</span><span class="value">${orderNumber}</span></div>
        <div class="row"><span class="label">Status</span><span class="value"><span class="status-badge status-cancelled">Cancelled</span></span></div>
      </div>
      <p>If you believe this is an error or have any questions, please contact us immediately at <strong>(+233) 26 479 3861</strong>.</p>
      <p>We apologise for any inconvenience caused.</p>
    `,
  }),
};

// ─── Public API ───────────────────────────────────────────────────────────────
async function sendOrderEmail({ to, event, data }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[email] SMTP credentials not configured — skipping email');
    return { success: false, reason: 'not_configured' };
  }
  if (!to) {
    console.warn('[email] No recipient provided — skipping email');
    return { success: false, reason: 'no_recipient' };
  }

  const buildFn = TEMPLATES[event];
  if (!buildFn) {
    console.warn(`[email] Unknown event: ${event}`);
    return { success: false, reason: 'unknown_event' };
  }

  const { subject, preheader, bodyHtml } = buildFn(data);
  const html = buildEmailHtml({ title: subject, preheader, bodyHtml });

  try {
    await getTransporter().sendMail({
      from: `"KW Enterprise" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[email] Sent ${event} to ${to}`);
    return { success: true };
  } catch (err) {
    console.error(`[email] Failed to send ${event} to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
}

// ─── Reusable send helper (for campaigns / test emails) ─────────────────────────
async function sendRawEmail({ to, subject, html }) {
  return getTransporter().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
  });
}

module.exports = { sendOrderEmail, buildEmailHtml, sendRawEmail };
