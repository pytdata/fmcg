/**
 * CMS Pages routes — /api/pages
 *
 * Public:  GET /api/pages/:slug
 * Admin:   PUT /api/pages/:slug
 *          GET /api/pages  (list all)
 *          POST /api/pages/:slug/media  (upload hero image)
 */

const router = require('express').Router();
const pool = require('../db/pool');
const { auth, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { enqueueMediaJob } = require('../services/mediaQueue');
const path = require('path');

// GET /api/pages — list all (admin)
router.get('/', auth, adminOnly, async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM cms_pages ORDER BY slug');
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch pages' });
  }
});

// GET /api/pages/:slug — public
router.get('/:slug', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM cms_pages WHERE slug=$1 AND is_published=true`,
      [req.params.slug],
    );
    if (!rows.length) return res.status(404).json({ error: 'Page not found' });
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Failed to fetch page' });
  }
});

// PUT /api/pages/:slug — admin update
router.put('/:slug', auth, adminOnly, async (req, res) => {
  const { title, content, meta_title, meta_desc, is_published } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE cms_pages
       SET title=COALESCE($1,title),
           content=COALESCE($2,content),
           meta_title=COALESCE($3,meta_title),
           meta_desc=COALESCE($4,meta_desc),
           is_published=COALESCE($5,is_published),
           updated_at=now()
       WHERE slug=$6
       RETURNING *`,
      [title, content ? JSON.stringify(content) : null, meta_title, meta_desc, is_published, req.params.slug],
    );
    if (!rows.length) return res.status(404).json({ error: 'Page not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[pages/update]', err);
    res.status(500).json({ error: 'Failed to update page' });
  }
});

// POST /api/pages/:slug/media — upload image for page section, run through queue
router.post('/:slug/media', auth, adminOnly, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const result = await enqueueMediaJob({
      filePath: req.file.path,
      mime: req.file.mimetype,
      category: 'pages',
      entityType: 'page',
      entityId: req.params.slug,
    });
    res.json({ jobId: result.jobId, message: 'Processing queued' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
