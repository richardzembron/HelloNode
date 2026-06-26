# CONTEXT.md — HelloNode Project

> Paste this file at the start of a new Claude session to resume the project.
> Last updated: 2026-06-26

---

## What this project is

A Node.js + Express web application deployed on **Fly.io** with two environments (test and production). It demonstrates a full stack with Google OAuth login, MySQL-backed sessions, and several API routes. Built entirely within a Claude session.

---

## GitHub Repository

- **Repo:** https://github.com/richardzembron/HelloNode
- **Main branch** → auto-deploys to **production**
- **Test branch** → auto-deploys to **test**
- **CI:** GitHub Actions (`.github/workflows/`)
  - `ci.yml` — runs tests on every push (Node 18, 20, 22)
  - `deploy-prod.yml` — test + deploy to prod on push to `main`
  - `deploy-test.yml` — test + deploy to test on push to `test`

---

## Live URLs

| Environment | App | URL |
|---|---|---|
| Production | `hellonodeprod` | https://hellonodeprod.fly.dev |
| Test | `hellonodetest` | https://hellonodetest.fly.dev |

---

## Infrastructure — Fly.io

Four apps on Fly.io (personal account — Richard Zembron):

| App | Purpose | Region |
|---|---|---|
| `hellonodeprod` | Node.js app — production | iad (Ashburn VA) |
| `hellonodetest` | Node.js app — test | iad |
| `hellonodeprod-db` | MySQL 8.0 — production | iad |
| `hellonodetest-db` | MySQL 8.0 — test | iad |

- Both MySQL instances have **3 GB encrypted persistent volumes**
- Both MySQL apps configured with `auto_stop_machines = false` (always-on)
- HTTPS is automatic via Fly.io edge (Let's Encrypt wildcard `*.fly.dev`)
- Node.js apps run plain HTTP on port 3000 internally; Fly terminates TLS

---

## Environment Variables (Fly.io secrets — never in code)

Set on **both** `hellonodeprod` and `hellonodetest` (with different values where noted):

| Variable | Description |
|---|---|
| `DB_HOST` | MySQL internal hostname (e.g. `hellonodeprod-db.internal`) |
| `DB_PORT` | `3306` |
| `DB_USER` | `hellonode` |
| `DB_PASSWORD` | Random — set via `flyctl secrets set` |
| `DB_NAME` | `hellonode_prod` or `hellonode_test` |
| `NODE_ENV` | `production` or `test` |
| `GOOGLE_CLIENT_ID` | `193301680305-r4tckogncfbjsoekc6i4d3er4uslfep2.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Set — do not commit |
| `GOOGLE_CALLBACK_URL` | `https://hellonodeprod.fly.dev/auth/google/callback` (or test equivalent) |
| `SESSION_SECRET` | Random 40-char string — different per environment |

**MySQL secrets** set on `hellonodeprod-db` / `hellonodetest-db`:
`MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`

To view: `flyctl secrets list --app hellonodeprod`
To update: `flyctl secrets set KEY=value --app hellonodeprod`

---

## Project Structure

```
HelloNode/
├── src/
│   ├── app.js              # Express app — session, passport, routes
│   ├── server.js           # Entry point — auto-migration then start
│   ├── db.js               # MySQL pool (lazy, falls back gracefully)
│   ├── migrate.js          # CREATE TABLE IF NOT EXISTS (runs on startup)
│   ├── middleware/
│   │   └── requireAuth.js  # Blocks unauthenticated requests → /login
│   └── routes/
│       ├── hello.js        # GET /hello?age=<n>  — plain text response
│       ├── hellolog.js     # GET /hellolog       — last 10 DB entries (JSON)
│       ├── developer.js    # GET /developer?cmd=db_schema|db_statistics
│       ├── auth.js         # GET /auth/google, /auth/google/callback, /auth/logout
│       ├── login.js        # GET /login          — blue HTML login page
│       └── dashboard.js    # GET /dashboard      — protected landing page (HTML)
├── tests/
│   └── app.test.js         # 23 Jest + Supertest tests
├── scripts/
│   └── generate-certs.js   # Local HTTPS dev certs (openssl)
├── fly/
│   ├── mysql-prod/fly.toml # Fly config for hellonodeprod-db
│   └── mysql-test/fly.toml # Fly config for hellonodetest-db
├── Dockerfile              # Multi-stage Node 20 Alpine build
├── fly.prod.toml           # Fly config for hellonodeprod
├── fly.test.toml           # Fly config for hellonodetest
├── package.json
└── .env.example
```

---

## Routes Summary

| Route | Auth | Returns | Notes |
|---|---|---|---|
| `GET /` | No | Plain text | Redirects to /dashboard if logged in |
| `GET /login` | No | HTML | Blue login page, Google OAuth button |
| `GET /auth/google` | No | 302 → Google | Starts OAuth flow |
| `GET /auth/google/callback` | No | 302 → /dashboard | OAuth callback |
| `GET /auth/logout` | No | 302 → /login | Destroys session |
| `GET /dashboard` | **Yes** | HTML | 2×4 icon grid landing page |
| `GET /hello?age=<n>` | No | Plain text | `Hello World. World is N billion years old` — logs to DB |
| `GET /hellolog` | No | JSON | Last 10 `hello_log` rows + `query_ts` |
| `GET /developer?cmd=db_schema` | No | JSON | All tables + field definitions |
| `GET /developer?cmd=db_statistics` | No | JSON | Row counts, sizes, DB version, uptime |

---

## Database Schema

```sql
-- Auto-created by src/migrate.js on every startup
CREATE TABLE IF NOT EXISTS hello_log (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  age        DECIMAL(10, 3) NOT NULL,
  message    VARCHAR(255)   NOT NULL,
  created_at DATETIME       NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Auto-created by express-mysql-session
CREATE TABLE IF NOT EXISTS sessions (
  session_id  VARCHAR(128) NOT NULL PRIMARY KEY,
  expires     INT UNSIGNED NOT NULL,
  data        MEDIUMTEXT         -- JSON: passport user object
);
```

---

## Authentication — Google OAuth + Server-Side Sessions

- **Library:** `passport` + `passport-google-oauth20`
- **Sessions:** `express-session` + `express-mysql-session` (stored in MySQL)
- **Cookie name:** `hellonode.sid` — HttpOnly, Secure (prod), SameSite=Lax, 24h
- **Key setting:** `app.set('trust proxy', 1)` — required for Fly.io HTTPS edge
  (without it, `req.secure=false` and session cookies are never sent)
- `serializeUser` / `deserializeUser` store the full user object `{ googleId, email, name, picture }`
- Google OAuth app registered at https://console.cloud.google.com
- Authorised redirect URIs registered for both test and prod callback URLs

---

## Key Technical Decisions

| Decision | Reason |
|---|---|
| `npm install` not `npm ci` | No `package-lock.json` committed |
| `trust proxy: 1` | Fly.io terminates TLS at edge; app runs HTTP internally |
| `auto_stop_machines = false` on MySQL | Databases must not sleep |
| Lazy DB pool (`getPool()`) | Tests run without DB — pool returns null, routes degrade gracefully |
| Migration on startup | Idempotent `CREATE TABLE IF NOT EXISTS` — no manual migration step |
| Separate session secret per env | Prod and test sessions are fully isolated |
| `GOOGLE_CALLBACK_URL` as env var | Same codebase, different callback per environment |

---

## Local Development

```bash
git clone https://github.com/richardzembron/HelloNode
cd HelloNode
npm install
cp .env.example .env        # fill in DB_* and SESSION_SECRET
npm run generate-certs       # optional — needs openssl
npm start                    # runs on http://localhost:3000 (or https://:3443 with certs)
npm test                     # 23 tests, no DB required
```

---

## Deployment Workflow

```
# Deploy to test only:
git checkout test
git merge main               # or make changes directly
git push origin test         # → GitHub Actions runs tests → deploys to hellonodetest

# Promote test → production:
git checkout main
git merge test
git push origin main         # → GitHub Actions runs tests → deploys to hellonodeprod
```

---

## Fly.io CLI Quick Reference

```bash
flyctl logs --app hellonodeprod          # live logs
flyctl status --app hellonodeprod        # machine health
flyctl secrets list --app hellonodeprod  # list secret names (not values)
flyctl secrets set KEY=val --app hellonodeprod  # add/update a secret
flyctl machine list --app hellonodeprod  # see running machines + image versions
flyctl apps list                         # all 4 apps
```

---

## What Works (as of last session)

- ✅ Google OAuth login on both test and prod
- ✅ Server-side sessions stored in MySQL
- ✅ Protected `/dashboard` landing page with 2×4 icon grid
- ✅ `/hello`, `/hellolog`, `/developer` routes
- ✅ MySQL auto-migration on startup
- ✅ GitHub Actions CI/CD pipeline
- ✅ Both MySQL instances always-on
- ✅ 23 passing tests

## What's Next (suggestions)

- The 8 dashboard tiles (App, Source, Database, Formats, Functions, Documents, Status, Log) currently link to `#` — they need real pages/routes wired up
- No user table yet — users are not persisted to DB, only held in session
- No role-based access control
- The `/developer` route has no auth — consider protecting it with `requireAuth`
