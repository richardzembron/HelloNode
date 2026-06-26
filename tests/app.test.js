'use strict';

const request = require('supertest');
const app     = require('../src/app');

describe('GET /', () => {
  it('returns 200 with plain text status', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.type).toMatch(/text/);
    expect(res.text).toMatch(/HelloNode is running/i);
  });
});

describe('GET /hello', () => {
  it('returns plain text Hello World message with integer age', async () => {
    const res = await request(app).get('/hello?age=4');
    expect(res.statusCode).toBe(200);
    expect(res.type).toMatch(/text/);
    expect(res.text).toBe('Hello World. World is 4 billion years old');
  });
  it('returns plain text Hello World message with decimal age', async () => {
    const res = await request(app).get('/hello?age=4.543');
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('Hello World. World is 4.543 billion years old');
  });
  it('returns plain text Hello World message with age=0', async () => {
    const res = await request(app).get('/hello?age=0');
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('Hello World. World is 0 billion years old');
  });
  it('returns 400 when age parameter is missing', async () => {
    const res = await request(app).get('/hello');
    expect(res.statusCode).toBe(400);
    expect(res.type).toMatch(/text/);
    expect(res.text).toMatch(/Missing required query parameter/i);
  });
  it('returns 400 for non-numeric age', async () => {
    const res = await request(app).get('/hello?age=abc');
    expect(res.statusCode).toBe(400);
    expect(res.text).toMatch(/Invalid value/i);
  });
  it('returns 400 for negative age', async () => {
    const res = await request(app).get('/hello?age=-1');
    expect(res.statusCode).toBe(400);
    expect(res.text).toMatch(/Invalid value/i);
  });
});

describe('GET /hellolog', () => {
  it('returns JSON with query_ts field', async () => {
    const before = new Date();
    const res = await request(app).get('/hellolog');
    const after = new Date();
    expect([200, 503]).toContain(res.statusCode);
    expect(res.type).toMatch(/json/);
    expect(res.body).toHaveProperty('query_ts');
    const ts = new Date(res.body.query_ts);
    expect(ts.getTime()).toBeGreaterThanOrEqual(before.getTime() - 10);
    expect(ts.getTime()).toBeLessThanOrEqual(after.getTime() + 10);
  });
  it('returns 503 with error when DB is unavailable', async () => {
    const res = await request(app).get('/hellolog');
    expect(res.statusCode).toBe(503);
    expect(res.body.error).toMatch(/database not available/i);
  });
  it('returns correct JSON shape when DB is available', async () => {
    const pool = require('../src/db').getPool();
    if (!pool) return;
    const res = await request(app).get('/hellolog');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.entries)).toBe(true);
  });
});

describe('GET /developer', () => {
  it('returns 400 when cmd is missing', async () => {
    const res = await request(app).get('/developer');
    expect(res.statusCode).toBe(400);
    expect(res.type).toMatch(/json/);
    expect(res.body.error).toMatch(/missing required query parameter/i);
    expect(res.body.valid_commands).toEqual(['db_schema', 'db_statistics', 'db_console']);
  });
  it('returns 400 for an unknown cmd', async () => {
    const res = await request(app).get('/developer?cmd=drop_everything');
    expect(res.statusCode).toBe(400);
    expect(res.type).toMatch(/json/);
    expect(res.body.error).toMatch(/unknown command/i);
    expect(res.body.valid_commands).toEqual(['db_schema', 'db_statistics', 'db_console']);
  });
  it('returns query_ts on every response', async () => {
    const before = new Date();
    const res = await request(app).get('/developer?cmd=db_schema');
    const after = new Date();
    expect(res.body).toHaveProperty('query_ts');
    const ts = new Date(res.body.query_ts);
    expect(ts.getTime()).toBeGreaterThanOrEqual(before.getTime() - 10);
    expect(ts.getTime()).toBeLessThanOrEqual(after.getTime() + 10);
  });
  it('returns 503 when DB is unavailable (db_schema)', async () => {
    const pool = require('../src/db').getPool(); if (pool) return;
    const res = await request(app).get('/developer?cmd=db_schema');
    expect(res.statusCode).toBe(503);
    expect(res.body.error).toMatch(/database not available/i);
  });
  it('returns 503 when DB is unavailable (db_statistics)', async () => {
    const pool = require('../src/db').getPool(); if (pool) return;
    const res = await request(app).get('/developer?cmd=db_statistics');
    expect(res.statusCode).toBe(503);
    expect(res.body.error).toMatch(/database not available/i);
  });
  it('returns correct schema shape when DB is available', async () => {
    const pool = require('../src/db').getPool(); if (!pool) return;
    const res = await request(app).get('/developer?cmd=db_schema');
    expect(res.statusCode).toBe(200);
    expect(res.body.cmd).toBe('db_schema');
    expect(Array.isArray(res.body.schema)).toBe(true);
    const table = res.body.schema[0];
    expect(table).toHaveProperty('table');
    expect(Array.isArray(table.fields)).toBe(true);
  });
  it('returns correct statistics shape when DB is available', async () => {
    const pool = require('../src/db').getPool(); if (!pool) return;
    const res = await request(app).get('/developer?cmd=db_statistics');
    expect(res.statusCode).toBe(200);
    expect(res.body.cmd).toBe('db_statistics');
    expect(res.body).toHaveProperty('server');
    expect(res.body.server).toHaveProperty('version');
    expect(res.body.server).toHaveProperty('release_date');
    expect(res.body.server).toHaveProperty('uptime_seconds');
    expect(res.body.server).toHaveProperty('table_count');
    expect(typeof res.body.server.uptime_seconds).toBe('number');
    expect(typeof res.body.server.table_count).toBe('number');
    expect(Array.isArray(res.body.tables)).toBe(true);
  });
  it('redirects to /login for db_console when not authenticated', async () => {
    const res = await request(app).get('/developer?cmd=db_console');
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/login');
  });
  it('returns HTML for db_console when authenticated', async () => {
    const agent = request.agent(app);
    await agent.post('/auth/test-login');
    const res = await agent.get('/developer?cmd=db_console');
    expect(res.statusCode).toBe(200);
    expect(res.type).toMatch(/html/);
    expect(res.text).toMatch(/Database Console/i);
    expect(res.text).toMatch(/sql-input/);
    expect(res.text).toMatch(/execute-btn/);
  });
});

describe('POST /developer?cmd=db_cmd', () => {
  it('redirects to /login when not authenticated', async () => {
    const res = await request(app).post('/developer?cmd=db_cmd').send({ sql: 'SELECT 1' });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/login');
  });
  it('returns 400 for unknown POST cmd', async () => {
    const agent = request.agent(app); await agent.post('/auth/test-login');
    const res = await agent.post('/developer?cmd=bad').send({ sql: 'SELECT 1' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/unknown post command/i);
  });
  it('returns 400 when sql is missing', async () => {
    const agent = request.agent(app); await agent.post('/auth/test-login');
    const res = await agent.post('/developer?cmd=db_cmd').send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/missing or empty/i);
  });
  it('returns 400 when sql is blank', async () => {
    const agent = request.agent(app); await agent.post('/auth/test-login');
    const res = await agent.post('/developer?cmd=db_cmd').send({ sql: '   ' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/missing or empty/i);
  });
  it('returns 400 when input is not an SQL keyword', async () => {
    const agent = request.agent(app); await agent.post('/auth/test-login');
    const res = await agent.post('/developer?cmd=db_cmd').send({ sql: 'hello world' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/recognised sql keyword/i);
  });
  it('returns 403 for vetSQL-blocked command', async () => {
    const agent = request.agent(app); await agent.post('/auth/test-login');
    const res = await agent.post('/developer?cmd=db_cmd')
      .send({ sql: 'DELETE EVERYTHING FROM universe' });
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe('Not Permitted');
  });
  it('vetSQL passes a normal DELETE (no DB → 503, not 403)', async () => {
    const pool = require('../src/db').getPool(); if (pool) return;
    const agent = request.agent(app); await agent.post('/auth/test-login');
    const res = await agent.post('/developer?cmd=db_cmd')
      .send({ sql: 'DELETE FROM hello_log WHERE id = 0' });
    expect(res.statusCode).toBe(503);
  });
  it('returns 503 when DB is unavailable', async () => {
    const pool = require('../src/db').getPool(); if (pool) return;
    const agent = request.agent(app); await agent.post('/auth/test-login');
    const res = await agent.post('/developer?cmd=db_cmd').send({ sql: 'SELECT 1' });
    expect(res.statusCode).toBe(503);
    expect(res.body.error).toMatch(/database not available/i);
  });
  it('includes query_ts on every response', async () => {
    const agent = request.agent(app); await agent.post('/auth/test-login');
    const before = new Date();
    const res = await agent.post('/developer?cmd=db_cmd').send({ sql: '   ' });
    const after = new Date();
    expect(res.body).toHaveProperty('query_ts');
    const ts = new Date(res.body.query_ts);
    expect(ts.getTime()).toBeGreaterThanOrEqual(before.getTime() - 10);
    expect(ts.getTime()).toBeLessThanOrEqual(after.getTime() + 10);
  });
  it('returns type=select for SELECT when DB available', async () => {
    const pool = require('../src/db').getPool(); if (!pool) return;
    const agent = request.agent(app); await agent.post('/auth/test-login');
    const res = await agent.post('/developer?cmd=db_cmd').send({ sql: 'SELECT 1 AS n' });
    expect(res.statusCode).toBe(200);
    expect(res.body.type).toBe('select');
    expect(Array.isArray(res.body.rows)).toBe(true);
    expect(res.body.rows[0].n).toBe(1);
  });
});

describe('GET /login', () => {
  it('returns 200 with HTML content type', async () => {
    const res = await request(app).get('/login');
    expect(res.statusCode).toBe(200);
    expect(res.type).toMatch(/html/);
  });
  it('contains the Sign In heading', async () => {
    const res = await request(app).get('/login');
    expect(res.text).toMatch(/Sign in to Your Account/i);
  });
  it('Google button links to /auth/google', async () => {
    const res = await request(app).get('/login');
    expect(res.text).toMatch(/href="\/auth\/google"/);
  });
  it('contains email and password inputs', async () => {
    const res = await request(app).get('/login');
    expect(res.text).toMatch(/type="email"/);
    expect(res.text).toMatch(/type="password"/);
  });
  it('contains SVG background', async () => {
    const res = await request(app).get('/login');
    expect(res.text).toMatch(/<svg/);
  });
});

describe('GET /dashboard (unauthenticated)', () => {
  it('redirects to /login when not logged in', async () => {
    const res = await request(app).get('/dashboard');
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/login');
  });
});

describe('GET /unknown-route', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/unknown-route');
    expect(res.statusCode).toBe(404);
  });
});

// ── /problem route ─────────────────────────────────────────────────────────────────────────────
describe('GET /problem', () => {
  it('returns 200 with HTML', async () => {
    const res = await request(app).get('/problem?msg=Something+went+wrong');
    expect(res.statusCode).toBe(200);
    expect(res.type).toMatch(/html/);
  });
  it('contains the sorry heading', async () => {
    const res = await request(app).get('/problem?msg=test+error');
    expect(res.text).toMatch(/Sorry, ran into a problem/i);
  });
  it('displays the msg parameter in the page', async () => {
    const res = await request(app).get('/problem?msg=Something+went+wrong');
    expect(res.text).toContain('Something went wrong');
  });
  it('shows Go to Login button when not authenticated', async () => {
    const res = await request(app).get('/problem?msg=test');
    expect(res.text).toMatch(/Go to Login/i);
    expect(res.text).toMatch(/href="\/login"/);
  });
  it('uses a default message when msg param is absent', async () => {
    const res = await request(app).get('/problem');
    expect(res.statusCode).toBe(200);
    expect(res.text).toMatch(/unexpected error/i);
  });
  it('escapes HTML in msg to prevent XSS', async () => {
    const res = await request(app).get('/problem?msg=<script>alert(1)</script>');
    expect(res.text).not.toContain('<script>alert(1)</script>');
    expect(res.text).toContain('&lt;script&gt;');
  });
  it('contains the apologetic emoji', async () => {
    const res = await request(app).get('/problem?msg=test');
    expect(res.text).toMatch(/&#x1F64F;/);
  });
});

// ── environment table ─────────────────────────────────────────────────────────────────────────
describe('environment table', () => {
  it('maxuseraccounts row exists with value 1 after migration', async () => {
    const pool = require('../src/db').getPool();
    if (!pool) return;
    const [[row]] = await pool.execute(
      'SELECT content FROM environment WHERE name = ?', ['maxuseraccounts']
    );
    expect(row).toBeDefined();
    expect(row.content).toBe('1');
  });
  it('name column is unique', async () => {
    const pool = require('../src/db').getPool();
    if (!pool) return;
    await expect(
      pool.execute(`INSERT INTO environment (name, content) VALUES ('maxuseraccounts', '999')`)
    ).rejects.toThrow(/Duplicate entry/i);
  });
  it('INSERT IGNORE leaves existing value unchanged', async () => {
    const pool = require('../src/db').getPool();
    if (!pool) return;
    await pool.execute(`INSERT IGNORE INTO environment (name, content) VALUES ('maxuseraccounts', '999')`);
    const [[row]] = await pool.execute(
      'SELECT content FROM environment WHERE name = ?', ['maxuseraccounts']
    );
    expect(row.content).toBe('1');
  });
});

// ── useraccounts upsert logic (unit-tested directly) ────────────────────────────────────
describe('useraccounts upsert SQL', () => {
  it('upsert runs without error when DB is available', async () => {
    const pool = require('../src/db').getPool();
    if (!pool) return;
    const [r1] = await pool.execute(`
      INSERT INTO useraccounts
        (google_id, email, name, picture_url, first_login_at, last_login_at, login_count)
      VALUES ('test-google-id-999', 'test@example.com', 'Test User', NULL, NOW(), NOW(), 1)
      ON DUPLICATE KEY UPDATE
        id = LAST_INSERT_ID(id), email = VALUES(email), name = VALUES(name),
        picture_url = VALUES(picture_url), last_login_at = NOW(), login_count = login_count + 1
    `);
    expect(r1.insertId).toBeGreaterThan(0);
    const firstId = r1.insertId;
    const [r2] = await pool.execute(`
      INSERT INTO useraccounts
        (google_id, email, name, picture_url, first_login_at, last_login_at, login_count)
      VALUES ('test-google-id-999', 'updated@example.com', 'Updated Name', NULL, NOW(), NOW(), 1)
      ON DUPLICATE KEY UPDATE
        id = LAST_INSERT_ID(id), email = VALUES(email), name = VALUES(name),
        picture_url = VALUES(picture_url), last_login_at = NOW(), login_count = login_count + 1
    `);
    expect(r2.insertId).toBe(firstId);
    const [[row]] = await pool.execute(
      'SELECT email, name, login_count FROM useraccounts WHERE google_id = ?',
      ['test-google-id-999']
    );
    expect(row.email).toBe('updated@example.com');
    expect(row.name).toBe('Updated Name');
    expect(row.login_count).toBe(2);
    await pool.execute('DELETE FROM useraccounts WHERE google_id = ?', ['test-google-id-999']);
  });
  it('google_id column is unique — duplicate insert without ON DUPLICATE KEY throws', async () => {
    const pool = require('../src/db').getPool();
    if (!pool) return;
    await pool.execute(`INSERT INTO useraccounts (google_id, email, name, picture_url, first_login_at, last_login_at, login_count) VALUES ('dup-test-id', 'a@x.com', 'A', NULL, NOW(), NOW(), 1)`);
    await expect(
      pool.execute(`INSERT INTO useraccounts (google_id, email, name, picture_url, first_login_at, last_login_at, login_count) VALUES ('dup-test-id', 'b@x.com', 'B', NULL, NOW(), NOW(), 1)`)
    ).rejects.toThrow(/Duplicate entry/i);
    await pool.execute('DELETE FROM useraccounts WHERE google_id = ?', ['dup-test-id']);
  });
});
