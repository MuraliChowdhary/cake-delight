const request = require('supertest');
const app = require('../app');
const pool = require('../src/config/db');

afterAll(async () => {
  await pool.end();
});

describe('Catalog Service Integration & Perspective Tests', () => {
  let createdCakeId;

  // Perspective 1: Positive Path - Creation
  test('POST /api/v1/cakes - Should create a new cake with valid payload', async () => {
    const payload = {
      name: 'Red Velvet Deluxe',
      description: 'Rich cream cheese frosting cake',
      price: 25.99,
      category: 'Gourmet',
      stock: 10,
    };

    const response = await request(app)
      .post('/api/v1/cakes')
      .send(payload)
      .expect(201);

    expect(response.body.status).toBe('success');
    expect(response.body.data.name).toBe(payload.name);
    expect(response.body.data.id).toBeDefined();
    createdCakeId = response.body.data.id;
  });

  // Perspective 2: Validation Safeguard - Bad UUID
  test('GET /api/v1/cakes/:id - Should reject invalid UUID format with 400', async () => {
    const response = await request(app)
      .get('/api/v1/cakes/invalid-uuid-123')
      .expect(400);

    expect(response.body.error).toBeDefined();
  });

  // Perspective 2: Validation Safeguard - Negative Price
  test('POST /api/v1/cakes - Should reject negative price with 400', async () => {
    const response = await request(app)
      .post('/api/v1/cakes')
      .send({
        name: 'Chocolate Fudge',
        price: -15,
        category: 'Standard',
      })
      .expect(400);

    expect(response.body.error).toBeDefined();
  });

  // Perspective 3: Non-Existent Resource (404)
  test('GET /api/v1/cakes/:id - Should return 404 for missing cake UUID', async () => {
    const fakeUuid = '00000000-0000-0000-0000-000000000000';
    const response = await request(app)
      .get(`/api/v1/cakes/${fakeUuid}`)
      .expect(404);

    expect(response.body.error.message).toContain('not found');
  });

  // Perspective 4: Payload Limit Guard (>10KB Payload)
  test('POST /api/v1/cakes - Should reject payloads larger than 10KB with 413', async () => {
    const hugeDescription = 'A'.repeat(12000); // 12KB string
    await request(app)
      .post('/api/v1/cakes')
      .send({
        name: 'Huge Cake',
        description: hugeDescription,
        price: 30.0,
        category: 'Large',
      })
      .expect(413);
  });

  // Perspective 5: Infrastructure & Health Probes
  test('GET /health/live - Should return 200 OK for Kubernetes Liveness probe', async () => {
    const response = await request(app)
      .get('/health/live')
      .expect(200);

    expect(response.body.status).toBe('UP');
  });
});