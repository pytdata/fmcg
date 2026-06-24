require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const runMigrations = require('./db/migrate');

// Run migrations immediately at module load — works in both Express and Vercel serverless
runMigrations().catch(err => console.error('[startup] Migration failed:', err.message));

const app = express();

// ── Security headers (XSS / clickjacking / sniffing hardening) ─────────────────
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  next();
});

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: (process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map(s => s.trim()),
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Serve uploaded media — use /tmp/uploads on serverless (Vercel), local uploads/ otherwise
const UPLOADS_DIR = process.env.UPLOAD_ROOT_DIR || '/tmp/uploads';
app.use('/uploads', express.static(UPLOADS_DIR));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/setup',       require('./routes/setup'));
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/products',    require('./routes/products'));
app.use('/api/products/:productId/media',      require('./routes/productMedia'));
app.use('/api/products/:productId/variations', require('./routes/variations'));
app.use('/api/categories',  require('./routes/categories'));
app.use('/api/delivery-locations', require('./routes/deliveryLocations'));
app.use('/api/cart',        require('./routes/cart'));
app.use('/api/orders',      require('./routes/orders'));
app.use('/api/promotions',  require('./routes/promotions'));
app.use('/api/gift-boxes',  require('./routes/giftBoxes'));
app.use('/api/banners',     require('./routes/banners'));
app.use('/api/settings',    require('./routes/settings'));
app.use('/api/customers',   require('./routes/customers'));
app.use('/api/wishlist',    require('./routes/wishlist'));
app.use('/api/pages',        require('./routes/pages'));
app.use('/api/media',        require('./routes/media'));
app.use('/api/pricing-tags', require('./routes/pricingTags'));
app.use('/api/modules',     require('./routes/modules'));
app.use('/api/brands',      require('./routes/brands'));
app.use('/api/team',        require('./routes/team'));
app.use('/api/analytics',   require('./routes/analytics'));
app.use('/api/seo',         require('./routes/seo'));
app.use('/api/gift-packaging', require('./routes/giftPackaging'));
app.use('/api/blog',        require('./routes/blog'));
app.use('/api/email',       require('./routes/email'));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[server error]', err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large (max 5 MB)' });
  }
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 KW Enterprise API running on port ${PORT}`);
});

module.exports = app;
