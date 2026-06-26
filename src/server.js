'use strict';

require('dotenv').config();

const http               = require('http');
const app                = require('./app');
const { testConnection } = require('./db');

const fs   = require('fs');
const path = require('path');

const HTTP_PORT  = process.env.HTTP_PORT  || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

const certDir  = path.join(__dirname, '..', 'certs');
const keyFile  = path.join(certDir, 'server.key');
const certFile = path.join(certDir, 'server.crt');

// Test DB connection on startup
testConnection();

if (fs.existsSync(keyFile) && fs.existsSync(certFile)) {
  const https = require('https');
  const sslOptions = {
    key:  fs.readFileSync(keyFile),
    cert: fs.readFileSync(certFile),
  };
  https.createServer(sslOptions, app).listen(HTTPS_PORT, () => {
    console.log(`✅  HTTPS server listening on https://localhost:${HTTPS_PORT}`);
  });
  http.createServer((req, res) => {
    const httpsUrl = `https://${req.headers.host.split(':')[0]}:${HTTPS_PORT}${req.url}`;
    res.writeHead(301, { Location: httpsUrl });
    res.end();
  }).listen(HTTP_PORT, () => {
    console.log(`↪   HTTP redirect on http://localhost:${HTTP_PORT} → HTTPS`);
  });
} else {
  // Fly.io / production: plain HTTP, TLS handled at Fly edge
  app.listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`✅  HTTP server listening on port ${HTTP_PORT} (TLS at Fly.io edge)`);
  });
}
