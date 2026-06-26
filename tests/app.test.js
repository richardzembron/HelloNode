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

describe('GET /unknown-route', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/unknown-route');
    expect(res.statusCode).toBe(404);
  });
});
