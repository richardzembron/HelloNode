'use strict';

const { Router } = require('express');
const { getPool } = require('../db');
const router = Router();

/**
 * MySQL version → GA release date lookup.
 * MySQL does not expose release date via SQL — this map covers all 8.0.x and
 * 8.4.x GA releases. Returns 'unknown' for versions not in the map.
 */
const MYSQL_RELEASE_DATES = {
  // 8.0.x GA releases
  '8.0.11': '2018-04-19', '8.0.12': '2018-07-27', '8.0.13': '2018-10-22',
  '8.0.14': '2019-01-21', '8.0.15': '2019-02-01', '8.0.16': '2019-04-25',
  '8.0.17': '2019-07-22', '8.0.18': '2019-10-14', '8.0.19': '2020-01-13',
  '8.0.20': '2020-04-27', '8.0.21': '2020-07-13', '8.0.22': '2020-10-19',
  '8.0.23': '2021-01-18', '8.0.24': '2021-04-20', '8.0.25': '2021-05-11',
  '8.0.26': '2021-07-20', '8.0.27': '2021-10-19', '8.0.28': '2022-01-18',
  '8.0.29': '2022-04-26', '8.0.30': '2022-07-26', '8.0.31': '2022-10-11',
  '8.0.32': '2023-01-17', '8.0.33': '2023-04-18', '8.0.34': '2023-07-18',
  '8.0.35': '2023-10-25', '8.0.36': '2024-01-16', '8.0.37': '2024-04-30',
  '8.0.38': '2024-07-01', '8.0.39': '2024-07-23', '8.0.40': '2024-10-15',
  '8.0.41': '2025-01-14', '8.0.42': '2025-04-15',
  // 8.4.x LTS releases
  '8.4.0':  '2024-04-30', '8.4.1':  '2024-07-01', '8.4.2':  '2024-10-15',
  '8.4.3':  '2025-01-14', '8.4.4':  '2025-04-15',
  // 9.x Innovation releases
  '9.0.0':  '2024-07-01', '9.1.0':  '2024-10-15', '9.2.0':  '2025-01-14',
  '9.3.0':  '2025-04-15',
};

/**
 * GET /developer?cmd=<command>
 *
 * Supported commands:
 *   db_schema     — table/field definitions for all tables in the database
 *   db_statistics — per-table row count + size, plus server-level info:
 *                   db version, release date, uptime (seconds), table count
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

  // ── db_statistics ──────────────────────────────────────────────────────
  if (cmd === 'db_statistics') {
    try {
      // Server-level info
      const [[versionRow]]    = await pool.execute('SELECT VERSION() AS version');
      const [[uptimeRow]]     = await pool.execute("SHOW GLOBAL STATUS LIKE 'Uptime'");
      const [[tableCountRow]] = await pool.execute(`
        SELECT COUNT(*) AS count
        FROM   INFORMATION_SCHEMA.TABLES
        WHERE  TABLE_SCHEMA = DATABASE()
      `);

      const version       = versionRow.version;
      const uptimeSeconds = parseInt(uptimeRow.Value, 10);
      const tableCount    = Number(tableCountRow.count);
      const releaseDate   = MYSQL_RELEASE_DATES[version] || 'unknown';

      // Per-table sizes
      const [tables] = await pool.execute(`
        SELECT TABLE_NAME,
               ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024, 2) AS size_kb
        FROM   INFORMATION_SCHEMA.TABLES
        WHERE  TABLE_SCHEMA = DATABASE()
        ORDER  BY TABLE_NAME
      `);

      // Accurate row counts via COUNT(*)
      const tables_detail = await Promise.all(
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
        server: {
          version,
          release_date:   releaseDate,
          uptime_seconds: uptimeSeconds,
          table_count:    tableCount,
        },
        tables: tables_detail,
      });

    } catch (err) {
      console.error('db_statistics error:', err.message);
      return res.status(500).json({ query_ts, error: 'Database query failed' });
    }
  }
});

module.exports = router;
