/**
 * Product Media routes — /api/products/:productId/media
 *
 * Handles image + video uploads for products.
 * Files go through the media queue for compression into 3 sizes.
 */

const router = require('express').Router({ mergeParams: true });
const pool = require('../db/pool');
const { auth, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { enqueueMediaJob, getJobStatus } = require('../services/mediaQueue');

// GET /api/products/:productId/media
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM product_media WHERE product_id=$1 ORDER BY sort_order`,
      [req.params.productId],
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch media' });
  }
});

// POST /api/products/:productId/media — upload single image or video
router.post('/', auth, adminOnly, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const isVideo = req.file.mimetype.startsWith('video/');
  try {
    const result = await enqueueMediaJob({
      filePath: req.file.path,
      mime: req.file.mimetype,
      category: isVideo ? 'videos' : 'products',
      productId: req.params.productId,
      entityType: 'product',
      entityId: req.params.productId,
      mediaType: isVideo ? 'video' : 'image',
    });
    res.status(202).json({
      jobId: result.jobId,
      mediaId: result.mediaId,
      status: 'queued',
      message: 'Media processing queued. Poll /media/job/:jobId for status.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products/:productId/media/bulk — upload multiple files
router.post('/bulk', auth, adminOnly, upload.array('files', 10), async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: 'No files uploaded' });
  try {
    const jobs = [];
    for (const file of req.files) {
      const isVideo = file.mimetype.startsWith('video/');
      const result = await enqueueMediaJob({
        filePath: file.path,
        mime: file.mimetype,
        category: isVideo ? 'videos' : 'products',
        productId: req.params.productId,
        entityType: 'product',
        entityId: req.params.productId,
        mediaType: isVideo ? 'video' : 'image',
      });
      jobs.push({ jobId: result.jobId, mediaId: result.mediaId, originalName: file.originalname });
    }
    res.status(202).json({ jobs, message: `${jobs.length} file(s) queued for processing` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/:productId/media/job/:jobId — poll job status
router.get('/job/:jobId', auth, adminOnly, async (req, res) => {
  try {
    const job = await getJobStatus(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch {
    res.status(500).json({ error: 'Failed to fetch job status' });
  }
});

// PATCH /api/products/:productId/media/:mediaId — update sort order or alt text
router.patch('/:mediaId', auth, adminOnly, async (req, res) => {
  const { sort_order, alt_text } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE product_media
       SET sort_order=COALESCE($1,sort_order), alt_text=COALESCE($2,alt_text)
       WHERE id=$3 AND product_id=$4 RETURNING *`,
      [sort_order, alt_text, req.params.mediaId, req.params.productId],
    );
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Failed to update media' });
  }
});

// DELETE /api/products/:productId/media/:mediaId
router.delete('/:mediaId', auth, adminOnly, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM product_media WHERE id=$1 AND product_id=$2`,
      [req.params.mediaId, req.params.productId],
    );
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete media' });
  }
});

module.exports = router;
