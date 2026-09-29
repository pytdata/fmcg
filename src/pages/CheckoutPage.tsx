import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { validateCoupon, createOrder, getSiteSettings } from '@/services/store';
import { api, apiRequest } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DeliveryPlaceSearch, type DeliveryQuote } from '@/components/DeliveryPlaceSearch';
import { toast } from 'sonner';
import { ArrowLeft, Banknote, CreditCard, Gift, Loader2, MapPin, Store, Ticket, Truck, X } from 'lucide-react';
import type { GiftBox } from '@/types/index';
import PaystackTrustBanner from '@/components/common/PaystackTrustBanner';
import { IMAGE_PLACEHOLDER, resolveImageUrl } from '@/lib/media';

type OrderWithAccessToken = { id: string; order_number: string; total_amount: number; order_access_token: string };

// Draft shape written to localStorage by CustomGiftBoxPage.tsx.
interface CustomGiftBoxDraft {
  id?: string;
  packaging_id: string | null;
  packaging_style: string;
  packaging_price: number;
  personal_message: string;
  items: { product_id: string; name: string; price: number; qty: number; image_url?: string }[];
  total_price: number;
}

declare global {
  interface Window {
    PaystackPop: {
      setup: (opts: {
        key: string;
        email: string;
        amount: number;
        currency: string;
        ref: string;
        metadata?: Record<string, unknown>;
        onClose: () => void;
        callback: (response: { reference: string; status: string }) => void;
      }) => { openIframe: () => void };
    };
  }
}

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '';

export default function CheckoutPage() {
  const { user, profile } = useAuth();
  const { cartItems, cartTotal, refreshCart } = useCart();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const giftBoxParam = searchParams.get('giftbox'); // 'curated' | 'custom' | null

  // One key per checkout attempt (this component instance) — sent with every
  // placeOrder() call so a double-click or a retry-after-timeout resubmission
  // returns the order already created instead of placing a duplicate.
  const idempotencyKeyRef = useRef(crypto.randomUUID());

  // ── Gift box checkout intent (stashed in localStorage by GiftBoxDetailPage /
  // CustomGiftBoxPage — this checkout may have zero cart items in this mode) ──
  const [curatedBox, setCuratedBox] = useState<GiftBox | null>(null);
  const [customBox, setCustomBox] = useState<CustomGiftBoxDraft | null>(null);

  useEffect(() => {
    if (giftBoxParam === 'curated') {
      try {
        const raw = localStorage.getItem('giftBoxOrder');
        setCuratedBox(raw ? JSON.parse(raw).giftBox ?? null : null);
      } catch { setCuratedBox(null); }
    } else if (giftBoxParam === 'custom') {
      try {
        const raw = localStorage.getItem('customGiftBox');
        setCustomBox(raw ? JSON.parse(raw) : null);
      } catch { setCustomBox(null); }
    }
  }, [giftBoxParam]);

  const isGiftBoxCheckout = giftBoxParam === 'curated' || giftBoxParam === 'custom';
  const checkoutSubtotal = giftBoxParam === 'curated'
    ? (curatedBox?.price ?? 0)
    : giftBoxParam === 'custom'
      ? (customBox?.total_price ?? 0)
      : cartTotal;

  // ── State ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [freeShipping, setFreeShipping] = useState(false);
  const [couponMsg, setCouponMsg] = useState('');
  const [couponError, setCouponError] = useState(false);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const [deliveryQuote, setDeliveryQuote] = useState<DeliveryQuote | null>(null);
  const [quoteExpired, setQuoteExpired] = useState(false);
  useEffect(() => {
    setQuoteExpired(false);
    if (!deliveryQuote) return;
    const timer = setTimeout(() => setQuoteExpired(true), Math.max(0, Date.parse(deliveryQuote.expiresAt) - Date.now()));
    return () => clearTimeout(timer);
  }, [deliveryQuote]);

  // ── Fulfillment: delivery vs in-store pickup ────────────────────────────────
  const [deliveryMode, setDeliveryMode] = useState<'delivery' | 'pickup'>('delivery');
  const [pickupAddress, setPickupAddress] = useState('');

  useEffect(() => {
    getSiteSettings().then(s => { if (s?.address) setPickupAddress(s.address); });
  }, []);

  const [form, setForm] = useState({
    fullName: profile?.full_name || '',
    phone: profile?.phone || '',
    email: profile?.email || '',
    address: '',
    city: '',
    region: '',
    paymentMethod: 'paystack',
  });

  const deliveryReady = !!deliveryQuote && !quoteExpired;
  const baseDeliveryFee = deliveryMode === 'pickup' ? 0 : (deliveryQuote?.feeGhs ?? 0);
  const deliveryFee = deliveryMode === 'pickup' || freeShipping ? 0 : baseDeliveryFee;
  const total = Math.round(Math.max(0, checkoutSubtotal + deliveryFee - discount) * 100) / 100;
  const handleQuoteChange = (quote: DeliveryQuote | null) => {
    setDeliveryQuote(quote);
    setForm(f => ({ ...f, address: quote?.address || '', city: quote?.city || '', region: quote?.region || '' }));
  };

  // ── Coupon ─────────────────────────────────────────────────────────────────
  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    const result = await validateCoupon(couponCode.trim(), checkoutSubtotal);
    setApplyingCoupon(false);
    if (result.valid) {
      setDiscount(result.discount ?? 0);
      setFreeShipping(result.free_shipping ?? false);
      setCouponMsg(result.message);
      setCouponError(false);
      setCouponApplied(true);
      toast.success(result.message);
    } else {
      setDiscount(0);
      setFreeShipping(false);
      setCouponMsg(result.message);
      setCouponError(true);
      setCouponApplied(false);
      toast.error(result.message);
    }
  };

  const removeCoupon = () => {
    setCouponCode('');
    setDiscount(0);
    setFreeShipping(false);
    setCouponMsg('');
    setCouponError(false);
    setCouponApplied(false);
  };

  // Clears whatever was actually being purchased — the cart for a regular
  // checkout, or the stashed order intent for a gift-box checkout.
  const clearPurchasedState = async () => {
    if (giftBoxParam === 'curated') {
      localStorage.removeItem('giftBoxOrder');
    } else if (giftBoxParam === 'custom') {
      localStorage.removeItem('customGiftBox');
    } else if (user) {
      await api.delete('/api/cart').catch(console.error);
    } else {
      localStorage.removeItem('guestCart');
    }
    await refreshCart();
  };

  const buildOrderPayload = () => {
    let items: { product_id: string | null; name: string; quantity: number; unit_price: number; total_price: number; image_url: string | null }[];
    let orderType: 'regular' | 'gift_box' | 'custom_gift_box' = 'regular';
    let giftBoxId: string | null = null;
    let customGiftBoxId: string | null = null;

    if (giftBoxParam === 'curated' && curatedBox) {
      items = [{
        product_id: null,
        name: curatedBox.name,
        quantity: 1,
        unit_price: curatedBox.price,
        total_price: curatedBox.price,
        image_url: curatedBox.image_url || null,
      }];
      orderType = 'gift_box';
      giftBoxId = curatedBox.id;
    } else if (giftBoxParam === 'custom' && customBox) {
      items = customBox.items.map(i => ({
        product_id: i.product_id || null,
        name: i.name,
        quantity: i.qty,
        unit_price: i.price,
        total_price: i.price * i.qty,
        image_url: i.image_url || null,
      }));
      if (customBox.packaging_price > 0) {
        items.push({
          product_id: null,
          name: `Gift Packaging — ${customBox.packaging_style}`,
          quantity: 1,
          unit_price: customBox.packaging_price,
          total_price: customBox.packaging_price,
          image_url: null,
        });
      }
      orderType = 'custom_gift_box';
      customGiftBoxId = customBox.id || null;
    } else {
      items = cartItems.map(item => ({
        product_id: item.product_id,
        name: item.product?.name || '',
        quantity: item.quantity,
        unit_price: item.product?.price || 0,
        total_price: (item.product?.price || 0) * item.quantity,
        image_url: item.product?.images?.[0] || null,
      }));
    }

    return {
      items,
      user_id: user?.id || null,
      guest_email: !user ? (form.email || null) : null,
      guest_phone: !user ? form.phone : null,
      payment_method: form.paymentMethod,
      subtotal: checkoutSubtotal,
      discount_amount: discount,
      delivery_fee: deliveryFee,
      delivery_quote_id: deliveryMode === 'delivery' ? deliveryQuote?.id : undefined,
      total_amount: total,
      coupon_code: couponApplied ? couponCode : null,
      shipping_name: form.fullName,
      shipping_phone: form.phone,
      shipping_address: deliveryMode === 'pickup' ? (pickupAddress || 'Pickup — no delivery address') : form.address,
      shipping_city: deliveryMode === 'pickup' ? '' : form.city,
      shipping_region: deliveryMode === 'pickup' ? '' : form.region,
      order_type: orderType,
      delivery_mode: deliveryMode,
      gift_box_id: giftBoxId,
      custom_gift_box_id: customGiftBoxId,
      packaging_id: giftBoxParam === 'custom' ? (customBox?.packaging_id || undefined) : undefined,
      notes: giftBoxParam === 'custom' ? (customBox?.personal_message || null) : null,
      idempotency_key: idempotencyKeyRef.current,
    };
  };

  const placeOrder = async () => {
    if (!form.fullName || !form.phone || (deliveryMode === 'delivery' && !form.address)) {
      toast.error('Please fill in all required shipping fields.');
      return;
    }
    if (deliveryMode === 'delivery' && !deliveryReady) {
      toast.error('Please select a delivery location with a current quote.');
      return;
    }
    const contactEmail = user?.email || form.email;
    if (form.paymentMethod === 'paystack' && !contactEmail) {
      toast.error('Please enter your email address to pay online.');
      return;
    }
    setLoading(true);
    try {
      const order = await createOrder(buildOrderPayload() as Parameters<typeof createOrder>[0]);
      if (!order) throw new Error('Failed to create order');

      if (form.paymentMethod === 'cod') {
        await clearPurchasedState();
        toast.success('Order placed successfully!');
        navigate(`/order-confirmation?order=${order.order_number}&mode=cod`);
        return;
      }

      if (!PAYSTACK_PUBLIC_KEY) {
        toast.error('PayStack public key is not configured.');
        setLoading(false);
        return;
      }
      if (!window.PaystackPop) {
        toast.error('PayStack failed to load. Please refresh and try again.');
        setLoading(false);
        return;
      }

      const ref = `KW-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      const handler = window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: contactEmail!,
        amount: Math.round(Number(order.total_amount) * 100),
        currency: 'GHS',
        ref,
        metadata: {
          order_id: order.id,
          order_number: order.order_number,
          customer_name: form.fullName,
          phone: form.phone,
        },
        onClose: () => {
          toast.warning('Payment window closed. Your order is saved — you can complete payment later.');
          setLoading(false);
          navigate(`/order-confirmation?order=${order.order_number}&mode=paystack`);
        },
        // Paystack Inline validates this with an internal isFunction() check that
        // rejects async functions (their [object AsyncFunction] tag isn't
        // [object Function]) — .setup() throws synchronously if this is async,
        // silently breaking every card payment. Keep it a plain function and run
        // the actual verification in an inner async IIFE instead.
        callback: (response) => {
          void (async () => {
            toast.info('Verifying payment…');
            try {
              const result = await apiRequest<{ verified: boolean; order?: { order_number: string } }>(
                '/api/orders/verify-payment',
                { method: 'POST', body: { reference: response.reference, orderId: order.id }, headers: { 'X-Order-Token': (order as OrderWithAccessToken).order_access_token } },
              );
              await clearPurchasedState();
              if (result.verified) {
                toast.success('Payment confirmed! 🎉');
                navigate(`/order-confirmation?order=${order.order_number}&mode=paystack&status=paid`);
              } else {
                toast.error('Payment verification failed. Please contact support.');
                navigate(`/order-confirmation?order=${order.order_number}&mode=paystack&status=failed`);
              }
            } catch (err) {
              console.error('Payment verification error:', err);
              await clearPurchasedState();
              navigate(`/order-confirmation?order=${order.order_number}&mode=paystack`);
            }
          })();
        },
      });
      handler.openIframe();
    } catch (err) {
      console.error('placeOrder error:', err);
      toast.error(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  if (giftBoxParam === 'curated' && !curatedBox) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">No gift box selected</h2>
        <Link to="/gift-boxes">
          <Button className="bg-emerald-600 hover:bg-emerald-700 mt-4">Browse Gift Boxes</Button>
        </Link>
      </div>
    );
  }

  if (giftBoxParam === 'custom' && !customBox) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">No custom gift box selected</h2>
        <Link to="/gift-boxes/custom">
          <Button className="bg-emerald-600 hover:bg-emerald-700 mt-4">Build a Gift Box</Button>
        </Link>
      </div>
    );
  }

  if (!isGiftBoxCheckout && cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
        <Link to="/shop">
          <Button className="bg-amber-600 hover:bg-amber-700 mt-4">Continue Shopping</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        to={giftBoxParam === 'curated' ? '/gift-boxes' : giftBoxParam === 'custom' ? '/gift-boxes/custom' : '/cart'}
        className="text-sm text-gray-500 hover:text-amber-600 flex items-center gap-1 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> {isGiftBoxCheckout ? 'Back to Gift Boxes' : 'Back to Cart'}
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* ── Left: Shipping + Delivery + Payment ── */}
        <div className="flex-1 space-y-6">

          {/* Shipping Info */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">Shipping Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label className="text-sm font-normal">Full Name *</Label>
                <Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder="John Doe" />
              </div>
              <div>
                <Label className="text-sm font-normal">Phone *</Label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="0244 123 456" />
              </div>
              {!user && (
                <div>
                  <Label className="text-sm font-normal">Email (required for online payment)</Label>
                  <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="john@example.com" />
                </div>
              )}
              {deliveryMode === 'delivery' && (
                <div className="sm:col-span-2">
                  <Label className="text-sm font-normal">Address *</Label>
                  <Input value={form.address} readOnly placeholder="Select your address in the Fulfillment card below" />
                </div>
              )}
            </div>
          </div>

          {/* Fulfillment: delivery vs pickup */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Truck className="w-4 h-4" /> Fulfillment Method
            </h3>
            <div className="space-y-2 mb-4">
              {[
                { key: 'delivery' as const, icon: Truck, title: 'Delivery', sub: 'Delivered to your address' },
                { key: 'pickup' as const, icon: Store, title: 'Pickup', sub: 'Collect your order in person — no delivery fee' },
              ].map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  disabled={loading}
                  onClick={() => { if (deliveryMode !== opt.key) { setDeliveryMode(opt.key); handleQuoteChange(null); } }}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-colors
                    ${deliveryMode === opt.key ? 'border-amber-600 bg-amber-50' : 'border-gray-200 hover:bg-gray-50'}`}
                >
                  <div className="w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0">
                    <div className={`w-2.5 h-2.5 rounded-full ${deliveryMode === opt.key ? 'bg-amber-600' : 'bg-transparent'}`} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <opt.icon className="w-4 h-4" /> {opt.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{opt.sub}</p>
                  </div>
                </button>
              ))}
            </div>

            {deliveryMode === 'pickup' ? (
              <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-sm text-emerald-800 flex items-start gap-2">
                <Store className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Pickup location</p>
                  <p className="text-xs text-emerald-700 mt-0.5">{pickupAddress || 'We will contact you with pickup details.'}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <DeliveryPlaceSearch onChange={handleQuoteChange} disabled={loading} />
                {quoteExpired && <p role="alert" className="text-sm text-amber-700">Your delivery quote expired. Search and select the address again to refresh it.</p>}
                {deliveryQuote && !quoteExpired && <div className="rounded-lg border bg-gray-50 p-3 text-sm" aria-live="polite">
                  <p className="font-medium">{deliveryQuote.address}</p>
                  {deliveryQuote.method === 'osrm'
                    ? <p className="mt-1">Delivery: GHS {deliveryQuote.feeGhs.toFixed(2)} · {deliveryQuote.distanceKm?.toFixed(2)} km by road</p>
                    : <>
                      <p className="mt-1">Delivery: USD {deliveryQuote.feeUsd?.toFixed(2)} = GHS {deliveryQuote.feeGhs.toFixed(2)}</p>
                      <p className="text-xs text-gray-500 mt-1">1 USD = GHS {deliveryQuote.exchangeRate?.toFixed(4)} · Rate dated {deliveryQuote.rateAsOf ? new Date(deliveryQuote.rateAsOf).toLocaleDateString() : ''}</p>
                      {deliveryQuote.rateSource === 'ExchangeRate-API' && <a className="text-xs underline text-gray-500" href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">Rates by ExchangeRate-API</a>}
                    </>}
                  <p className="text-xs text-gray-500 mt-1">Quote valid for 15 minutes. Payment is collected in Ghana cedis.</p>
                </div>}
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Payment Method
            </h3>
            <div className="space-y-2">
              {[
                {
                  key: 'paystack', icon: CreditCard,
                  title: 'Pay Online — PayStack',
                  sub: 'Card, Bank Transfer, MTN MoMo, Vodafone Cash',
                },
                {
                  key: 'cod', icon: Banknote,
                  title: 'Cash on Delivery',
                  sub: 'Pay when your order arrives',
                },
              ].map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setForm({ ...form, paymentMethod: opt.key })}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-colors
                    ${form.paymentMethod === opt.key ? 'border-amber-600 bg-amber-50' : 'border-gray-200 hover:bg-gray-50'}`}
                >
                  <div className="w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0">
                    <div className={`w-2.5 h-2.5 rounded-full ${form.paymentMethod === opt.key ? 'bg-amber-600' : 'bg-transparent'}`} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <opt.icon className="w-4 h-4" /> {opt.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{opt.sub}</p>
                  </div>
                </button>
              ))}
            </div>
            {form.paymentMethod === 'paystack' && (
              <p className="text-xs text-gray-400 mt-3 flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-green-500 inline-block shrink-0" />
                A secure PayStack payment popup will open to complete your payment.
              </p>
            )}
          </div>
        </div>

        {/* ── Right: Order Summary ── */}
        <div className="w-full lg:w-96 shrink-0">
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm sticky top-24">
            <h3 className="font-bold text-gray-900 mb-4">Order Summary</h3>

            {/* Items — cart, curated gift box, or custom gift box depending on checkout mode */}
            <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
              {giftBoxParam === 'curated' && curatedBox ? (
                <div className="flex items-center gap-3">
                  <img src={resolveImageUrl(curatedBox.image_url) || IMAGE_PLACEHOLDER} alt=""
                    className="w-10 h-10 rounded object-cover bg-gray-50 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate flex items-center gap-1">
                      <Gift className="w-3 h-3 text-emerald-600 shrink-0" /> {curatedBox.name}
                    </p>
                    <p className="text-xs text-gray-500">Gift Box ×1</p>
                  </div>
                  <span className="text-xs font-semibold text-gray-900 shrink-0">
                    GHS {curatedBox.price.toFixed(2)}
                  </span>
                </div>
              ) : giftBoxParam === 'custom' && customBox ? (
                <>
                  {customBox.items.map(item => (
                    <div key={item.product_id} className="flex items-center gap-3">
                      <img src={resolveImageUrl(item.image_url) || IMAGE_PLACEHOLDER} alt=""
                        className="w-10 h-10 rounded object-cover bg-gray-50 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">{item.name}</p>
                        <p className="text-xs text-gray-500">×{item.qty}</p>
                      </div>
                      <span className="text-xs font-semibold text-gray-900 shrink-0">
                        GHS {(item.price * item.qty).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {customBox.packaging_price > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-emerald-50 shrink-0 flex items-center justify-center">
                        <Gift className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">Packaging — {customBox.packaging_style}</p>
                      </div>
                      <span className="text-xs font-semibold text-gray-900 shrink-0">
                        GHS {customBox.packaging_price.toFixed(2)}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                cartItems.map(item => (
                  <div key={item.id} className="flex items-center gap-3">
                    <img src={resolveImageUrl(item.product?.images?.[0]) || IMAGE_PLACEHOLDER} alt=""
                      className="w-10 h-10 rounded object-cover bg-gray-50 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{item.product?.name}</p>
                      <p className="text-xs text-gray-500">×{item.quantity}</p>
                    </div>
                    <span className="text-xs font-semibold text-gray-900 shrink-0">
                      GHS {((item.product?.price || 0) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Coupon */}
            {couponApplied ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Ticket className="w-4 h-4 text-green-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-green-800 truncate">{couponCode}</p>
                    <p className="text-xs text-green-600">{couponMsg}</p>
                  </div>
                </div>
                <button onClick={removeCoupon} className="text-green-600 hover:text-green-800 shrink-0 ml-2">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-2 mb-1">
                  <Input
                    placeholder="Coupon code"
                    value={couponCode}
                    onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponMsg(''); setCouponError(false); }}
                    onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                    className="text-sm font-mono tracking-wider"
                  />
                  <Button variant="outline" size="sm" onClick={applyCoupon}
                    disabled={applyingCoupon || !couponCode.trim()} className="shrink-0">
                    {applyingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                  </Button>
                </div>
                {couponMsg && (
                  <p className={`text-xs mb-2 ${couponError ? 'text-red-600' : 'text-green-600'}`}>{couponMsg}</p>
                )}
              </>
            )}

            {/* Totals */}
            <div className="space-y-2 text-sm mb-4 border-t pt-3">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>GHS {checkoutSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span className="flex items-center gap-1">
                  {deliveryMode === 'pickup' ? <Store className="w-3.5 h-3.5" /> : <Truck className="w-3.5 h-3.5" />}
                  {deliveryMode === 'pickup' ? 'Pickup' : 'Delivery'}
                  {deliveryMode === 'delivery' && deliveryReady && (
                    <span className="text-xs text-gray-400">({deliveryQuote?.countryCode})</span>
                  )}
                </span>
                <span>
                  {deliveryMode === 'pickup' ? (
                    <span className="text-emerald-600">Free</span>
                  ) : !deliveryReady ? (
                    <span className="text-gray-500">Select address</span>
                  ) : deliveryFee === 0 ? (
                    <span className="text-emerald-600 flex items-center gap-1">
                      Free
                      {freeShipping && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-1 rounded">coupon</span>
                      )}
                    </span>
                  ) : (
                    deliveryQuote?.method === 'flat' ? `USD ${deliveryQuote.feeUsd?.toFixed(2)} / GHS ${deliveryFee.toFixed(2)}` : `GHS ${deliveryFee.toFixed(2)}`
                  )}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Discount ({couponCode})</span>
                  <span>-GHS {discount.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="border-t pt-3 mb-5">
              <div className="flex justify-between font-bold text-gray-900 text-lg">
                <span>Total</span>
                <span>GHS {total.toFixed(2)}</span>
              </div>
            </div>

            <Button
              className="w-full bg-amber-600 hover:bg-amber-700 h-11"
              onClick={placeOrder}
              disabled={loading || (deliveryMode === 'delivery' && !deliveryReady)}
            >
              {loading
                ? 'Processing…'
                : form.paymentMethod === 'paystack'
                  ? `Pay GHS ${total.toFixed(2)} via PayStack`
                  : `Place Order — GHS ${total.toFixed(2)}`}
            </Button>


          </div>
          <div className="mt-3 flex justify-center">
            <PaystackTrustBanner compact />
          </div>
        </div>
      </div>
    </div>
  );
}
