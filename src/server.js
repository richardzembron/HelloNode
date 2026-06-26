'use strict';

require('dotenv').config();

const fs    = require('fs');
const path  = require('path');
const https = require('https');
const http  = require('http');
const app   = require('./app');

const HTTP_PORT  = process.env.HTTP_PORT  || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

const certDir  = path.join(__dirname, '..', 'certs');
const keyFile  = path.join(certDir, 'server.key');
const certFile = path.join(certDir, 'server.crt');

if (fs.existsSync(keyFile) && fs.existsSync(certFile)) {
  const sslOptions = {
    key:  fs.readFileSync(keyFile),
    cert: fs.readFileSync(certFile),
  };

  https.createServer(sslOptions, app).listen(HTTPS_PORT, () => {
    console.log(`HTTPS server listening on https://localhost:${HTTPS_PORT}`);
  });

  http.createServer((req, res) => {
    const httpsUrl = `https://${req.headers.host.split(':')[0]}:${HTTPS_PORT}${req.url}`;
    res.writeHead(301, { Location: httpsUrl });
    res.end();
  }).listen(HTTP_PORT, () => {
    console.log(`HTTP redirect on http://localhost:${HTTP_PORT} -> HTTPS`);
  });

} else {
  console.warn('WARNING: SSL certificates not found in ./certs - falling back to plain HTTP.');
  console.warn('Run: npm run generate-certs');
  app.listen(HTTP_PORT, () => {
    console.log(`HTTP server listening on http://localhost:${HTTP_PORT}`);
  });
}
