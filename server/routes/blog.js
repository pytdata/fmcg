const router = require('express').Router();
const pool = require('../db/pool');
const { auth, adminOnly } = require('../middleware/auth');

// GET /api/blog  (public — published posts only)
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM blog_posts
       WHERE is_published = true
       ORDER BY published_at DESC NULLS LAST, created_at DESC`,
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch blog posts' });
  }
});

// GET /api/blog/admin/all  (admin — all posts)
// NOTE: declared before '/:slug' so 'admin' isn't captured as a slug.
router.get('/admin/all', auth, adminOnly, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM blog_posts
       ORDER BY published_at DESC NULLS LAST, created_at DESC`,
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch blog posts' });
  }
});

// GET /api/blog/:slug  (public — single published post)
router.get('/:slug', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM blog_posts WHERE slug = $1 AND is_published = true',
      [req.params.slug],
    );
    if (!rows.length) return res.status(404).json({ error: 'Post not found' });
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Failed to fetch blog post' });
  }
});

// POST /api/blog  (admin)
router.post('/', auth, adminOnly, async (req, res) => {
  const {
    title, slug, excerpt, content, cover_image_url,
    category, author, read_time, is_published,
  } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  if (!slug) return res.status(400).json({ error: 'slug is required' });
  try {
    const dup = await pool.query('SELECT 1 FROM blog_posts WHERE slug = $1', [slug]);
    if (dup.rows.length) return res.status(409).json({ error: 'A post with this slug already exists' });

    const published = is_published === true;
    const publishedAt = published ? new Date() : null;

    const { rows } = await pool.query(
      `INSERT INTO blog_posts
        (title, slug, excerpt, content, cover_image_url, category, author, read_time, is_published, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        title, slug, excerpt || null, content || null, cover_image_url || null,
        category || null, author || null, read_time || null, published, publishedAt,
      ],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[blog POST]', err.message);
    res.status(500).json({ error: 'Failed to create blog post', detail: err.message });
  }
});

// PUT /api/blog/:id  (admin)
router.put('/:id', auth, adminOnly, async (req, res) => {
  const {
    title, slug, excerpt, content, cover_image_url,
    category, author, read_time, is_published,
  } = req.body;
  try {
    const existing = await pool.query('SELECT * FROM blog_posts WHERE id = $1', [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Post not found' });

    if (slug) {
      const dup = await pool.query(
        'SELECT 1 FROM blog_posts WHERE slug = $1 AND id <> $2',
        [slug, req.params.id],
      );
      if (dup.rows.length) return res.status(409).json({ error: 'A post with this slug already exists' });
    }

    const current = existing.rows[0];
    const published = is_published === true;
    // If transitioning to published and no published_at yet, set it now.
    let publishedAt = current.published_at;
    if (published && !publishedAt) publishedAt = new Date();

    const { rows } = await pool.query(
      `UPDATE blog_posts SET
        title=$1, slug=$2, excerpt=$3, content=$4, cover_image_url=$5,
        category=$6, author=$7, read_time=$8, is_published=$9,
        published_at=$10, updated_at=now()
       WHERE id=$11 RETURNING *`,
      [
        title ?? current.title,
        slug ?? current.slug,
        excerpt ?? null,
        content ?? null,
        cover_image_url ?? null,
        category ?? null,
        author ?? null,
        read_time ?? null,
        published,
        publishedAt,
        req.params.id,
      ],
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('[blog PUT]', err.message);
    res.status(500).json({ error: 'Failed to update blog post', detail: err.message });
  }
});

// DELETE /api/blog/:id  (admin)
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM blog_posts WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[blog DELETE]', err.message);
    res.status(500).json({ error: 'Failed to delete blog post', detail: err.message });
  }
});

module.exports = router;
