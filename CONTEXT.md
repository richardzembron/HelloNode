# CONTEXT.md — HelloNode Project

> Paste this file at the start of a new Claude session to resume the project.
> Last updated: 2026-06-26

---

## What this project is

A Node.js + Express web application deployed on **Fly.io** with two environments (test and production). It has Google OAuth login, MySQL-backed sessions, a user account table, an environment settings table, and several API + HTML routes. Built entirely within Claude sessions.

---

## GitHub Repository

- **Repo:** https://github.com/richardzembron/HelloNode
- **Main branch** → auto-deploys to **production**
- **Test branch** → auto-deploys to **test**
- **Both branches are always in sync** — main is reset to match test after each feature
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

Four apps (personal account — Richard Zembron):

| App | Purpose | Region |
|---|---|---|
| `hellonodeprod` | Node.js app — production | iad (Ashburn VA) |
| `hellonodetest` | Node.js app — test | iad |
| `hellonodeprod-db` | MySQL 8.0 — production | iad |
| `hellonodetest-db` | MySQL 8.0 — test | iad |

- Both MySQL instances have **3 GB encrypted persistent volumes**
- Both MySQL apps: `auto_stop_machines = false` (always-on)
- Node.js test app: `auto_stop_machines = true` (sleeps when idle, wakes in ~2s)
- Node.js prod app: `auto_stop_machines = false`, `min_machines_running = 1`
- HTTPS automatic via Fly.io edge (Let's Encrypt `*.fly.dev`)
- Node.js apps run plain HTTP on port 3000 internally; Fly terminates TLS

---

## Environment Variables (Fly.io secrets — never in code)

Set on both `hellonodeprod` and `hellonodetest`:

| Variable | Description |
|---|---|
| `DB_HOST` | MySQL internal hostname (`hellonodeprod-db.internal`) |
| `DB_PORT` | `3306` |
| `DB_USER` | `hellonode` |
| `DB_PASSWORD` | Random — set via `flyctl secrets set` |
| `DB_NAME` | `hellonode_prod` or `hellonode_test` |
| `NODE_ENV` | `production` or `test` |
| `GOOGLE_CLIENT_ID` | `193301680305-r4tckogncfbjsoekc6i4d3er4uslfep2.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Set — do not commit |
| `GOOGLE_CALLBACK_URL` | `https://hellonodeprod.fly.dev/auth/google/callback` (env-specific) |
| `SESSION_SECRET` | Random 40-char string — different per environment |

MySQL secrets on `hellonodeprod-db` / `hellonodetest-db`:
`MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`

```bash
flyctl secrets list --app hellonodeprod          # view names (not values)
flyctl secrets set KEY=value --app hellonodeprod # add/update
```

---

## Project Structure

```
HelloNode/
├── src/
│   ├── app.js              # Express app — trust proxy, session, passport, routes
│   │                       # Also: POST /auth/test-login (non-production only, for tests)
│   ├── server.js           # Entry point — auto-migration then start
│   ├── db.js               # MySQL pool (lazy, graceful fallback when no DB)
│   ├── migrate.js          # Creates all tables + seeds environment rows
│   ├── middleware/
│   │   └── requireAuth.js  # Blocks unauthenticated requests → /login
│   └── routes/
│       ├── hello.js        # GET /hello?age=<n>
│       ├── hellolog.js     # GET /hellolog
│       ├── developer.js    # GET /developer?cmd=... | POST /developer?cmd=db_cmd
│       ├── auth.js         # Google OAuth + useraccounts upsert + limit check
│       ├── login.js        # GET /login
│       ├── dashboard.js    # GET /dashboard  (protected)
│       └── problem.js      # GET /problem?msg=<text>
├── tests/
│   └── app.test.js         # 50 Jest + Supertest tests
├── scripts/
│   └── generate-certs.js   # Local HTTPS dev certs (openssl)
├── fly/
│   ├── mysql-prod/fly.toml
│   └── mysql-test/fly.toml
├── Dockerfile
├── fly.prod.toml
├── fly.test.toml
├── package.json
├── .env.example
└── CONTEXT.md
```

---

## Routes Summary

| Route | Method | Auth | Returns | Notes |
|---|---|---|---|---|
| `/` | GET | No | Text | Redirects to `/dashboard` if logged in |
| `/login` | GET | No | HTML | Blue login page — Google button → `/auth/google` |
| `/auth/google` | GET | No | 302 → Google | Starts OAuth flow |
| `/auth/google/callback` | GET | No | 302 | OAuth callback — checks limit → `/dashboard` or `/problem` |
| `/auth/logout` | GET | No | 302 → `/login` | Destroys session + clears cookie |
| `/auth/test-login` | POST | No | JSON | **Non-production only** — injects test session for Jest tests |
| `/dashboard` | GET | **Yes** | HTML | 2×4 icon grid landing page; tiles link to `#` (not wired yet) |
| `/problem?msg=<text>` | GET | No | HTML | General error page — button context-aware (login vs dashboard) |
| `/hello?age=<n>` | GET | No | Plain text | `Hello World. World is N billion years old` — logs to DB |
| `/hellolog` | GET | No | JSON | Last 10 `hello_log` rows + `query_ts` |
| `/developer?cmd=db` | GET | **Yes** | HTML | Database Management page — table browser |
| `/developer?cmd=db_schema` | GET | No | JSON | All tables + field definitions |
| `/developer?cmd=db_statistics` | GET | No | JSON | Row counts, sizes, DB version, uptime, table count |
| `/developer?cmd=db_console` | GET | **Yes** | HTML | Interactive SQL console (dark terminal UI) |
| `/developer?cmd=db_cmd` | POST | **Yes** | JSON | Executes SQL — vetted by `vetSQL()` |

---

## Database Schema

All tables created by `src/migrate.js` on every startup (`CREATE TABLE IF NOT EXISTS` — idempotent).

```sql
-- Request log
CREATE TABLE hello_log (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  age        DECIMAL(10, 3) NOT NULL,
  message    VARCHAR(255)   NOT NULL,
  created_at DATETIME       NOT NULL
);

-- Google OAuth users — one row per account
CREATE TABLE useraccounts (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  google_id       VARCHAR(64)   NOT NULL,  -- permanent Google ID — never changes
  email           VARCHAR(255)  NOT NULL,  -- overwritten every login
  name            VARCHAR(255)  NOT NULL,  -- overwritten every login
  picture_url     VARCHAR(500)  DEFAULT NULL, -- overwritten every login
  first_login_at  DATETIME      NOT NULL,  -- set once, never updated
  last_login_at   DATETIME      NOT NULL,  -- updated every login
  login_count     INT UNSIGNED  NOT NULL DEFAULT 1,
  UNIQUE KEY uq_google_id (google_id)
);

-- App-wide key/value settings
CREATE TABLE environment (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  name    VARCHAR(100) NOT NULL,
  content TEXT         NOT NULL,
  UNIQUE KEY uq_name (name)
);

-- Seeded rows (INSERT IGNORE — safe to re-run)
INSERT IGNORE INTO environment (name, content) VALUES ('maxuseraccounts', '1');

-- Auto-created by express-mysql-session
CREATE TABLE sessions (
  session_id  VARCHAR(128) NOT NULL PRIMARY KEY,
  expires     INT UNSIGNED NOT NULL,
  data        MEDIUMTEXT
);
```

---

## Authentication — Google OAuth + Server-Side Sessions

- **Library:** `passport` + `passport-google-oauth20`
- **Sessions:** `express-session` + `express-mysql-session` (stored in MySQL)
- **Cookie name:** `hellonode.sid` — HttpOnly, Secure (prod), SameSite=Lax, 24h
- **Key setting:** `app.set('trust proxy', 1)` — required for Fly.io HTTPS edge
- `serializeUser` / `deserializeUser` store full user object in session

### Session user object (`req.user`)
```js
{
  googleId: "117834291048573920154",  // permanent Google ID
  email:    "user@gmail.com",
  name:     "Full Name",
  picture:  "https://lh3.googleusercontent.com/...",
  localId:  42,          // row id in useraccounts table
  blocked:  false,       // true if maxuseraccounts limit was hit
}
```

### Login flow with maxuseraccounts check
```
1. User clicks "Continue with Google" → /auth/google
2. Google OAuth → /auth/google/callback
3. Passport verifies profile
4. Check if google_id exists in useraccounts:
   - Existing user → upsert (update fields) → /dashboard
   - New user → check environment.maxuseraccounts vs COUNT(useraccounts)
       - count >= max → user.blocked = true → /problem?msg=Sorry...
       - count < max  → upsert (insert) → /dashboard
5. Session created, cookie set
```

To allow more users:
```sql
UPDATE environment SET content = '10' WHERE name = 'maxuseraccounts';
```

---

## Developer Routes

### `GET /developer?cmd=db` ⚠️ Auth required
Database Management page. Blue glassmorphism UI matching the dashboard style.
- Topbar: logo (links to `/dashboard`), breadcrumb, user avatar + name, `← Dashboard` button
- **Tables** dropdown — populated on load by fetching `db_schema` + `db_statistics` in parallel
- On table select → shows 4 summary pills: **Table name**, **Fields**, **Rows**, **Size (kB)**
- Excel-style field definition table: **Field Name** (mono), **Primary** (PK badge), **Type** (mono), **Size**
- Loading spinner, empty state, error banner if DB unavailable

### `GET /developer?cmd=db_console` ⚠️ Auth required
Interactive SQL console. Dark terminal UI, same background as dashboard.
- SQL input textarea (Ctrl+Enter to run)
- Results displayed as formatted text table
- Calls `POST /developer?cmd=db_cmd` via `fetch`

### `POST /developer?cmd=db_cmd` ⚠️ Auth required
Executes SQL against the database.

**Request:** `{ "sql": "SELECT * FROM hello_log LIMIT 5" }`

**Response types:**
- `{ type: "select", rows: [...], rowCount: N }` — SELECT/SHOW/DESCRIBE
- `{ type: "write", affectedRows: N, insertId: N }` — INSERT/UPDATE/DELETE
- `{ type: "ddl", message: "Query executed successfully" }` — CREATE/ALTER/DROP
- `{ error: "..." }` — DB errors (HTTP 200, shown as result in console)
- HTTP 400 — missing/blank SQL, not an SQL keyword
- HTTP 403 — blocked by `vetSQL()`
- HTTP 503 — DB unavailable

### `GET /developer?cmd=db_schema` — public
### `GET /developer?cmd=db_statistics` — public

### `vetSQL(sql)` — security gate (`src/routes/developer.js`)
```js
function vetSQL(sql) {
  const upper = sql.trim().toUpperCase();
  if (upper.startsWith('DELETE EVERYTHING')) return false;
  return true;
  // Expand this function to add stricter rules
}
```

---

## Problem Page

`GET /problem?msg=<url-encoded-text>`

- Blue background (same as dashboard/login)
- 🙏 emoji in 128×128 tile
- `"Sorry, ran into a problem"` heading
- `msg` parameter displayed (HTML-escaped — XSS safe)
- Smart button: logged in → **"Go to Dashboard"**, not logged in → **"Go to Login"**
- Default message if `msg` absent: `"An unexpected error occurred."`

---

## Testing

- **50 tests** — Jest + Supertest, no DB required
- `POST /auth/test-login` — test-only route (active when `NODE_ENV !== 'production'`) that injects a passport session directly, allowing authenticated route tests without a real OAuth flow
- Tests use `request.agent(app)` to maintain session cookies across requests
- All protected routes (`db`, `db_console`, `db_cmd`) have both unauthenticated (302) and authenticated tests

```bash
npm test   # runs all 50 tests
```

---

## Key Technical Decisions

| Decision | Reason |
|---|---|
| `app.set('trust proxy', 1)` | Fly.io terminates TLS at edge; without this `req.secure=false` and session cookies fail |
| `npm install` not `npm ci` | No `package-lock.json` committed; `cache: "npm"` removed from CI workflows |
| `auto_stop_machines = false` on MySQL | Databases must not sleep |
| Lazy DB pool (`getPool()`) | Tests run without DB — pool returns null, routes degrade gracefully |
| Migration on startup | Idempotent `CREATE TABLE IF NOT EXISTS` — no manual step needed |
| `INSERT IGNORE` for seed data | Re-running migration never overwrites values changed at runtime |
| `LAST_INSERT_ID(id)` in upsert | Returns existing row's id reliably on `ON DUPLICATE KEY UPDATE` |
| Separate `SESSION_SECRET` per env | Prod and test sessions fully isolated |
| `vetSQL()` placeholder | SQL execution gated — expand with stricter rules later |
| HTML-escape on `/problem` | XSS prevention — `msg` param is user-visible |
| `user.blocked` flag | Set in passport strategy; checked in route handler to redirect to `/problem` |
| Auth guard inline for `db`/`db_console` | `if (!req.isAuthenticated()) return res.redirect('/login')` inside GET handler |
| Auth guard as middleware for `db_cmd` | `router.post('/', requireAuth, ...)` — cleaner for the POST route |
| `POST /auth/test-login` gated by `NODE_ENV` | Enables authenticated Jest tests without exposing a backdoor in production |

---

## Local Development

```bash
git clone https://github.com/richardzembron/HelloNode
cd HelloNode
npm install
cp .env.example .env        # fill in DB_* and SESSION_SECRET
npm run generate-certs       # optional — needs openssl
npm start                    # http://localhost:3000 (or https://:3443 with certs)
npm test                     # 50 tests, no DB required
```

---

## Deployment Workflow

Both `main` and `test` branches are kept in sync. Features are built on `test`, then `main` is force-reset to match:

```bash
# Push to test (triggers CI → deploy to hellonodetest):
git push origin test

# Sync main to match test exactly (triggers CI → deploy to hellonodeprod):
git push origin test:main --force   # or reset main locally then push
```

---

## Fly.io CLI Quick Reference

```bash
flyctl logs --app hellonodeprod          # live logs
flyctl status --app hellonodeprod        # machine health
flyctl machine list --app hellonodeprod  # image versions per machine
flyctl secrets list --app hellonodeprod  # list secret names (not values)
flyctl secrets set KEY=val --app hellonodeprod
flyctl apps list                         # all 4 apps
```

---

## What Works (as of last session)

- ✅ Google OAuth login on both test and prod
- ✅ Server-side sessions stored in MySQL (`sessions` table)
- ✅ `useraccounts` table — upsert on every login (insert new, update returning)
- ✅ `environment` table — key/value app settings, seeded with `maxuseraccounts=1`
- ✅ `maxuseraccounts` limit enforced on new user login → `/problem` page
- ✅ `/problem?msg=<text>` — general error page, XSS-safe, context-aware button
- ✅ `/dashboard` — protected landing page with 2×4 icon grid
- ✅ `/hello`, `/hellolog`
- ✅ `/developer?cmd=db` — Database Management page (table browser, field inspector)
- ✅ `/developer?cmd=db_schema`, `db_statistics` — public JSON endpoints
- ✅ `/developer?cmd=db_console` — SQL console, auth-protected
- ✅ `/developer?cmd=db_cmd` (POST) — SQL execution, auth-protected, vetted by `vetSQL()`
- ✅ GitHub Actions CI/CD (test + prod pipelines, using `npm install`)
- ✅ Both MySQL instances always-on
- ✅ 50 passing tests

---

## What's Next (suggestions)

- **Raise `maxuseraccounts`** — currently `1`; run `UPDATE environment SET content = '10' WHERE name = 'maxuseraccounts'` in the DB console
- **Wire up dashboard tiles** — 8 tiles (App, Source, Database, Formats, Functions, Documents, Status, Log) link to `#` — need real routes; Database tile could link to `/developer?cmd=db`
- **User role/permissions** — `useraccounts` has no role field yet; could add `role` enum (`admin`, `user`) for access control
- **Stricter `vetSQL()`** — currently only blocks `DELETE EVERYTHING`; could add rules to block DROP, TRUNCATE, etc.
