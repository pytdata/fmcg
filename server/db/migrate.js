/**
 * Incremental migrations — safe to run multiple times (idempotent).
 * Called automatically on server startup from index.js.
 */
const pool = require('./pool');

async function runMigrations() {
  const client = await pool.connect();
  try {
    // ── 001: add parent_id to categories ──────────────────────────────────────
    await client.query(`
      ALTER TABLE categories
        ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES categories(id) ON DELETE SET NULL
    `);

    // ── 002: create delivery_locations table ──────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS delivery_locations (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name         TEXT NOT NULL,
        region       TEXT,
        delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
        is_active    BOOLEAN DEFAULT true,
        sort_order   INTEGER DEFAULT 0,
        created_at   TIMESTAMPTZ DEFAULT now()
      )
    `);

    console.log('[migrations] All migrations applied successfully.');
  } catch (err) {
    console.error('[migrations] Migration error:', err.message);
  } finally {
    client.release();
  }
}

module.exports = runMigrations;
