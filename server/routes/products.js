const router = require('express').Router();
const pool = require('../db/pool');
const { auth, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { enqueueMediaJob } = require('../services/mediaQueue');

// Helper: attach media + variations + pricing tags to product rows
async function attachProductExtras(rows) {
  if (!rows.length) return rows;
  const ids = rows.map(r => r.id);

  // Fetch all ready media for these products
  const { rows: media } = await pool.query(
    `SELECT * FROM product_media WHERE product_id = ANY($1::uuid[]) AND status='ready' ORDER BY sort_order`,
    [ids],
  );

  // Fetch all variation types + options
  const { rows: vtypes } = await pool.query(
    `SELECT * FROM product_variation_types WHERE product_id = ANY($1::uuid[]) ORDER BY sort_order`,
    [ids],
  );
  const vtypeIds = vtypes.map(t => t.id);
  const { rows: vopts } = vtypeIds.length
    ? await pool.query(
        `SELECT * FROM product_variation_options WHERE type_id = ANY($1::uuid[]) ORDER BY sort_order`,
        [vtypeIds],
      )
    : { rows: [] };

  // Fetch active pricing tags (graceful: table may not exist in fresh dev env)
  let tagRows = [];
  try {
    const res = await pool.query(
      `SELECT ppt.product_id, pt.id, pt.name, pt.slug, pt.tag_type,
              pt.color, pt.bg_color, pt.icon, pt.discount_type, pt.discount_value
       FROM product_pricing_tags ppt
       JOIN pricing_tags pt ON pt.id = ppt.tag_id
       WHERE ppt.product_id = ANY($1::uuid[])
         AND pt.is_active = true
         AND (pt.valid_until IS NULL OR pt.valid_until > now())`,
      [ids],
    );
    tagRows = res.rows;
  } catch (_) { /* table not yet created */ }

  return rows.map(r => {
    const productMedia = media.filter(m => m.product_id === r.id);
    const images = productMedia.filter(m => m.media_type === 'image');
    const videos = productMedia.filter(m => m.media_type === 'video');
    const variationTypes = vtypes
      .filter(t => t.product_id === r.id)
      .map(t => ({ ...t, options: vopts.filter(o => o.type_id === t.id) }));
    const pricingTags = tagRows.filter(t => t.product_id === r.id);
    return {
      ...r,
      category: r.category_name ? { id: r.category_id, name: r.category_name, slug: r.category_slug } : null,
      media: productMedia,
      images: images.length
        ? images.map(m => m.url_medium || m.url_large || m.url_original)
        : (r.images || []),
      image_variants: images,
      videos,
      variations: variationTypes,
      pricing_tags: pricingTags,
    };
  });
}

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const { category, featured, search, limit = 50, page = 1 } = req.query;
    const params = [];
    const wheres = ['p.is_active = true'];

    if (category) { params.push(category); wheres.push(`c.slug = $${params.length}`); }
    if (featured === 'true') wheres.push('p.is_featured = true');
    if (search) { params.push(`%${search}%`); wheres.push(`p.name ILIKE $${params.length}`); }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit)); params.push(offset);

    const { rows } = await pool.query(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM products p LEFT JOIN categories c ON p.category_id = c.id
       WHERE ${wheres.join(' AND ')}
       ORDER BY p.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    res.json(await attachProductExtras(rows));
  } catch (err) {
    console.error('[products/list]', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/products/admin/all
router.get('/admin/all', auth, adminOnly, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM products p LEFT JOIN categories c ON p.category_id = c.id
       ORDER BY p.created_at DESC`,
    );
    res.json(await attachProductExtras(rows));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/products/:slug
router.get('/:slug', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM products p LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.slug = $1 AND p.is_active = true`,
      [req.params.slug],
    );
    if (!rows.length) return res.status(404).json({ error: 'Product not found' });
    const [product] = await attachProductExtras(rows);
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Replace a product's pricing-tag assignments (parameterized, safe if absent).
async function syncProductTags(productId, tagIds) {
  if (!Array.isArray(tagIds)) return;
  await pool.query('DELETE FROM product_pricing_tags WHERE product_id = $1', [productId]);
  for (const tagId of tagIds) {
    if (!tagId) continue;
    await pool.query(
      `INSERT INTO product_pricing_tags (product_id, tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [productId, tagId],
    );
  }
}

// POST /api/products (admin)
router.post('/', auth, adminOnly, async (req, res) => {
  const { name, slug, description, price, compare_price, stock_quantity,
    category_id, images, video_urls, sku, weight_kg, is_featured, is_active, tag_ids } = req.body;
  if (!name || !slug) return res.status(400).json({ error: 'name and slug are required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO products (name, slug, description, price, compare_price, stock_quantity,
         category_id, images, video_urls, sku, weight_kg, is_featured, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [name, slug, description || null, price || 0, compare_price || null,
       stock_quantity || 0, category_id || null, images || [], video_urls || [],
       sku || null, weight_kg || null, is_featured ?? false, is_active ?? true],
    );
    try { await syncProductTags(rows[0].id, tag_ids); } catch (e) { console.error('[products tags]', e.message); }
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Slug already exists' });
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT /api/products/:id (admin)
router.put('/:id', auth, adminOnly, async (req, res) => {
  const { name, slug, description, price, compare_price, stock_quantity,
    category_id, images, video_urls, sku, weight_kg, is_featured, is_active, tag_ids } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE products SET name=$1, slug=$2, description=$3, price=$4, compare_price=$5,
         stock_quantity=$6, category_id=$7, images=$8, video_urls=$9, sku=$10, weight_kg=$11,
         is_featured=$12, is_active=$13, updated_at=now()
       WHERE id=$14 RETURNING *`,
      [name, slug, description || null, price, compare_price || null,
       stock_quantity, category_id || null, images || [], video_urls || [], sku || null,
       weight_kg || null, is_featured ?? false, is_active ?? true, req.params.id],
    );
    if (!rows.length) return res.status(404).json({ error: 'Product not found' });
    try { await syncProductTags(req.params.id, tag_ids); } catch (e) { console.error('[products tags]', e.message); }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE /api/products/:id (admin)
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// POST /api/products/upload-image — queue-based single image upload
router.post('/upload-image', auth, adminOnly, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
  const productId = req.body.product_id || null;
  try {
    const result = await enqueueMediaJob({
      filePath: req.file.path,
      mime: req.file.mimetype,
      category: 'products',
      productId,
      entityType: 'product',
      entityId: productId || 'unknown',
      mediaType: 'image',
    });
    // For backward compat, also return a temp URL immediately
    const tempUrl = `/uploads/temp/${require('path').basename(req.file.path)}`;
    res.json({ url: tempUrl, jobId: result.jobId, mediaId: result.mediaId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products/upload-images — queue-based multiple image upload
router.post('/upload-images', auth, adminOnly, upload.array('images', 10), async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: 'No images uploaded' });
  const productId = req.body.product_id || null;
  try {
    const jobs = [];
    for (const file of req.files) {
      const r = await enqueueMediaJob({
        filePath: file.path,
        mime: file.mimetype,
        category: 'products',
        productId,
        entityType: 'product',
        entityId: productId || 'unknown',
        mediaType: 'image',
      });
      jobs.push({ jobId: r.jobId, mediaId: r.mediaId, tempUrl: `/uploads/temp/${require('path').basename(file.path)}` });
    }
    res.json({ urls: jobs.map(j => j.tempUrl), jobs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
