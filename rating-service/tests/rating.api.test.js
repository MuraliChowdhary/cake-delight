const request = require('supertest');
const app = require('../app');
const pool = require('../src/config/db');

afterAll(async () => {
  await pool.end();
});

describe('Rating Service Integration & Perspective Tests', () => {
  const validCakeId = 'fb1a0c0a-9740-484f-bcd7-cdc9a123c63e';
  const validUserId = '5e81f5f3-4a63-4b47-975a-8b1b22591234';
  let createdRatingId;

  // ==========================================
  // Perspective 1: Positive Paths (Happy Path)
  // ==========================================
  describe('1. Positive Paths', () => {
    test('POST /api/v1/cakes/:cakeId/ratings - Should create rating with optional comment omitted', async () => {
      const payload = {
        score: 4,
        userId: validUserId,
      };

      const response = await request(app)
        .post(`/api/v1/cakes/${validCakeId}/ratings`)
        .send(payload)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.score).toBe(4);
      expect(response.body.data.comment).toBeNull(); // Verifies optional comment is handled safely
      expect(response.body.data.id).toBeDefined();
      createdRatingId = response.body.data.id;
    });

    test('GET /api/v1/cakes/:cakeId/ratings - Should list ratings for a valid cake', async () => {
      const response = await request(app)
        .get(`/api/v1/cakes/${validCakeId}/ratings`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.count).toBeGreaterThanOrEqual(1);
    });

    test('GET /api/v1/cakes/:cakeId/ratings/average - Should calculate average correctly', async () => {
      const response = await request(app)
        .get(`/api/v1/cakes/${validCakeId}/ratings/average`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(typeof response.body.data.averageScore).toBe('number');
      expect(typeof response.body.data.totalReviews).toBe('number');
    });
  });

  // ==========================================
  // Perspective 2: Validation Safeguards
  // ==========================================
  describe('2. Validation Edge Cases', () => {
    test('POST /api/v1/cakes/:cakeId/ratings - Should reject score > 5', async () => {
      const response = await request(app)
        .post(`/api/v1/cakes/${validCakeId}/ratings`)
        .send({ score: 6, userId: validUserId })
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
      expect(response.body.details[0].field).toContain('score');
    });

    test('POST /api/v1/cakes/:cakeId/ratings - Should reject score < 1', async () => {
      const response = await request(app)
        .post(`/api/v1/cakes/${validCakeId}/ratings`)
        .send({ score: 0, userId: validUserId })
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    test('POST /api/v1/cakes/:cakeId/ratings - Should reject comment < 3 characters', async () => {
      const response = await request(app)
        .post(`/api/v1/cakes/${validCakeId}/ratings`)
        .send({ score: 5, userId: validUserId, comment: 'Hi' })
        .expect(400);

      expect(response.body.details[0].field).toContain('comment');
    });
  });

  // ==========================================
  // Perspective 3: Non-Existent Resources
  // ==========================================
  describe('3. Non-Existent Resources', () => {
    test('GET /api/v1/cakes/:cakeId/ratings - Should return 200 with empty array for cake with NO ratings', async () => {
      const emptyCakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/v1/cakes/${emptyCakeId}/ratings`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toEqual([]); // Confirms loose coupling design choice
      expect(response.body.count).toBe(0);
    });

    test('PUT /api/v1/cakes/:cakeId/ratings/:ratingId - Should return 404 for missing rating ID', async () => {
      const fakeRatingId = '11111111-1111-1111-1111-111111111111';
      const response = await request(app)
        .put(`/api/v1/cakes/${validCakeId}/ratings/${fakeRatingId}`)
        .send({ score: 5 })
        .expect(404);

      expect(response.body.error.message).toContain('not found');
    });
  });

  // ==========================================
  // Perspective 4: Payload & Body Limits
  // ==========================================
  describe('4. Body & Payload Limits', () => {
    test('POST /api/v1/cakes/:cakeId/ratings - Should reject payloads larger than 10KB with 413', async () => {
      const hugeComment = 'A'.repeat(12000); // 12KB string
      await request(app)
        .post(`/api/v1/cakes/${validCakeId}/ratings`)
        .send({ score: 5, userId: validUserId, comment: hugeComment })
        .expect(413);
    });
  });

  // ==========================================
  // Perspective 5: Infrastructure & Probes
  // ==========================================
  describe('5. Infrastructure & Health Probes', () => {
    test('GET /health/live - Should return 200 OK', async () => {
      const response = await request(app).get('/health/live').expect(200);
      expect(response.body.status).toBe('UP');
    });

    test('GET /health/ready - Should return 200 OK when DB is connected', async () => {
      const response = await request(app).get('/health/ready').expect(200);
      expect(response.body.database).toBe('CONNECTED');
    });
  });
});