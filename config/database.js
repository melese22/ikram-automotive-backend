require('dotenv').config();
const { Pool } = require('pg');
const { neon } = require('@neondatabase/serverless');
const logger = require('./logger');

// Neon serverless driver — handles parameterized queries safely via HTTP,
// bypassing pgBouncer's extended query protocol limitation.
// Usage: db.query('SELECT * FROM users WHERE id = $1', [userId])
const sql = neon(process.env.DATABASE_URL);

// pg Pool is kept for migration runner and transaction support (BEGIN/COMMIT/ROLLBACK).
// Do NOT use pool.query() for application code — use query() instead.
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
  logger.fatal({ err }, 'Unexpected PostgreSQL pool error');
  process.exit(-1);
});

/**
 * Secure parameterized query using Neon serverless driver.
 * Values are sent as HTTP request body parameters — never interpolated into SQL strings.
 * Compatible with the existing pg-style $1, $2, ... placeholder syntax.
 * Returns { rows } shape matching pg's QueryResult for backward compatibility.
 */
async function query(text, params) {
  const rows = await sql.query(text, params || []);
  return { rows };
}

module.exports = {
  query,
  pool,
};
