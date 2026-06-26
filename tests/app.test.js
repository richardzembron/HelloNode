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
    expect(res.type).toMatch(/json/);
    expect(res.body.query_ts).toBeDefined();
    expect(res.body.error).toMatch(/database not available/i);
  });
  it('returns correct JSON shape when DB is available', async () => {
    const pool = require('../src/db').getPool();
    if (!pool) return;
    const res = await request(app).get('/hellolog');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('query_ts');
    expect(res.body).toHaveProperty('count');
    expect(res.body).toHaveProperty('entries');
    expect(Array.isArray(res.body.entries)).toBe(true);
    expect(res.body.entries.length).toBeLessThanOrEqual(10);
  });
});

describe('GET /developer', () => {
  it('returns 400 when cmd is missing', async () => {
    const res = await request(app).get('/developer');
    expect(res.statusCode).toBe(400);
    expect(res.type).toMatch(/json/);
    expect(res.body.error).toMatch(/missing required query parameter/i);
    expect(res.body.valid_commands).toEqual(['db_schema', 'db_statistics']);
  });
  it('returns 400 for an unknown cmd', async () => {
    const res = await request(app).get('/developer?cmd=drop_everything');
    expect(res.statusCode).toBe(400);
    expect(res.type).toMatch(/json/);
    expect(res.body.error).toMatch(/unknown command/i);
    expect(res.body.valid_commands).toEqual(['db_schema', 'db_statistics']);
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
    const pool = require('../src/db').getPool();
    if (pool) return;
    const res = await request(app).get('/developer?cmd=db_schema');
    expect(res.statusCode).toBe(503);
    expect(res.body.error).toMatch(/database not available/i);
  });
  it('returns 503 when DB is unavailable (db_statistics)', async () => {
    const pool = require('../src/db').getPool();
    if (pool) return;
    const res = await request(app).get('/developer?cmd=db_statistics');
    expect(res.statusCode).toBe(503);
    expect(res.body.error).toMatch(/database not available/i);
  });
  it('returns correct schema shape when DB is available', async () => {
    const pool = require('../src/db').getPool();
    if (!pool) return;
    const res = await request(app).get('/developer?cmd=db_schema');
    expect(res.statusCode).toBe(200);
    expect(res.body.cmd).toBe('db_schema');
    expect(Array.isArray(res.body.schema)).toBe(true);
    const table = res.body.schema[0];
    expect(table).toHaveProperty('table');
    expect(Array.isArray(table.fields)).toBe(true);
    const field = table.fields[0];
    expect(field).toHaveProperty('name');
    expect(field).toHaveProperty('type');
    expect(field).toHaveProperty('size');
    expect(field).toHaveProperty('primary');
    expect(field).toHaveProperty('nullable');
  });
  it('returns correct statistics shape when DB is available', async () => {
    const pool = require('../src/db').getPool();
    if (!pool) return;
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
    const t = res.body.tables[0];
    expect(t).toHaveProperty('table');
    expect(t).toHaveProperty('rows');
    expect(t).toHaveProperty('size_kb');
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
  it('contains email and password inputs', async () => {
    const res = await request(app).get('/login');
    expect(res.text).toMatch(/type="email"/);
    expect(res.text).toMatch(/type="password"/);
  });
  it('contains a Google sign-in button', async () => {
    const res = await request(app).get('/login');
    expect(res.text).toMatch(/Continue with Google/i);
  });
  it('contains an SVG background', async () => {
    const res = await request(app).get('/login');
    expect(res.text).toMatch(/<svg/);
  });
});

describe('GET /unknown-route', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/unknown-route');
    expect(res.statusCode).toBe(404);
  });
});
