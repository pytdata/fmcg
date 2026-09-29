module.exports = async client => {
  await client.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS request_hash TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_reference_unique ON orders(payment_reference) WHERE payment_reference IS NOT NULL;
    CREATE TABLE IF NOT EXISTS api_rate_limits (
      key TEXT NOT NULL, bucket BIGINT NOT NULL, hits INTEGER NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL, PRIMARY KEY(key,bucket)
    );
    CREATE INDEX IF NOT EXISTS api_rate_limits_expiry ON api_rate_limits(expires_at);
    DELETE FROM api_rate_limits WHERE expires_at < now();
  `);
};
