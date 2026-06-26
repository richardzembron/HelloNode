'use strict';

const { Router } = require('express');
const { getPool } = require('../db');
const router = Router();

/**
 * GET /hellolog
 *
 * Returns JSON with:
 *   - query_ts  : ISO timestamp of when this request was received
 *   - count     : number of entries returned
 *   - entries   : the 10 newest rows from hello_log, newest first
 *
 * Returns 503 if the database is not available.
 */
router.get('/', async (req, res) => {
  const query_ts = new Date().toISOString();

  const pool = getPool();
  if (!pool) {
    return res.status(503).json({
      query_ts,
      error: 'Database not available',
    });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT id, age, message, created_at
         FROM hello_log
        ORDER BY created_at DESC, id DESC
        LIMIT 10`
    );

    return res.status(200).json({
      query_ts,
      count: rows.length,
      entries: rows,
    });
  } catch (err) {
    console.error('hellolog query error:', err.message);
    return res.status(500).json({
      query_ts,
      error: 'Database query failed',
    });
  }
});

module.exports = router;
