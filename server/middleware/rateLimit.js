const { createHash } = require('node:crypto');
const pool = require('../db/pool');
// Shared PostgreSQL counters apply across replicas and serverless cold starts.
function rateLimit(scope, limit, windowSeconds = 60, keyFor = req => req.ip) {
  return async (req, res, next) => {
    try {
      const key = createHash('sha256').update(`${scope}:${keyFor(req)}`).digest('hex');
      const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
      const { rows: [row] } = await pool.query(`INSERT INTO api_rate_limits (key,bucket,hits,expires_at)
        VALUES ($1,$2,1,now()+($3 * interval '1 second'))
        ON CONFLICT (key,bucket) DO UPDATE SET hits=api_rate_limits.hits+1 RETURNING hits`, [key,bucket,windowSeconds * 2]);
      if (row.hits > limit) { res.set('Retry-After', String(windowSeconds)); return res.status(429).json({ error: 'Too many requests. Please try again shortly.' }); }
      next();
    } catch { res.status(503).json({ error: 'Service temporarily unavailable. Please retry.' }); }
  };
}
module.exports = rateLimit;
