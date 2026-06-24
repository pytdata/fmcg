const router = require('express').Router();
const pool = require('../db/pool');
const { auth, adminOnly } = require('../middleware/auth');

// POST /api/analytics/track  (PUBLIC — sent via navigator.sendBeacon, no auth)
router.post('/track', async (req, res) => {
  try {
    const body = req.body || {};
    const path = typeof body.path === 'string' ? body.path : null;

    // Never track admin pages.
    if (path && path.startsWith('/admin')) {
      return res.json({ ok: true });
    }

    const eventType = typeof body.event_type === 'string' && body.event_type
      ? body.event_type
      : 'pageview';
    const referrer = typeof body.referrer === 'string' ? body.referrer : null;
    const device = typeof body.device === 'string' ? body.device : null;
    const sessionId = typeof body.session_id === 'string' ? body.session_id : null;
    const userId = typeof body.user_id === 'string' ? body.user_id : null;
    const meta = body.meta && typeof body.meta === 'object' ? body.meta : {};

    await pool.query(
      `INSERT INTO analytics_events
        (event_type, path, referrer, device, session_id, user_id, meta)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [eventType, path, referrer, device, sessionId, userId, JSON.stringify(meta)],
    );

    res.json({ ok: true });
  } catch (err) {
    // Tracking must never fail loudly — log and acknowledge.
    console.error('[analytics POST /track]', err.message);
    res.json({ ok: true });
  }
});

// GET /api/analytics/summary?days=30  (admin)
router.get('/summary', auth, adminOnly, async (req, res) => {
  try {
    let days = Number.parseInt(req.query.days, 10);
    if (!Number.isFinite(days)) days = 30;
    days = Math.min(365, Math.max(1, days));

    const since = `(now() - ($1 || ' days')::interval)`;

    const [totalsQ, seriesQ, topPagesQ, referrersQ, devicesQ] = await Promise.all([
      pool.query(
        `SELECT
           CAST(COUNT(*) FILTER (WHERE event_type = 'pageview') AS INTEGER) AS pageviews,
           CAST(COUNT(DISTINCT session_id) AS INTEGER) AS visitors,
           CAST(COUNT(*) AS INTEGER) AS events
         FROM analytics_events
         WHERE created_at >= ${since}`,
        [String(days)],
      ),
      pool.query(
        `WITH day_series AS (
           SELECT generate_series(
             (now()::date - ($1::int - 1)),
             now()::date,
             interval '1 day'
           )::date AS day
         )
         SELECT
           to_char(d.day, 'YYYY-MM-DD') AS date,
           CAST(COALESCE(COUNT(e.id) FILTER (WHERE e.event_type = 'pageview'), 0) AS INTEGER) AS pageviews,
           CAST(COALESCE(COUNT(DISTINCT e.session_id), 0) AS INTEGER) AS visitors
         FROM day_series d
         LEFT JOIN analytics_events e
           ON e.created_at::date = d.day
         GROUP BY d.day
         ORDER BY d.day ASC`,
        [days],
      ),
      pool.query(
        `SELECT path, CAST(COUNT(*) AS INTEGER) AS views
         FROM analytics_events
         WHERE event_type = 'pageview'
           AND path IS NOT NULL
           AND created_at >= ${since}
         GROUP BY path
         ORDER BY views DESC
         LIMIT 10`,
        [String(days)],
      ),
      pool.query(
        `SELECT
           CASE
             WHEN referrer IS NULL OR referrer = '' THEN 'Direct'
             ELSE referrer
           END AS referrer,
           CAST(COUNT(*) AS INTEGER) AS count
         FROM analytics_events
         WHERE created_at >= ${since}
         GROUP BY 1
         ORDER BY count DESC
         LIMIT 8`,
        [String(days)],
      ),
      pool.query(
        `SELECT
           COALESCE(NULLIF(device, ''), 'unknown') AS device,
           CAST(COUNT(*) AS INTEGER) AS count
         FROM analytics_events
         WHERE created_at >= ${since}
         GROUP BY 1
         ORDER BY count DESC`,
        [String(days)],
      ),
    ]);

    const totalsRow = totalsQ.rows[0] || { pageviews: 0, visitors: 0, events: 0 };

    const summary = {
      totals: {
        pageviews: Number(totalsRow.pageviews) || 0,
        visitors: Number(totalsRow.visitors) || 0,
        events: Number(totalsRow.events) || 0,
      },
      series: seriesQ.rows.map(r => ({
        date: r.date,
        pageviews: Number(r.pageviews) || 0,
        visitors: Number(r.visitors) || 0,
      })),
      top_pages: topPagesQ.rows.map(r => ({
        path: r.path,
        views: Number(r.views) || 0,
      })),
      referrers: referrersQ.rows.map(r => ({
        referrer: r.referrer,
        count: Number(r.count) || 0,
      })),
      devices: devicesQ.rows.map(r => ({
        device: r.device,
        count: Number(r.count) || 0,
      })),
    };

    res.json(summary);
  } catch (err) {
    console.error('[analytics GET /summary]', err.message);
    res.status(500).json({ error: 'Failed to compute analytics summary', detail: err.message });
  }
});

// GET /api/analytics/recent  (admin — live feed)
router.get('/recent', auth, adminOnly, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, event_type, path, referrer, device, created_at
       FROM analytics_events
       ORDER BY created_at DESC, id DESC
       LIMIT 50`,
    );
    res.json(rows);
  } catch (err) {
    console.error('[analytics GET /recent]', err.message);
    res.status(500).json({ error: 'Failed to fetch recent events', detail: err.message });
  }
});

module.exports = router;
