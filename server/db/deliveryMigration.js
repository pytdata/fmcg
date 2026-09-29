const countries = require('./delivery-countries.json');
const continents = { AF: 'Africa', AN: 'Antarctica', AS: 'Asia', EU: 'Europe', NA: 'North America', OC: 'Oceania', SA: 'South America' };
module.exports = async function migrateDelivery(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS delivery_groups (
      code TEXT PRIMARY KEY, name TEXT NOT NULL,
      fee_usd NUMERIC(10,2) CHECK (fee_usd >= 0),
      is_active BOOLEAN NOT NULL DEFAULT false, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS delivery_countries (
      code TEXT PRIMARY KEY, name TEXT NOT NULL,
      continent_code TEXT NOT NULL REFERENCES delivery_groups(code)
    );
    CREATE TABLE IF NOT EXISTS delivery_quotes (
      id UUID PRIMARY KEY, details JSONB NOT NULL, expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS delivery_quotes_expiry_idx ON delivery_quotes(expires_at);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_quote JSONB;
  `);
  for (const [code, name] of Object.entries(continents)) {
    await client.query('INSERT INTO delivery_groups (code,name) VALUES ($1,$2) ON CONFLICT (code) DO NOTHING', [code,name]);
  }
  await client.query(`INSERT INTO delivery_countries (code,name,continent_code)
    SELECT code,name,continent FROM jsonb_to_recordset($1::jsonb) AS c(code text,name text,continent text)
    ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, continent_code=EXCLUDED.continent_code`, [JSON.stringify(countries)]);
};
