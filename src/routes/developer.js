'use strict';

const { Router } = require('express');
const { getPool } = require('../db');
const router = Router();

/**
 * GET /developer?cmd=<command>
 *
 * Supported commands:
 *   db_schema     — returns table/field definitions for all tables in the DB
 *   db_statistics — returns row count and size (kB) for all tables in the DB
 */
router.get('/', async (req, res) => {
  const query_ts = new Date().toISOString();
  const { cmd }  = req.query;

  const VALID_CMDS = ['db_schema', 'db_statistics'];

  if (!cmd || cmd.trim() === '') {
    return res.status(400).json({
      query_ts,
      error:          'Missing required query parameter: cmd',
      valid_commands: VALID_CMDS,
    });
  }

  if (!VALID_CMDS.includes(cmd)) {
    return res.status(400).json({
      query_ts,
      error:          `Unknown command: "${cmd}"`,
      valid_commands: VALID_CMDS,
    });
  }

  const pool = getPool();
  if (!pool) {
    return res.status(503).json({
      query_ts,
      error: 'Database not available',
    });
  }

  // ── db_schema ────────────────────────────────────────────────────────────
  if (cmd === 'db_schema') {
    try {
      const [columns] = await pool.execute(`
        SELECT TABLE_NAME,
               COLUMN_NAME,
               DATA_TYPE,
               CHARACTER_MAXIMUM_LENGTH,
               NUMERIC_PRECISION,
               COLUMN_KEY,
               IS_NULLABLE
        FROM   INFORMATION_SCHEMA.COLUMNS
        WHERE  TABLE_SCHEMA = DATABASE()
        ORDER  BY TABLE_NAME, ORDINAL_POSITION
      `);

      const tableMap = {};
      for (const col of columns) {
        if (!tableMap[col.TABLE_NAME]) {
          tableMap[col.TABLE_NAME] = { table: col.TABLE_NAME, fields: [] };
        }
        tableMap[col.TABLE_NAME].fields.push({
          name:     col.COLUMN_NAME,
          type:     col.DATA_TYPE,
          size:     col.CHARACTER_MAXIMUM_LENGTH ?? col.NUMERIC_PRECISION ?? null,
          primary:  col.COLUMN_KEY === 'PRI',
          nullable: col.IS_NULLABLE === 'YES',
        });
      }

      return res.status(200).json({
        query_ts,
        cmd,
        schema: Object.values(tableMap),
      });

    } catch (err) {
      console.error('db_schema error:', err.message);
      return res.status(500).json({ query_ts, error: 'Database query failed' });
    }
  }

  // ── db_statistics ─────────────────────────────────────────────────────────
  if (cmd === 'db_statistics') {
    try {
      const [tables] = await pool.execute(`
        SELECT TABLE_NAME,
               ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024, 2) AS size_kb
        FROM   INFORMATION_SCHEMA.TABLES
        WHERE  TABLE_SCHEMA = DATABASE()
        ORDER  BY TABLE_NAME
      `);

      const statistics = await Promise.all(
        tables.map(async (t) => {
          const [[{ count }]] = await pool.execute(
            `SELECT COUNT(*) AS count FROM \`${t.TABLE_NAME}\``
          );
          return {
            table:   t.TABLE_NAME,
            rows:    Number(count),
            size_kb: t.size_kb,
          };
        })
      );

      return res.status(200).json({
        query_ts,
        cmd,
        statistics,
      });

    } catch (err) {
      console.error('db_statistics error:', err.message);
      return res.status(500).json({ query_ts, error: 'Database query failed' });
    }
  }
});

module.exports = router;
