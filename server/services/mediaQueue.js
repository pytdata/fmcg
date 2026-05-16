/**
 * Media Upload Queue Worker
 *
 * In-process queue (no Redis required) using a simple async job queue.
 * Jobs are added when files are uploaded; worker processes them in the background.
 * Provides: enqueueMediaJob, getJobStatus
 *
 * Architecture:
 *  Client uploads → multer saves to /uploads/temp → route enqueues job →
 *  worker picks up → validateType + malwareScan + compress → update DB → done
 */

const EventEmitter = require('events');
const pool = require('../db/pool');
const { processMedia } = require('./mediaProcessor');

// ── Simple in-process queue ───────────────────────────────────────────────────

class MediaQueue extends EventEmitter {
  constructor() {
    super();
    this.jobs = [];
    this.active = 0;
    this.concurrency = 3; // max parallel jobs
    this.processing = new Map(); // jobId → promise
  }

  add(job) {
    this.jobs.push(job);
    this._tick();
    return job.id;
  }

  _tick() {
    while (this.active < this.concurrency && this.jobs.length > 0) {
      const job = this.jobs.shift();
      this.active++;
      this._process(job).finally(() => {
        this.active--;
        this._tick();
      });
    }
  }

  async _process(job) {
    this.emit('job:start', job.id);
    try {
      // Mark as processing in DB
      await pool.query(
        `UPDATE media_jobs SET status='processing', attempts=attempts+1 WHERE id=$1`,
        [job.dbJobId],
      ).catch(() => {});

      const result = await processMedia({
        filePath: job.filePath,
        declaredMime: job.mime,
        category: job.category,
        mediaJobId: job.dbJobId,
      });

      if (result.ok) {
        // Persist compressed URLs back to product_media or relevant table
        if (job.mediaId) {
          await _updateMediaRecord(job.mediaId, result);
        }
        this.emit('job:done', job.id, result);
      } else {
        this.emit('job:fail', job.id, result.error);
      }
    } catch (err) {
      this.emit('job:fail', job.id, err.message);
    }
  }
}

const queue = new MediaQueue();

// Log events
queue.on('job:start', (id) => console.log(`[queue] Processing job ${id}`));
queue.on('job:done',  (id) => console.log(`[queue] ✓ Job ${id} completed`));
queue.on('job:fail',  (id, err) => console.error(`[queue] ✗ Job ${id} failed:`, err));

// ── Update DB with compressed variant URLs ────────────────────────────────────

async function _updateMediaRecord(mediaId, result) {
  const { urls, mediaType } = result;
  if (mediaType === 'image') {
    await pool.query(
      `UPDATE product_media
       SET url_original=$1, url_large=$2, url_medium=$3, url_small=$4, status='ready'
       WHERE id=$5`,
      [urls.original, urls.large, urls.medium, urls.small, mediaId],
    );
  } else {
    await pool.query(
      `UPDATE product_media
       SET url_video=$1, thumbnail_url=$2, status='ready'
       WHERE id=$3`,
      [urls.url_video, urls.url_video, mediaId],
    );
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Enqueue a media processing job.
 *
 * @param {object} opts
 * @param {string} opts.filePath    - Absolute path to temp uploaded file
 * @param {string} opts.mime        - Declared MIME type
 * @param {string} opts.category    - Upload category (products|banners|pages|categories)
 * @param {string} [opts.productId] - Product ID for product_media linkage
 * @param {string} [opts.entityType]- 'product'|'banner'|'page'|'category'
 * @param {string} [opts.entityId]  - Entity row ID
 * @param {string} [opts.mediaType] - 'image'|'video'
 * @returns {Promise<{ jobId, dbJobId, mediaId }>}
 */
async function enqueueMediaJob(opts) {
  const { filePath, mime, category = 'products', productId, entityType = 'product', entityId, mediaType = 'image' } = opts;
  const jobId = require('crypto').randomUUID();

  // Create product_media record if we have a productId
  let mediaId = null;
  if (productId) {
    const { rows } = await pool.query(
      `INSERT INTO product_media (product_id, media_type, url_original, status, sort_order)
       VALUES ($1, $2, $3, 'pending',
         COALESCE((SELECT MAX(sort_order)+1 FROM product_media WHERE product_id=$1), 0))
       RETURNING id`,
      [productId, mediaType, filePath],
    );
    mediaId = rows[0]?.id;
  }

  // Create media_jobs record
  const { rows: jobRows } = await pool.query(
    `INSERT INTO media_jobs (id, media_id, entity_type, entity_id, original_path, status)
     VALUES ($1, $2, $3, $4, $5, 'queued')
     RETURNING id`,
    [jobId, mediaId, entityType, entityId || productId || '', filePath],
  );
  const dbJobId = jobRows[0]?.id;

  // Enqueue
  queue.add({ id: jobId, dbJobId, mediaId, filePath, mime, category });

  return { jobId, dbJobId, mediaId };
}

/**
 * Get current status of a media job.
 */
async function getJobStatus(jobId) {
  const { rows } = await pool.query(
    `SELECT j.*, m.url_original, m.url_large, m.url_medium, m.url_small,
            m.url_video, m.thumbnail_url, m.status AS media_status
     FROM media_jobs j
     LEFT JOIN product_media m ON m.id = j.media_id
     WHERE j.id = $1`,
    [jobId],
  );
  return rows[0] || null;
}

/**
 * Get all pending/processing jobs (for admin queue monitor).
 */
async function getQueueStats() {
  const { rows } = await pool.query(
    `SELECT status, COUNT(*) FROM media_jobs GROUP BY status`,
  );
  const stats = { queued: 0, processing: 0, done: 0, failed: 0 };
  rows.forEach(r => { stats[r.status] = parseInt(r.count); });
  return {
    ...stats,
    activeInMemory: queue.active,
    pendingInMemory: queue.jobs.length,
  };
}

module.exports = { enqueueMediaJob, getJobStatus, getQueueStats };
