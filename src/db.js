'use strict';

const mysql = require('mysql2/promise');

let pool = null;

/**
 * Returns a shared MySQL connection pool.
 * Falls back gracefully if DB env vars are not set (e.g. during testing).
 */
function getPool() {
  if (pool) return pool;

  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

  if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
    console.warn('⚠️  DB environment variables not set — MySQL pool not initialised.');
    return null;
  }

  pool = mysql.createPool({
    host:               DB_HOST,
    port:               parseInt(DB_PORT || '3306', 10),
    user:               DB_USER,
    password:           DB_PASSWORD,
    database:           DB_NAME,
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0,
  });

  return pool;
}

/**
 * Verify the DB connection on startup.
 */
async function testConnection() {
  const p = getPool();
  if (!p) return;
  try {
    const conn = await p.getConnection();
    await conn.ping();
    conn.release();
    console.log('✅  MySQL connected successfully.');
  } catch (err) {
    console.error('❌  MySQL connection failed:', err.message);
  }
}

module.exports = { getPool, testConnection };
