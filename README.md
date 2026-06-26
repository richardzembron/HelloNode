# HelloNode

A minimal **Node.js + Express** HTTPS web application that greets the world and tells you how old it is.

[![CI](https://github.com/richardzembron/HelloNode/actions/workflows/ci.yml/badge.svg)](https://github.com/richardzembron/HelloNode/actions/workflows/ci.yml)

---

## Features

| Feature | Detail |
|---|---|
| Framework | Express 4 |
| Transport | **HTTPS** (self-signed for dev, CA-signed for prod) |
| Route | `GET /hello?age=<number>` |
| Response | `Hello World. World is <age> billion years old` (plain text) |
| Testing | Jest + Supertest |
| CI | GitHub Actions (Node 18, 20, 22) |

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Generate self-signed SSL certificates
```bash
npm run generate-certs
```
> Requires `openssl` on your PATH. Certificates are written to `./certs/` (git-ignored).

### 3. Configure environment (optional)
```bash
cp .env.example .env
```

### 4. Start the server
```bash
npm start
```

The server starts on:
- `https://localhost:3443` — HTTPS
- `http://localhost:3000`  — redirects to HTTPS

---

## API

### GET /hello?age=\<number\>

**Success — HTTP 200**
```
Hello World. World is 4.543 billion years old
```

**Error — HTTP 400 (missing age)**
```
Error: Missing required query parameter: age
Example: /hello?age=4.5
```

**Example requests**
```bash
curl -k "https://localhost:3443/hello?age=4.543"
curl "http://localhost:3000/hello?age=13.8"
```

---

## Running Tests
```bash
npm test
```

---

## Project Structure
```
HelloNode/
├── src/
│   ├── app.js            # Express application
│   ├── server.js         # HTTPS/HTTP server entry point
│   └── routes/
│       └── hello.js      # /hello route handler
├── tests/
│   └── app.test.js       # Jest + Supertest test suite
├── scripts/
│   └── generate-certs.js # Self-signed certificate generator
├── .github/
│   └── workflows/
│       └── ci.yml        # GitHub Actions CI pipeline
├── .env.example
├── .gitignore
└── package.json
```
