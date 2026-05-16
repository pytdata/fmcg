import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, ok, fail } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Event → human-readable message templates
const TEMPLATES: Record<string, { subject: string; sms: string; email: string }> = {
  order_placed: {
    subject: 'Order Received – KW Enterprise',
    sms: 'Hi! Your KW Enterprise order {{order_number}} has been received. Total: GHS {{amount}}. We will notify you when it ships.',
    email: `<p>Dear Customer,</p><p>Thank you for shopping with <strong>KW Enterprise</strong>!</p><p>Your order <strong>{{order_number}}</strong> has been received and is being prepared.</p><p><strong>Total: GHS {{amount}}</strong></p><p>We'll send you another message when your order is shipped.</p><br/><p>— KW Enterprise Team</p>`,
  },
  payment_confirmed: {
    subject: 'Payment Confirmed – KW Enterprise',
    sms: 'Payment confirmed for KW Enterprise order {{order_number}} (GHS {{amount}}). Your order is now being processed.',
    email: `<p>Dear Customer,</p><p>Your payment for order <strong>{{order_number}}</strong> has been confirmed.</p><p><strong>Amount paid: GHS {{amount}}</strong></p><p>Your order is now being processed and will be shipped soon.</p><br/><p>— KW Enterprise Team</p>`,
  },
  order_processing: {
    subject: 'Order Processing – KW Enterprise',
    sms: 'Good news! KW Enterprise order {{order_number}} is being processed and will ship soon.',
    email: `<p>Dear Customer,</p><p>Your order <strong>{{order_number}}</strong> is being processed by our team.</p><p>We'll notify you once it has been dispatched.</p><br/><p>— KW Enterprise Team</p>`,
  },
  order_shipped: {
    subject: 'Order Shipped – KW Enterprise',
    sms: 'Your KW Enterprise order {{order_number}} has been shipped! Tracking: {{tracking}}. Expected delivery: 1-3 days.',
    email: `<p>Dear Customer,</p><p>Great news! Your order <strong>{{order_number}}</strong> is on its way!</p><p>Tracking number: <strong>{{tracking}}</strong></p><p>Estimated delivery: 1–3 business days.</p><br/><p>— KW Enterprise Team</p>`,
  },
  order_delivered: {
    subject: 'Order Delivered – KW Enterprise',
    sms: 'Your KW Enterprise order {{order_number}} has been delivered. Thank you for shopping with us!',
    email: `<p>Dear Customer,</p><p>Your order <strong>{{order_number}}</strong> has been successfully delivered.</p><p>Thank you for choosing KW Enterprise! We hope to serve you again.</p><br/><p>— KW Enterprise Team</p>`,
  },
  order_cancelled: {
    subject: 'Order Cancelled – KW Enterprise',
    sms: 'Your KW Enterprise order {{order_number}} has been cancelled. Contact us at +233 XX XXX XXXX for assistance.',
    email: `<p>Dear Customer,</p><p>Your order <strong>{{order_number}}</strong> has been cancelled.</p><p>If you believe this is an error, please contact us immediately.</p><br/><p>— KW Enterprise Team</p>`,
  },
};

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || '');
}

async function sendEmail(to: string, subject: string, html: string, orderNumber: string): Promise<boolean> {
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) {
    console.warn('RESEND_API_KEY not set – skipping email');
    return false;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'KW Enterprise <orders@kwenterprise.com>',
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Email send failed for order ${orderNumber}:`, body);
    return false;
  }
  return true;
}

async function sendSms(phone: string, message: string, orderNumber: string): Promise<boolean> {
  const atUsername = Deno.env.get('AT_USERNAME');
  const atApiKey = Deno.env.get('AT_API_KEY');
  if (!atUsername || !atApiKey) {
    console.warn('Africa\'s Talking credentials not set – skipping SMS');
    return false;
  }

  // Normalise Ghana number to international format
  let normalised = phone.replace(/\s+/g, '');
  if (normalised.startsWith('0')) normalised = '+233' + normalised.slice(1);
  else if (!normalised.startsWith('+')) normalised = '+233' + normalised;

  const params = new URLSearchParams({
    username: atUsername,
    to: normalised,
    message,
    from: 'KWEnterprise',
  });

  const res = await fetch('https://api.africastalking.com/version1/messaging', {
    method: 'POST',
    headers: {
      apiKey: atApiKey,
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`SMS send failed for order ${orderNumber}:`, body);
    return false;
  }
  return true;
}

async function logNotification(
  orderId: string,
  orderNumber: string,
  type: 'email' | 'sms',
  event: string,
  recipient: string,
  status: 'sent' | 'failed',
  errorMessage?: string,
) {
  await supabase.from('order_notifications').insert({
    order_id: orderId,
    order_number: orderNumber,
    notification_type: type,
    event,
    recipient,
    status,
    error_message: errorMessage || null,
    sent_at: status === 'sent' ? new Date().toISOString() : null,
  });
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== 'POST') return fail('Method not allowed', 405);

  try {
    const { orderId, orderNumber, event, phone, email, amount, tracking } = await req.json();
    if (!orderId || !orderNumber || !event) return fail('orderId, orderNumber, and event are required');

    const tpl = TEMPLATES[event];
    if (!tpl) return fail(`Unknown event: ${event}`);

    const vars: Record<string, string> = {
      order_number: orderNumber,
      amount: amount ? Number(amount).toFixed(2) : '',
      tracking: tracking || 'N/A',
    };

    const results: Record<string, boolean> = {};

    // Send SMS
    if (phone) {
      const smsText = fillTemplate(tpl.sms, vars);
      const sent = await sendSms(phone, smsText, orderNumber);
      results.sms = sent;
      await logNotification(orderId, orderNumber, 'sms', event, phone, sent ? 'sent' : 'failed',
        sent ? undefined : 'Send failed – check AT credentials');
    }

    // Send Email
    if (email) {
      const emailHtml = fillTemplate(tpl.email, vars);
      const sent = await sendEmail(email, tpl.subject, emailHtml, orderNumber);
      results.email = sent;
      await logNotification(orderId, orderNumber, 'email', event, email, sent ? 'sent' : 'failed',
        sent ? undefined : 'Send failed – check Resend API key');
    }

    return ok({ event, results });
  } catch (err) {
    console.error('send-order-notification error:', err);
    return fail(err instanceof Error ? err.message : 'Notification failed', 500);
  }
});
