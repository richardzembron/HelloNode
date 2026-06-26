'use strict';

require('dotenv').config();

const http               = require('http');
const fs                 = require('fs');
const path               = require('path');
const app                = require('./app');
const { testConnection } = require('./db');
const { runMigration }   = require('./migrate');

const HTTP_PORT  = process.env.HTTP_PORT  || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

const certDir  = path.join(__dirname, '..', 'certs');
const keyFile  = path.join(certDir, 'server.key');
const certFile = path.join(certDir, 'server.crt');

async function start() {
  // 1. Verify DB connection
  await testConnection();

  // 2. Run DB migration (CREATE TABLE IF NOT EXISTS — safe to run every boot)
  await runMigration();

  // 3. Start HTTP(S) server
  if (fs.existsSync(keyFile) && fs.existsSync(certFile)) {
    const https = require('https');
    const sslOptions = {
      key:  fs.readFileSync(keyFile),
      cert: fs.readFileSync(certFile),
    };
    https.createServer(sslOptions, app).listen(HTTPS_PORT, () => {
      console.log(`\u2705  HTTPS server listening on https://localhost:${HTTPS_PORT}`);
    });
    http.createServer((req, res) => {
      const httpsUrl = `https://${req.headers.host.split(':')[0]}:${HTTPS_PORT}${req.url}`;
      res.writeHead(301, { Location: httpsUrl });
      res.end();
    }).listen(HTTP_PORT, () => {
      console.log(`\u21aa   HTTP redirect on http://localhost:${HTTP_PORT} \u2192 HTTPS`);
    });
  } else {
    app.listen(HTTP_PORT, '0.0.0.0', () => {
      console.log(`\u2705  HTTP server listening on port ${HTTP_PORT} (TLS at Fly.io edge)`);
    });
  }
}

start().catch(err => {
  console.error('\u274c  Failed to start server:', err.message);
  process.exit(1);
});
