'use strict';

require('dotenv').config();
const { getPool } = require('./db');

/**
 * Idempotent DB migration — creates required tables if they do not exist.
 * Safe to call on every startup.
 * Can also be run standalone: node src/migrate.js
 */
async function runMigration() {
  const pool = getPool();
  if (!pool) {
    console.warn('\u26a0\ufe0f  No DB pool — skipping migration.');
    return;
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
    console.log('\u2705  Migration complete — hello_log table ready.');
  } finally {
    conn.release();
  }
}

module.exports = { runMigration };

// Allow running directly: node src/migrate.js
if (require.main === module) {
  const { getPool } = require('./db');
  runMigration()
    .then(() => getPool()?.end())
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
