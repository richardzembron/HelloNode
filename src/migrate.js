'use strict';

require('dotenv').config();
const { getPool } = require('./db');

/**
 * Idempotent DB migration — creates all required tables if they do not exist.
 * Safe to call on every startup. Add new tables here as the schema grows.
 */
async function runMigration() {
  const pool = getPool();
  if (!pool) {
    console.warn('⚠️  No DB pool — skipping migration.');
    return;
  }

  const conn = await pool.getConnection();
  try {

    // ── hello_log ───────────────────────────────────────────────────────────────────────────
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS hello_log (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        age        DECIMAL(10, 3) NOT NULL,
        message    VARCHAR(255)   NOT NULL,
        created_at DATETIME       NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // ── useraccounts ─────────────────────────────────────────────────────────────────────
    // One row per Google account. google_id is the permanent unique identity.
    // email, name and picture_url are overwritten on every login because Google
    // allows users to change them. first_login_at is set once and never changed.
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS useraccounts (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        google_id       VARCHAR(64)   NOT NULL,
        email           VARCHAR(255)  NOT NULL,
        name            VARCHAR(255)  NOT NULL,
        picture_url     VARCHAR(500)  DEFAULT NULL,
        first_login_at  DATETIME      NOT NULL,
        last_login_at   DATETIME      NOT NULL,
        login_count     INT UNSIGNED  NOT NULL DEFAULT 1,
        UNIQUE KEY uq_google_id (google_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // ── environment ─────────────────────────────────────────────────────────────────────
    // General-purpose key/value variable table for app-wide settings.
    // name is unique — use INSERT IGNORE for idempotent seed inserts.
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS environment (
        id      INT AUTO_INCREMENT PRIMARY KEY,
        name    VARCHAR(100) NOT NULL,
        content TEXT         NOT NULL,
        UNIQUE KEY uq_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Seed default values — INSERT IGNORE skips silently if the row exists
    await conn.execute(`
      INSERT IGNORE INTO environment (name, content)
      VALUES ('maxuseraccounts', '1');
    `);

    console.log('✅  Migration complete — hello_log, useraccounts, environment tables ready.');

  } finally {
    conn.release();
  }
}

module.exports = { runMigration };

// Allow running directly: node src/migrate.js
if (require.main === module) {
  runMigration()
    .then(() => getPool()?.end())
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
