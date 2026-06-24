const router = require('express').Router();
const pool = require('../db/pool');
const { auth, adminOnly } = require('../middleware/auth');

// ── Scoring helper ──────────────────────────────────────────────────────────
// On-site SEO heuristics. Produces an array of weighted checks and a 0..100
// score = round(100 * (sum(weight @pass) + 0.5*sum(weight @warn)) / sum(weight)).
function evaluateSeo(row) {
  const m = row || {};
  const title = (m.title || '').trim();
  const metaTitle = (m.meta_title || '').trim();
  const effectiveTitle = metaTitle || title;
  const desc = (m.meta_description || '').trim();
  const keywords = (m.keywords || '').trim();
  const ogImage = (m.og_image || '').trim();
  const canonical = (m.canonical_url || '').trim();
  const h1 = (m.h1 || '').trim();
  const focus = (m.focus_keyword || '').trim();
  const noindex = m.noindex === true;

  const checks = [];
  const add = (id, label, weight, status, detail) =>
    checks.push({ id, label, weight, status, detail });

  // title (w3)
  if (effectiveTitle)
    add('title', 'Title tag', 3, 'pass', 'A title is set for this page.');
  else
    add('title', 'Title tag', 3, 'fail', 'No title or meta title is set.');

  // title_length (w2)
  const tl = effectiveTitle.length;
  if (tl >= 30 && tl <= 60)
    add('title_length', 'Title length', 2, 'pass', `Title is ${tl} characters (ideal 30–60).`);
  else if ((tl >= 1 && tl <= 29) || (tl >= 61 && tl <= 70))
    add('title_length', 'Title length', 2, 'warn', `Title is ${tl} characters (aim for 30–60).`);
  else
    add('title_length', 'Title length', 2, 'fail', tl === 0 ? 'No title to measure.' : `Title is ${tl} characters (far outside 30–60).`);

  // meta_description (w3)
  if (desc)
    add('meta_description', 'Meta description', 3, 'pass', 'A meta description is set.');
  else
    add('meta_description', 'Meta description', 3, 'fail', 'No meta description is set.');

  // desc_length (w2)
  const dl = desc.length;
  if (dl >= 70 && dl <= 160)
    add('desc_length', 'Description length', 2, 'pass', `Description is ${dl} characters (ideal 70–160).`);
  else if ((dl >= 1 && dl <= 69) || (dl >= 161 && dl <= 200))
    add('desc_length', 'Description length', 2, 'warn', `Description is ${dl} characters (aim for 70–160).`);
  else
    add('desc_length', 'Description length', 2, 'fail', dl === 0 ? 'No description to measure.' : `Description is ${dl} characters (far outside 70–160).`);

  // keywords (w1)
  if (keywords)
    add('keywords', 'Keywords', 1, 'pass', 'Keywords are set.');
  else
    add('keywords', 'Keywords', 1, 'warn', 'No keywords set (optional but helpful).');

  // og_image (w1)
  if (ogImage)
    add('og_image', 'Open Graph image', 1, 'pass', 'An OG image is set for social sharing.');
  else
    add('og_image', 'Open Graph image', 1, 'warn', 'No OG image set — social shares may look plain.');

  // h1 (w2)
  if (h1)
    add('h1', 'H1 heading', 2, 'pass', 'An H1 heading is defined.');
  else
    add('h1', 'H1 heading', 2, 'warn', 'No H1 heading defined for this page.');

  // focus_keyword (w2)
  if (!focus) {
    add('focus_keyword', 'Focus keyword', 2, 'fail', 'No focus keyword set.');
  } else {
    const f = focus.toLowerCase();
    const inTitle = effectiveTitle.toLowerCase().includes(f) || title.toLowerCase().includes(f);
    const inDesc = desc.toLowerCase().includes(f);
    if (inTitle && inDesc)
      add('focus_keyword', 'Focus keyword', 2, 'pass', 'Focus keyword appears in title and description.');
    else if (inTitle || inDesc)
      add('focus_keyword', 'Focus keyword', 2, 'warn', `Focus keyword appears only in the ${inTitle ? 'title' : 'description'}.`);
    else
      add('focus_keyword', 'Focus keyword', 2, 'fail', 'Focus keyword does not appear in title or description.');
  }

  // canonical (w1)
  if (canonical)
    add('canonical', 'Canonical URL', 1, 'pass', 'A canonical URL is set.');
  else
    add('canonical', 'Canonical URL', 1, 'warn', 'No canonical URL set.');

  // indexable (w1)
  if (!noindex)
    add('indexable', 'Indexable', 1, 'pass', 'Page is indexable by search engines.');
  else
    add('indexable', 'Indexable', 1, 'warn', 'Page is set to noindex.');

  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.reduce((s, c) => {
    if (c.status === 'pass') return s + c.weight;
    if (c.status === 'warn') return s + 0.5 * c.weight;
    return s;
  }, 0);
  const score = totalWeight === 0 ? 0 : Math.round((100 * earned) / totalWeight);

  return { checks, score };
}

// GET /api/seo/meta?path=/x — PUBLIC
router.get('/meta', async (req, res) => {
  const path = req.query.path;
  if (!path) return res.json({});
  try {
    const { rows } = await pool.query('SELECT * FROM seo_meta WHERE path = $1', [path]);
    res.json(rows[0] || {});
  } catch (err) {
    console.error('[seo/meta]', err.message);
    res.status(500).json({ error: 'Failed to fetch SEO meta' });
  }
});

// GET /api/seo/admin/all — admin
router.get('/admin/all', auth, adminOnly, async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM seo_meta ORDER BY path');
    res.json(rows);
  } catch (err) {
    console.error('[seo/admin/all]', err.message);
    res.status(500).json({ error: 'Failed to fetch SEO entries' });
  }
});

// PUT /api/seo/meta — admin: upsert by path
router.put('/meta', auth, adminOnly, async (req, res) => {
  const {
    path, title, meta_title, meta_description, keywords, og_image,
    canonical_url, h1, focus_keyword, noindex,
  } = req.body;
  if (!path || typeof path !== 'string' || !path.trim())
    return res.status(400).json({ error: 'path is required' });

  const fields = {
    path: path.trim(),
    title: title || null,
    meta_title: meta_title || null,
    meta_description: meta_description || null,
    keywords: keywords || null,
    og_image: og_image || null,
    canonical_url: canonical_url || null,
    h1: h1 || null,
    focus_keyword: focus_keyword || null,
    noindex: noindex === true,
  };

  const { score } = evaluateSeo(fields);

  try {
    const { rows } = await pool.query(
      `INSERT INTO seo_meta
         (path, title, meta_title, meta_description, keywords, og_image,
          canonical_url, h1, focus_keyword, noindex, score, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())
       ON CONFLICT (path) DO UPDATE SET
         title = EXCLUDED.title,
         meta_title = EXCLUDED.meta_title,
         meta_description = EXCLUDED.meta_description,
         keywords = EXCLUDED.keywords,
         og_image = EXCLUDED.og_image,
         canonical_url = EXCLUDED.canonical_url,
         h1 = EXCLUDED.h1,
         focus_keyword = EXCLUDED.focus_keyword,
         noindex = EXCLUDED.noindex,
         score = EXCLUDED.score,
         updated_at = now()
       RETURNING *`,
      [
        fields.path, fields.title, fields.meta_title, fields.meta_description,
        fields.keywords, fields.og_image, fields.canonical_url, fields.h1,
        fields.focus_keyword, fields.noindex, score,
      ],
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('[seo/meta PUT]', err.message);
    res.status(500).json({ error: 'Failed to save SEO meta' });
  }
});

// GET /api/seo/audit — admin: run on-site audit across all pages
router.get('/audit', auth, adminOnly, async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM seo_meta ORDER BY path');
    const results = rows.map((row) => {
      const { checks, score } = evaluateSeo(row);
      return { path: row.path, score, checks };
    });
    const overall_score = results.length
      ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
      : 0;

    const { rows: snap } = await pool.query(
      `INSERT INTO seo_audits (overall_score, results)
       VALUES ($1, $2)
       RETURNING overall_score, results, created_at`,
      [overall_score, JSON.stringify(results)],
    );
    res.json({
      overall_score: snap[0].overall_score,
      results: snap[0].results,
      created_at: snap[0].created_at,
    });
  } catch (err) {
    console.error('[seo/audit]', err.message);
    res.status(500).json({ error: 'Failed to run site audit' });
  }
});

// GET /api/seo/score — admin: latest overall score (compute if none)
router.get('/score', auth, adminOnly, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT overall_score FROM seo_audits ORDER BY created_at DESC LIMIT 1',
    );
    if (rows.length) return res.json({ overall_score: rows[0].overall_score });

    const { rows: meta } = await pool.query('SELECT * FROM seo_meta');
    const scores = meta.map((row) => evaluateSeo(row).score);
    const overall_score = scores.length
      ? Math.round(scores.reduce((s, n) => s + n, 0) / scores.length)
      : 0;
    res.json({ overall_score });
  } catch (err) {
    console.error('[seo/score]', err.message);
    res.status(500).json({ error: 'Failed to fetch SEO score' });
  }
});

// GET /api/seo/audits — admin: last 20 audit snapshots (history)
router.get('/audits', auth, adminOnly, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, overall_score, created_at
       FROM seo_audits ORDER BY created_at DESC LIMIT 20`,
    );
    res.json(rows);
  } catch (err) {
    console.error('[seo/audits]', err.message);
    res.status(500).json({ error: 'Failed to fetch audit history' });
  }
});

module.exports = router;
