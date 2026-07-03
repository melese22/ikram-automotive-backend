const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' || process.env.DATABASE_URL?.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
  process.exit(-1);
});

function escape(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val.toString();
  const s = String(val).replace(/'/g, "''").replace(/\\/g, '\\\\');
  return `'${s}'`;
}

function query(text, params) {
  if (!params || params.length === 0) return pool.query(text);
  const sql = text.replace(/\$(\d+)/g, (_, idx) => escape(params[parseInt(idx) - 1]));
  return pool.query(sql);
}

module.exports = {
  query,
  pool,
};
