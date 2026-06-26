'use strict';

const express          = require('express');
const helloRouter      = require('./routes/hello');
const hellologRouter   = require('./routes/hellolog');
const developerRouter  = require('./routes/developer');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/hello',     helloRouter);
app.use('/hellolog',  hellologRouter);
app.use('/developer', developerRouter);

// Health check
app.get('/', (req, res) => {
  res.status(200).type('text').send(
    `HelloNode is running.\nEnvironment: ${process.env.NODE_ENV || 'development'}\nUsage: GET /hello?age=<number> | GET /hellolog | GET /developer?cmd=<command>`
  );
});

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
