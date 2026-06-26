'use strict';

/**
 * DB migration — creates required tables if they don't exist.
 * Run on deployment: node src/migrate.js
 */

require('dotenv').config();
const { getPool } = require('./db');

async function migrate() {
  const pool = getPool();
  if (!pool) {
    console.warn('No DB pool available — skipping migration.');
    process.exit(0);
  }

  const conn = await pool.getConnection();
  try {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS hello_log (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        age        DECIMAL(10, 3) NOT NULL,
        message    VARCHAR(255)   NOT NULL,
        created_at DATETIME       NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅  Migration complete — hello_log table ready.');
  } finally {
    conn.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
