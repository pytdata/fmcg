const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

function sign(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '30d' },
  );
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { full_name, email, phone, password } = req.body;
  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'full_name, email and password are required' });
  }
  try {
    const exists = await pool.query('SELECT id FROM profiles WHERE email = $1', [email.toLowerCase()]);
    if (exists.rows.length) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO profiles (full_name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, 'customer') RETURNING id, full_name, email, phone, role, avatar_url, created_at`,
      [full_name, email.toLowerCase(), phone || null, hash],
    );
    const user = rows[0];
    res.status(201).json({ token: sign(user), user });
  } catch (err) {
    console.error('[auth/register]', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  try {
    const { rows } = await pool.query(
      'SELECT * FROM profiles WHERE email = $1',
      [email.toLowerCase()],
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
router.get('/me', async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    const jwt_ = require('jsonwebtoken');
    const decoded = jwt_.verify(header.slice(7), process.env.JWT_SECRET);
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
router.put('/profile', async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    const jwt_ = require('jsonwebtoken');
    const decoded = jwt_.verify(header.slice(7), process.env.JWT_SECRET);
    const { full_name, phone } = req.body;
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
