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
router.get('/', async (req, res) => {
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

module.exports = router;
