const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { UUID } = require('../services/orderPricing');
async function resolveUser(header) {
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null;
  const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET, { algorithms: ['HS256'] });
  if (decoded.purpose || typeof decoded.id !== 'string' || !UUID.test(decoded.id)) return null;
  // Deleted users and revoked admin roles take effect immediately, not after JWT expiry.
  const { rows: [user] } = await pool.query('SELECT id,email,role FROM profiles WHERE id=$1', [decoded.id]);
  return user || null;
}
async function auth(req, res, next) {
  try {
    req.user = await resolveUser(req.headers.authorization);
    if (!req.user) return res.status(401).json({ error: 'Invalid or expired session' });
    next();
  } catch { res.status(401).json({ error: 'Invalid or expired session' }); }
}
function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}
async function optionalAuth(req, res, next) {
  if (!req.headers.authorization) return next();
  return auth(req, res, next);
}
module.exports = { auth, adminOnly, optionalAuth };
