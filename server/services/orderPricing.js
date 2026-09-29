const { money } = require('./delivery');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function invalid(message, status = 400) { return Object.assign(new Error(message), { status }); }
function quantity(value) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 10000) throw invalid('Quantity must be an integer between 1 and 10000');
  return value;
}
function price(value) {
  const n = Number(value);
  if (value == null || !Number.isFinite(n) || n < 0 || n > 99999999) throw invalid('An item has an invalid configured price', 409);
  return money(n);
}
// Names, product prices and packaging prices always come from the database.
async function priceOrder(client, body) {
  const type = body.order_type || 'regular';
  if (!['regular', 'gift_box', 'custom_gift_box'].includes(type)) throw invalid('Invalid order type');
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 100) throw invalid('An order must have 1–100 items');
  if (type === 'gift_box') {
    if (!UUID.test(body.gift_box_id || '') || body.items.length !== 1 || quantity(body.items[0]?.quantity) !== 1) throw invalid('Choose one valid gift box');
    const { rows: [box] } = await client.query('SELECT * FROM gift_boxes WHERE id=$1 AND is_active=true AND is_published=true FOR SHARE', [body.gift_box_id]);
    if (!box) throw invalid('This gift box is no longer available', 409);
    const amount = price(box.price);
    return { type, subtotal: amount, giftBoxId: box.id, items: [{ product_id: null, name: box.name, quantity: 1, unit_price: amount, total_price: amount, image_url: box.image_url }] };
  }
  const requested = new Map();
  for (const item of body.items) {
    if (!item || typeof item !== 'object') throw invalid('Invalid order item');
    // Packaging is reconstructed below using its catalogue ID, never its client price.
    if (type === 'custom_gift_box' && item.product_id === null) {
      if (!body.packaging_id) throw invalid('Choose valid gift packaging');
      continue;
    }
    if (typeof item.product_id !== 'string' || !UUID.test(item.product_id)) throw invalid('Every product needs a valid catalogue ID');
    requested.set(item.product_id, quantity((requested.get(item.product_id) || 0) + quantity(item.quantity)));
  }
  if (!requested.size) throw invalid('Choose at least one product');
  const ids = [...requested.keys()].sort();
  // Stable locking order prevents concurrent carts with reversed item order deadlocking.
  const { rows } = await client.query('SELECT id,name,price,images,stock_quantity FROM products WHERE id=ANY($1::uuid[]) AND is_active=true ORDER BY id FOR UPDATE', [ids]);
  if (rows.length !== ids.length) throw invalid('A product is no longer available', 409);
  const items = rows.map(p => {
    const qty = requested.get(p.id);
    if (p.stock_quantity < qty) throw invalid(`Insufficient stock for "${p.name}"`, 409);
    const unitPrice = price(p.price);
    return { product_id: p.id, name: p.name, quantity: qty, unit_price: unitPrice, total_price: money(unitPrice * qty), image_url: p.images?.[0] || null };
  });
  let packaging = null;
  if (type === 'custom_gift_box' && body.packaging_id) {
    if (!UUID.test(body.packaging_id)) throw invalid('Invalid packaging ID');
    const { rows: [pack] } = await client.query('SELECT id,name,price FROM gift_packaging WHERE id=$1 AND is_active=true FOR SHARE', [body.packaging_id]);
    if (!pack) throw invalid('This packaging is no longer available', 409);
    packaging = pack;
    const amount = price(pack.price);
    items.push({ product_id: null, name: `Gift Packaging — ${pack.name}`, quantity: 1, unit_price: amount, total_price: amount, image_url: null });
  }
  const subtotal = money(items.reduce((sum, item) => sum + item.total_price, 0));
  if (subtotal > 99999999) throw invalid('Order value exceeds the supported limit');
  return { type, subtotal, items, giftBoxId: null, packaging };
}
function couponDiscount(promo, subtotal, type) {
  const now = Date.now();
  if (!promo || !promo.is_active || (promo.valid_from && Date.parse(promo.valid_from) > now) || (promo.valid_until && Date.parse(promo.valid_until) <= now)
    || (promo.max_uses !== null && promo.max_uses !== undefined && promo.used_count >= promo.max_uses) || subtotal < Number(promo.min_order_amount || 0)
    || (promo.applies_to === 'products' && type !== 'regular') || (promo.applies_to === 'gift_boxes' && type === 'regular')) {
    throw invalid('Coupon is not available for this order', 409);
  }
  let discount = 0;
  const value = Number(promo.discount_value);
  if (!Number.isFinite(value) || value < 0) throw invalid('Invalid coupon configuration', 409);
  if (promo.discount_type === 'fixed') discount = Math.min(subtotal, value);
  else if (promo.discount_type === 'percentage') discount = Math.min(subtotal, subtotal * value / 100);
  else if (promo.discount_type !== 'free_shipping') throw invalid('Invalid coupon configuration', 409);
  return { discount: money(discount), freeShipping: promo.discount_type === 'free_shipping' };
}
module.exports = { priceOrder, couponDiscount, UUID, invalid, quantity };
