const router = require('express').Router();
const pool = require('../db/pool');
const { auth, adminOnly } = require('../middleware/auth');

// GET /api/team  (public — active only)
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM team_members
       WHERE is_active = true
       ORDER BY sort_order, name`,
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// GET /api/team/admin/all  (admin — includes inactive)
router.get('/admin/all', auth, adminOnly, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM team_members ORDER BY sort_order, name',
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// POST /api/team  (admin)
router.post('/', auth, adminOnly, async (req, res) => {
  const { name, role, photo_url, bio, email, linkedin_url, twitter_url, sort_order, is_active } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO team_members
         (name, role, photo_url, bio, email, linkedin_url, twitter_url, sort_order, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        name, role || null, photo_url || null, bio || null, email || null,
        linkedin_url || null, twitter_url || null, sort_order || 0, is_active !== false,
      ],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[team POST]', err.message);
    res.status(500).json({ error: 'Failed to create team member', detail: err.message });
  }
});

// PUT /api/team/:id  (admin)
router.put('/:id', auth, adminOnly, async (req, res) => {
  const { name, role, photo_url, bio, email, linkedin_url, twitter_url, sort_order, is_active } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE team_members
       SET name=$1, role=$2, photo_url=$3, bio=$4, email=$5,
           linkedin_url=$6, twitter_url=$7, sort_order=$8, is_active=$9
       WHERE id=$10 RETURNING *`,
      [
        name, role || null, photo_url || null, bio || null, email || null,
        linkedin_url || null, twitter_url || null, sort_order || 0, is_active !== false,
        req.params.id,
      ],
    );
    if (!rows.length) return res.status(404).json({ error: 'Team member not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[team PUT]', err.message);
    res.status(500).json({ error: 'Failed to update team member', detail: err.message });
  }
});

// DELETE /api/team/:id  (admin)
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM team_members WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[team DELETE]', err.message);
    res.status(500).json({ error: 'Failed to delete team member', detail: err.message });
  }
});

module.exports = router;
