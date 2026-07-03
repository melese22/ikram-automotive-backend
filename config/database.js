const { Pool, types } = require('pg');
require('dotenv').config();

types.setTypeParser(20, parseInt);

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

function query(text, params) {
  if (!params || params.length === 0) return pool.query(text);
  const escaped = [];
  let i = 0;
  const sql = text.replace(/\$(\d+)/g, (_, idx) => {
    const val = params[idx - 1];
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return val.toString();
    const lit = pool.escapeLiteral(String(val));
    escaped.push(lit);
    return lit;
  });
  return pool.query(sql);
}

module.exports = {
  query,
  pool,
};
