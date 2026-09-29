const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { auth } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const validEmail = value => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const validPassword = value => typeof value === 'string' && Buffer.byteLength(value) <= 72 && value.length >= 8;

function sign(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d', algorithm: 'HS256' },
  );
}

// POST /api/auth/register
router.post('/register', rateLimit('register', 5, 3600), async (req, res) => {
  const { full_name, email, phone, password } = req.body;
  if (!validEmail(email) || !validPassword(password) || typeof full_name !== 'string' || !full_name.trim() || full_name.length > 150 || (phone != null && (typeof phone !== 'string' || phone.length > 30))) {
    return res.status(400).json({ error: 'Provide a name, valid email and a password of 8–72 bytes' });
  }
  try {
    const exists = await pool.query('SELECT id FROM profiles WHERE email = $1', [email.trim().toLowerCase()]);
    if (exists.rows.length) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO profiles (full_name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, 'customer') RETURNING id, full_name, email, phone, role, avatar_url, created_at`,
      [full_name, email.trim().toLowerCase(), phone || null, hash],
    );
    const user = rows[0];
    res.status(201).json({ token: sign(user), user });
  } catch (err) {
    console.error('[auth/register]', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', rateLimit('login-ip', 30, 900), rateLimit('login-account', 15, 900, req => typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : 'invalid'), async (req, res) => {
  const { email, password } = req.body;
  if (!validEmail(email) || typeof password !== 'string' || !password || Buffer.byteLength(password) > 72) return res.status(400).json({ error: 'Email and password are required' });
  try {
    const { rows } = await pool.query(
      'SELECT * FROM profiles WHERE email = $1',
      [email.trim().toLowerCase()],
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const { password_hash, ...safe } = user;
    res.json({ token: sign(safe), user: safe });
  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me  (requires auth header)
router.get('/me', auth, async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    const jwt_ = require('jsonwebtoken');
    const decoded = req.user;
    const { rows } = await pool.query(
      'SELECT id, full_name, email, phone, role, avatar_url, created_at FROM profiles WHERE id = $1',
      [decoded.id],
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ user: rows[0] });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// PUT /api/auth/profile
router.put('/profile', auth, async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    const jwt_ = require('jsonwebtoken');
    const decoded = req.user;
    const { full_name, phone } = req.body;
    if ((full_name != null && (typeof full_name !== 'string' || full_name.length > 150)) || (phone != null && (typeof phone !== 'string' || phone.length > 30))) return res.status(400).json({ error: 'Invalid profile fields' });
    const { rows } = await pool.query(
      `UPDATE profiles SET full_name = COALESCE($1, full_name), phone = COALESCE($2, phone), updated_at = now()
       WHERE id = $3 RETURNING id, full_name, email, phone, role, avatar_url`,
      [full_name || null, phone || null, decoded.id],
    );
    res.json({ user: rows[0] });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
