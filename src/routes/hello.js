'use strict';

const { Router } = require('express');
const router = Router();

/**
 * GET /hello?age=<number>
 * Returns plain text: "Hello World. World is <age> billion years old"
 */
router.get('/hello', (req, res) => {
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

  return res.status(200).type('text').send(
    `Hello World. World is ${ageNumber} billion years old`
  );
});

/**
 * GET /
 * Health-check route.
 */
router.get('/', (req, res) => {
  res.status(200).type('text').send(
    'HelloNode is running.\nUsage: GET /hello?age=<number>'
  );
});

module.exports = router;
