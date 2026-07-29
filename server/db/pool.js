const { Pool, types } = require('pg');

// node-postgres returns NUMERIC/DECIMAL columns (price, totals, discounts, …) as
// strings by default to avoid float precision loss on huge values. Every price
// field in this app fits safely in a JS number, and callers throughout the
// frontend call .toFixed()/arithmetic directly on them, so parse numeric columns
// as numbers once here instead of coercing at every call site.
types.setTypeParser(1700, (val) => (val === null ? null : parseFloat(val)));

const isLocal = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  // Serverless-friendly limits — many concurrent lambda instances each keep a
  // small pool, so cap connections low to avoid exhausting Postgres/Supabase.
  max: Number(process.env.PG_POOL_MAX) || 5,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
  allowExitOnIdle: true,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL client error:', err);
});

module.exports = pool;
