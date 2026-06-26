'use strict';

const request = require('supertest');
const app     = require('../src/app');

describe('GET /', () => {
  it('should return 200 with plain text status', async () => {
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

  it('returns 400 plain text when age parameter is missing', async () => {
    const res = await request(app).get('/hello');
    expect(res.statusCode).toBe(400);
    expect(res.type).toMatch(/text/);
    expect(res.text).toMatch(/Missing required query parameter/i);
  });

  it('returns 400 plain text for non-numeric age', async () => {
    const res = await request(app).get('/hello?age=abc');
    expect(res.statusCode).toBe(400);
    expect(res.text).toMatch(/Invalid value/i);
  });

  it('returns 400 plain text for negative age', async () => {
    const res = await request(app).get('/hello?age=-1');
    expect(res.statusCode).toBe(400);
    expect(res.text).toMatch(/Invalid value/i);
  });
});

describe('GET /unknown-route', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/unknown-route');
    expect(res.statusCode).toBe(404);
  });
});
