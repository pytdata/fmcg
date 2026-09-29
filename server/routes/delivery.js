const router = require('express').Router();
const pool = require('../db/pool');
const { auth, adminOnly } = require('../middleware/auth');
const service = require('../services/delivery');

const rateLimit = require('../middleware/rateLimit');
router.use(['/places','/quote','/reverse'], rateLimit('places-client',60), rateLimit('places-budget',3000,3600,()=> 'global'));
function sessionValid(value) { return typeof value === 'string' && /^[a-zA-Z0-9_-]{16,36}$/.test(value); }
router.post('/places', async (req, res) => {
  const { input, sessionToken } = req.body;
  if (typeof input !== 'string' || input.trim().length < 3 || input.length > 200 || !sessionValid(sessionToken)) return res.status(400).json({ error: 'Enter at least three characters' });
  try { res.json(await service.autocomplete(input.trim(), sessionToken)); }
  catch (err) { res.status(503).json({ error: err.message }); }
});
router.post('/reverse', async (req, res) => {
  const { latitude, longitude } = req.body;
  try { res.json(await service.reverseGeocode(Number(latitude), Number(longitude))); }
  catch (err) { res.status(422).json({ error: err.message }); }
});
router.post('/quote', async (req, res) => {
  const { placeId, sessionToken } = req.body;
  if (typeof placeId !== 'string' || !/^[a-zA-Z0-9_-]{1,255}$/.test(placeId) || !sessionValid(sessionToken)) return res.status(400).json({ error: 'Select a suggested location' });
  try { res.json(await service.quote(placeId, sessionToken)); }
  catch (err) { res.status(422).json({ error: err.message }); }
});
router.get('/groups', auth, adminOnly, async (_req, res) => {
  try {
    const { rows } = await pool.query(`SELECT g.*, COALESCE(json_agg(json_build_object('code', c.code, 'name', c.name) ORDER BY c.name) FILTER (WHERE c.code IS NOT NULL), '[]') AS countries FROM delivery_groups g LEFT JOIN delivery_countries c ON c.continent_code = g.code GROUP BY g.code ORDER BY g.name`);
    res.json(rows);
  } catch { res.status(500).json({ error: 'Unable to load delivery groups' }); }
});
router.put('/groups/:code', auth, adminOnly, async (req, res) => {
  const { fee_usd, is_active } = req.body;
  if (typeof fee_usd !== 'number' || !Number.isFinite(fee_usd) || fee_usd < 0 || fee_usd > 999999 || Math.abs(fee_usd * 100 - Math.round(fee_usd * 100)) > 0.000001 || typeof is_active !== 'boolean') return res.status(400).json({ error: 'Enter a non-negative USD fee with at most two decimal places' });
  try {
    const { rows: [group] } = await pool.query('UPDATE delivery_groups SET fee_usd=$1, is_active=$2, updated_at=now() WHERE code=$3 RETURNING *', [fee_usd, is_active, req.params.code]);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    res.json(group);
  } catch { res.status(500).json({ error: 'Unable to save delivery group' }); }
});
module.exports = router;
