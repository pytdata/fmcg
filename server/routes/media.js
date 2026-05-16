/**
 * Media Queue monitor routes — /api/media
 * Admin-only endpoints to check queue stats and job status.
 */

const router = require('express').Router();
const { getQueueStats, getJobStatus } = require('../services/mediaQueue');
const { auth, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { enqueueMediaJob } = require('../services/mediaQueue');

// GET /api/media/queue-stats — queue health dashboard
router.get('/queue-stats', auth, adminOnly, async (_req, res) => {
  try {
    const stats = await getQueueStats();
    res.json(stats);
  } catch {
    res.status(500).json({ error: 'Failed to fetch queue stats' });
  }
});

// GET /api/media/job/:jobId — poll any job status
router.get('/job/:jobId', auth, adminOnly, async (req, res) => {
  try {
    const job = await getJobStatus(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch {
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// POST /api/media/upload — generic media upload (for banners, pages, etc.)
router.post('/upload', auth, adminOnly, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { category = 'pages', entityType = 'page', entityId = '' } = req.body;
  try {
    const result = await enqueueMediaJob({
      filePath: req.file.path,
      mime: req.file.mimetype,
      category,
      entityType,
      entityId,
      mediaType: req.file.mimetype.startsWith('video/') ? 'video' : 'image',
    });
    res.status(202).json({
      jobId: result.jobId,
      message: 'Processing queued',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
