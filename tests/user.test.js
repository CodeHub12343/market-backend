const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

// We'll create a small express app that mounts the real userRoutes so tests don't need a full server run
const userRoutes = require('../routes/userRoutes');

const app = express();
app.use(bodyParser.json());
app.use('/api/v1/users', userRoutes);

// Basic smoke tests: create user and get user (these are integration-ish - they require a running DB in real world)
// For CI/local usage without DB we keep tests minimal and only assert route wiring and validation responses.

describe('User routes (basic)', () => {
  test('POST /api/v1/users - missing fields should return 400', async () => {
    const res = await request(app).post('/api/v1/users').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('status', 'error');
  });

  test('GET /api/v1/users - unauthorized without token should return 401', async () => {
    const res = await request(app).get('/api/v1/users');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('status', 'error');
  });
});
