#!/usr/bin/env node
'use strict';

/**
 * Generates a self-signed TLS certificate for local HTTPS development.
 * Requires openssl on PATH.
 * Usage: npm run generate-certs
 */

const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const certDir  = path.join(__dirname, '..', 'certs');
const keyFile  = path.join(certDir, 'server.key');
const certFile = path.join(certDir, 'server.crt');

if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true });

if (fs.existsSync(keyFile) && fs.existsSync(certFile)) {
  console.log('Certificates already exist in ./certs - skipping generation.');
  process.exit(0);
}

console.log('Generating self-signed certificate (valid 365 days)...');

try {
  execSync(
    `openssl req -x509 -newkey rsa:2048 -keyout "${keyFile}" -out "${certFile}" \
     -days 365 -nodes -subj "/C=US/ST=Dev/L=Local/O=HelloNode/CN=localhost"`,
    { stdio: 'inherit' }
  );
  console.log('Certificate : ' + certFile);
  console.log('Private key : ' + keyFile);
  console.log('WARNING: Self-signed - browsers will show a security warning.');
  console.log('For production use certificates from a trusted CA (e.g. Lets Encrypt).');
} catch (err) {
  console.error('ERROR: openssl not available. Install openssl and try again.');
  process.exit(1);
}
