import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17.7.0';
import { handleCors, ok, fail } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== 'POST') return fail('Method not allowed', 405);

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return fail('STRIPE_SECRET_KEY is not configured', 500);

    const { sessionId } = await req.json();
    if (!sessionId) return fail('sessionId is required');

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' });
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return ok({ verified: false, status: session.payment_status });
    }

    // Find the order by session id
    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('id, status, order_number, shipping_phone, guest_email, user_id, total_amount')
      .eq('stripe_session_id', sessionId)
      .maybeSingle();

    if (fetchErr || !order) return fail('Order not found for this session');

    // Idempotent: if already paid, just return success
    if (order.status === 'paid') {
      return ok({ verified: true, orderId: order.id, orderNumber: order.order_number, alreadyProcessed: true });
    }

    if (order.status !== 'pending') {
      return fail(`Cannot complete order with status: ${order.status}`);
    }

    // Update order to paid using optimistic lock on status=pending
    const { error: updateErr } = await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        status: 'processing',
        stripe_payment_intent_id: session.payment_intent as string,
        stripe_customer_email: session.customer_details?.email || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .eq('status', 'pending');

    if (updateErr) {
      console.error('verify-stripe-payment update error:', updateErr);
      return fail('Failed to update order status');
    }

    // Trigger notification asynchronously (non-blocking)
    const notifPayload = {
      orderId: order.id,
      orderNumber: order.order_number,
      event: 'payment_confirmed',
      phone: order.shipping_phone,
      email: session.customer_details?.email || order.guest_email,
      amount: order.total_amount,
    };

    supabase.functions.invoke('send-order-notification', { body: notifPayload }).catch(console.error);

    return ok({
      verified: true,
      orderId: order.id,
      orderNumber: order.order_number,
      amount: session.amount_total,
      currency: session.currency,
      customerEmail: session.customer_details?.email,
    });
  } catch (err) {
    console.error('verify-stripe-payment error:', err);
    return fail(err instanceof Error ? err.message : 'Payment verification failed', 500);
  }
});
