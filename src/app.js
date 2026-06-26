'use strict';

const express     = require('express');
const helloRouter = require('./routes/hello');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/', helloRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).type('text').send('Error: Not Found');
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).type('text').send('Error: Internal Server Error');
});

module.exports = app;
