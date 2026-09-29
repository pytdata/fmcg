const jwt = require('jsonwebtoken');
const { createHash } = require('node:crypto');
function fingerprint(body, userId) {
  const fields = ['items','shipping_name','shipping_phone','shipping_address','shipping_city','shipping_region','guest_email','payment_method','subtotal','total_amount','coupon_code','order_type','gift_box_id','packaging_id','notes','delivery_mode','delivery_quote_id'];
  return createHash('sha256').update(JSON.stringify([userId || null, ...fields.map(key => body[key] ?? null)])).digest('hex');
}
function accessToken(order) {
  return jwt.sign({ purpose: 'order', orderId: order.id }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '7d' });
}
function canAccess(req, order) {
  if (req.user && (req.user.id === order.user_id || req.user.role === 'admin')) return true;
  try {
    const data = jwt.verify(req.get('X-Order-Token') || '', process.env.JWT_SECRET, { algorithms: ['HS256'] });
    return data.purpose === 'order' && data.orderId === order.id;
  } catch { return false; }
}
function checkoutResponse(order) {
  return { id: order.id, order_number: order.order_number, total_amount: order.total_amount, payment_status: order.payment_status, payment_method: order.payment_method, payment_reference: order.payment_reference, order_access_token: accessToken(order) };
}
module.exports = { fingerprint, canAccess, checkoutResponse };
