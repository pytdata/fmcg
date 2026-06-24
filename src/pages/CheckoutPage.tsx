import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { validateCoupon, createOrder } from '@/services/store';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from 'sonner';
import { ArrowLeft, Banknote, CreditCard, Loader2, MapPin, Ticket, Truck, X } from 'lucide-react';
import type { DeliveryLocation } from '@/types/index';

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

  // ── State ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [freeShipping, setFreeShipping] = useState(false);
  const [couponMsg, setCouponMsg] = useState('');
  const [couponError, setCouponError] = useState(false);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  // Delivery locations fetched from backend
  const [deliveryLocations, setDeliveryLocations] = useState<DeliveryLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [locationsLoading, setLocationsLoading] = useState(true);

  const [form, setForm] = useState({
    fullName: profile?.full_name || '',
    phone: profile?.phone || '',
    email: profile?.email || '',
    address: '',
    city: '',
    region: '',
    paymentMethod: 'paystack',
  });

  // ── Load delivery locations ────────────────────────────────────────────────
  useEffect(() => {
    api.get<DeliveryLocation[]>('/api/delivery-locations')
      .then(data => {
        const locs = Array.isArray(data) ? data : [];
        setDeliveryLocations(locs);
        // auto-select first active location
        if (locs.length > 0) {
          setSelectedLocationId(locs[0].id);
          setForm(f => ({ ...f, city: locs[0].name, region: locs[0].region ?? '' }));
        }
      })
      .catch(() => setDeliveryLocations([]))
      .finally(() => setLocationsLoading(false));
  }, []);

  // ── Delivery fee: location-based, overridden by coupon free shipping ───────
  const selectedLocation = deliveryLocations.find(l => l.id === selectedLocationId);
  const baseDeliveryFee = selectedLocation ? Number(selectedLocation.delivery_fee) : 0;
  const deliveryFee = freeShipping ? 0 : baseDeliveryFee;
  const total = Math.max(0, cartTotal + deliveryFee - discount);

  const handleLocationChange = (locId: string) => {
    setSelectedLocationId(locId);
    const loc = deliveryLocations.find(l => l.id === locId);
    if (loc) {
      setForm(f => ({ ...f, city: loc.name, region: loc.region ?? '' }));
    }
  };

  // ── Coupon ─────────────────────────────────────────────────────────────────
  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    const result = await validateCoupon(couponCode.trim(), cartTotal);
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

  const clearCart = async () => {
    if (user) {
      await api.delete('/api/cart').catch(console.error);
    } else {
      localStorage.removeItem('guestCart');
    }
    await refreshCart();
  };

  const buildOrderPayload = () => ({
    items: cartItems.map(item => ({
      product_id: item.product_id,
      name: item.product?.name || '',
      quantity: item.quantity,
      unit_price: item.product?.price || 0,
      total_price: (item.product?.price || 0) * item.quantity,
      image_url: item.product?.images?.[0] || null,
    })),
    user_id: user?.id || null,
    guest_email: !user ? (form.email || null) : null,
    guest_phone: !user ? form.phone : null,
    payment_method: form.paymentMethod,
    subtotal: cartTotal,
    discount_amount: discount,
    delivery_fee: deliveryFee,
    total_amount: total,
    coupon_code: couponCode || null,
    shipping_name: form.fullName,
    shipping_phone: form.phone,
    shipping_address: form.address,
    shipping_city: form.city,
    shipping_region: form.region,
    order_type: 'regular',
  });

  const placeOrder = async () => {
    if (!form.fullName || !form.phone || !form.address) {
      toast.error('Please fill in all required shipping fields.');
      return;
    }
    if (deliveryLocations.length > 0 && !selectedLocationId) {
      toast.error('Please select a delivery location.');
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
        await clearCart();
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
        amount: Math.round(total * 100),
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
        callback: async (response) => {
          toast.info('Verifying payment…');
          try {
            const result = await api.post<{ verified: boolean; order?: { order_number: string } }>(
              '/api/orders/verify-payment',
              { reference: response.reference, orderId: order.id },
            );
            await clearCart();
            if (result.verified) {
              toast.success('Payment confirmed! 🎉');
              navigate(`/order-confirmation?order=${order.order_number}&mode=paystack&status=paid`);
            } else {
              toast.error('Payment verification failed. Please contact support.');
              navigate(`/order-confirmation?order=${order.order_number}&mode=paystack&status=failed`);
            }
          } catch (err) {
            console.error('Payment verification error:', err);
            await clearCart();
            navigate(`/order-confirmation?order=${order.order_number}&mode=paystack`);
          }
        },
      });
      handler.openIframe();
    } catch (err) {
      console.error('placeOrder error:', err);
      toast.error('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
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
      <script src="https://js.paystack.co/v1/inline.js" async />

      <Link to="/cart" className="text-sm text-gray-500 hover:text-amber-600 flex items-center gap-1 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Cart
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
              <div className="sm:col-span-2">
                <Label className="text-sm font-normal">Address *</Label>
                <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="House number, street, area" />
              </div>
            </div>
          </div>

          {/* Delivery Location */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-600" /> Delivery Location
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Select your delivery area — the fee is calculated automatically
            </p>

            {locationsLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading locations…
              </div>
            ) : deliveryLocations.length === 0 ? (
              <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-sm text-amber-800">
                No delivery locations configured yet. Contact us to arrange delivery.
              </div>
            ) : (
              <SearchableSelect
                value={selectedLocationId}
                onValueChange={handleLocationChange}
                options={deliveryLocations.map(loc => ({
                  value: loc.id,
                  label: `${loc.name} — ${Number(loc.delivery_fee) === 0 ? 'Free' : `GHS ${Number(loc.delivery_fee).toFixed(2)}`}`,
                  keywords: loc.region ? [loc.region] : undefined,
                }))}
                placeholder="Select your delivery area"
                searchPlaceholder="Search locations…"
                className="w-full"
              />
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

            {/* Cart items */}
            <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
              {cartItems.map(item => (
                <div key={item.id} className="flex items-center gap-3">
                  <img src={item.product?.images?.[0]} alt=""
                    className="w-10 h-10 rounded object-cover bg-gray-50 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{item.product?.name}</p>
                    <p className="text-xs text-gray-500">×{item.quantity}</p>
                  </div>
                  <span className="text-xs font-semibold text-gray-900 shrink-0">
                    GHS {((item.product?.price || 0) * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
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
                <span>GHS {cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span className="flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5" />
                  Delivery
                  {selectedLocation && (
                    <span className="text-xs text-gray-400">({selectedLocation.name})</span>
                  )}
                </span>
                <span>
                  {deliveryFee === 0 ? (
                    <span className="text-emerald-600 flex items-center gap-1">
                      Free
                      {freeShipping && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-1 rounded">coupon</span>
                      )}
                    </span>
                  ) : (
                    `GHS ${deliveryFee.toFixed(2)}`
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
              disabled={loading || (deliveryLocations.length > 0 && !selectedLocationId)}
            >
              {loading
                ? 'Processing…'
                : form.paymentMethod === 'paystack'
                  ? `Pay GHS ${total.toFixed(2)} via PayStack`
                  : `Place Order — GHS ${total.toFixed(2)}`}
            </Button>

            {deliveryLocations.length === 0 && !locationsLoading && (
              <p className="text-xs text-amber-600 mt-2 text-center flex items-center justify-center gap-1">
                <MapPin className="w-3 h-3" /> No delivery locations set up yet
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
