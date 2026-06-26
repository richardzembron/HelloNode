'use strict';

const { Router } = require('express');
const { getPool } = require('../db');
const router = Router();

/**
 * GET /hello?age=<number>
 *
 * Returns plain text: "Hello World. World is <age> billion years old"
 * Logs the request to MySQL if DB is available.
 */
router.get('/hello', async (req, res) => {
  const { age } = req.query;

  if (age === undefined || age === '') {
    return res.status(400).type('text').send(
      'Error: Missing required query parameter: age\nExample: /hello?age=4.5'
    );
  }

  const ageNumber = Number(age);

  if (!Number.isFinite(ageNumber) || ageNumber < 0) {
    return res.status(400).type('text').send(
      `Error: Invalid value for 'age': "${age}". Must be a non-negative number.\nExample: /hello?age=4.5`
    );
  }

  const message = `Hello World. World is ${ageNumber} billion years old`;

  // Log to DB if available (non-fatal if DB is down)
  const pool = getPool();
  if (pool) {
    try {
      await pool.execute(
        'INSERT INTO hello_log (age, message, created_at) VALUES (?, ?, NOW())',
        [ageNumber, message]
      );
    } catch (err) {
      console.error('DB log error:', err.message);
    }
  }

  return res.status(200).type('text').send(message);
});

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
router.get('/hellolog', async (req, res) => {
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

/**
 * GET /
 * Health-check route.
 */
router.get('/', (req, res) => {
  res.status(200).type('text').send(
    `HelloNode is running.\nEnvironment: ${process.env.NODE_ENV || 'development'}\nUsage: GET /hello?age=<number> | GET /hellolog`
  );
});

module.exports = router;
