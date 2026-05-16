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
    if (!stripeKey) return fail('STRIPE_SECRET_KEY is not configured. Please add it in your project secrets.', 500);

    const body = await req.json();
    const { orderId, items, shippingFee, discount, couponCode, shippingDetails } = body;
    if (!orderId || !items?.length) return fail('orderId and items are required');

    // Verify order exists and is still pending
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, total_amount, status, stripe_session_id')
      .eq('id', orderId)
      .eq('status', 'pending')
      .maybeSingle();

    if (orderErr || !order) return fail('Order not found or already processed');
    if (order.stripe_session_id) return fail('Stripe session already created for this order');

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' });
    const origin = req.headers.get('origin') || 'https://mbuiwsjvvdrwhedgnzgy.supabase.co';

    // Build line items from cart
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item: any) => ({
      price_data: {
        currency: 'ghs',
        product_data: {
          name: item.name,
          images: item.image_url ? [item.image_url] : [],
        },
        unit_amount: Math.round(item.unit_price * 100),
      },
      quantity: item.quantity,
    }));

    // Add delivery fee as a line item if applicable
    if (shippingFee > 0) {
      lineItems.push({
        price_data: {
          currency: 'ghs',
          product_data: { name: 'Delivery Fee' },
          unit_amount: Math.round(shippingFee * 100),
        },
        quantity: 1,
      });
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      line_items: lineItems,
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
      cancel_url: `${origin}/checkout`,
      payment_method_types: ['card'],
      metadata: {
        order_id: orderId,
        coupon_code: couponCode || '',
      },
      billing_address_collection: 'auto',
    };

    // Pre-fill customer email if available
    if (shippingDetails?.email) {
      sessionParams.customer_email = shippingDetails.email;
    }

    if (discount > 0) {
      // Apply discount as a coupon
      const stripeCoupon = await stripe.coupons.create({
        amount_off: Math.round(discount * 100),
        currency: 'ghs',
        duration: 'once',
        name: couponCode ? `Coupon: ${couponCode}` : 'Discount',
      });
      sessionParams.discounts = [{ coupon: stripeCoupon.id }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Persist session id so verify can look it up
    await supabase
      .from('orders')
      .update({ stripe_session_id: session.id })
      .eq('id', orderId);

    return ok({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('create-stripe-checkout error:', err);
    return fail(err instanceof Error ? err.message : 'Payment session creation failed', 500);
  }
});
