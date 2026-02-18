const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/userModel');
const Hostel = require('../models/hostelModel');
const Campus = require('../models/campusModel');
const fs = require('fs');
const path = require('path');

describe('Hostels API', () => {
  let authToken;
  let userId;
  let campusId;
  let hostelId;
  let testImagePath;

  // Create test image file (1px PNG)
  const createTestImage = () => {
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
      0x0d, 0x49, 0x44, 0x41, 0x54, 0x08, 0x5b, 0x63, 0xf8, 0x0f, 0x00, 0x00,
      0x01, 0x01, 0x00, 0x00, 0x18, 0xdd, 0x8d, 0xb4, 0x00, 0x00, 0x00, 0x00,
      0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
    ]);
    return pngBuffer;
  };

  beforeAll(async () => {
    // Create test campus
    const campus = await Campus.create({
      name: 'Test University',
      location: 'Test City',
      verified: true
    });
    campusId = campus._id;

    // Create test user (seller role for hostel creation)
    const user = await User.create({
      fullName: 'Hostel Owner',
      email: 'hostel@example.com',
      password: 'Test123!',
      role: 'seller',
      campus: campusId
    });
    userId = user._id;
    authToken = user.generateAuthToken();
  });

  afterAll(async () => {
    // Cleanup
    await User.deleteMany({});
    await Hostel.deleteMany({});
    await Campus.deleteMany({});
  });

  // ✅ CREATE HOSTEL TESTS
  describe('POST /api/v1/hostels - Create Hostel', () => {
    it('should create a hostel with valid data', async () => {
      const hostelData = {
        name: 'Elite Hostel Campus',
        description: 'Modern hostel with excellent facilities',
        type: 'mixed',
        hostelClass: 'standard',
        contact: {
          phoneNumber: '08012345678',
          email: 'info@elitehostel.com'
        },
        location: {
          address: '123 Campus Street',
          city: 'Lagos',
          campus: campusId,
          coordinates: {
            type: 'Point',
            coordinates: [3.3869, 6.5244]
          }
        },
        amenities: ['WiFi', 'AC', 'CCTV'],
        roomTypes: [
          {
            type: 'single',
            price: 50000,
            currency: 'NGN',
            pricingPeriod: 'per-month',
            availableRooms: 5,
            occupancy: 1
          }
        ]
      };

      const response = await request(app)
        .post('/api/v1/hostels')
        .set('Authorization', `Bearer ${authToken}`)
        .send(hostelData);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.hostel).toHaveProperty('_id');
      expect(response.body.data.hostel.name).toBe('Elite Hostel Campus');
      expect(response.body.data.hostel.status).toBe('pending-verification');

      hostelId = response.body.data.hostel._id;
    });

    it('should fail without required fields', async () => {
      const response = await request(app)
        .post('/api/v1/hostels')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Hostel'
          // Missing other required fields
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('fail');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/hostels')
        .send({
          name: 'Test Hostel'
        });

      expect(response.status).toBe(401);
    });

    it('should reject non-seller roles', async () => {
      // Create a buyer user
      const buyerUser = await User.create({
        fullName: 'Buyer User',
        email: 'buyer@example.com',
        password: 'Test123!',
        role: 'buyer',
        campus: campusId
      });
      const buyerToken = buyerUser.generateAuthToken();

      const response = await request(app)
        .post('/api/v1/hostels')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          name: 'Test Hostel',
          type: 'mixed',
          contact: { phoneNumber: '08012345678' },
          location: {
            address: 'Test Address',
            campus: campusId
          },
          roomTypes: [{ type: 'single', price: 50000, occupancy: 1 }]
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('sellers');
    });
  });

  // ✅ RETRIEVE HOSTEL TESTS
  describe('GET /api/v1/hostels - Get All Hostels', () => {
    it('should get all hostels', async () => {
      const response = await request(app)
        .get('/api/v1/hostels')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(Array.isArray(response.body.data.hostels)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/hostels')
        .query({ page: 1, limit: 5 });

      expect(response.status).toBe(200);
      expect(response.body.data.hostels.length).toBeLessThanOrEqual(5);
    });
  });

  // ✅ SEARCH HOSTEL TESTS
  describe('GET /api/v1/hostels/search - Search Hostels', () => {
    it('should search hostels by type', async () => {
      const response = await request(app)
        .get('/api/v1/hostels/search')
        .query({ type: 'mixed' });

      expect(response.status).toBe(200);
      expect(response.body.data.hostels.every(h => h.type === 'mixed')).toBe(true);
    });

    it('should filter by price range', async () => {
      const response = await request(app)
        .get('/api/v1/hostels/search')
        .query({ minPrice: 40000, maxPrice: 100000 });

      expect(response.status).toBe(200);
    });

    it('should filter by amenities', async () => {
      const response = await request(app)
        .get('/api/v1/hostels/search')
        .query({ amenities: 'WiFi,AC' });

      expect(response.status).toBe(200);
    });

    it('should search by text', async () => {
      const response = await request(app)
        .get('/api/v1/hostels/search')
        .query({ searchText: 'Elite' });

      expect(response.status).toBe(200);
    });
  });

  // ✅ GET SINGLE HOSTEL TESTS
  describe('GET /api/v1/hostels/:id - Get Single Hostel', () => {
    it('should get a single hostel by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/hostels/${hostelId}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.hostel._id).toBe(hostelId.toString());
    });

    it('should increment views when fetched', async () => {
      const before = await Hostel.findById(hostelId);
      const viewsBefore = before.analytics.views;

      await request(app).get(`/api/v1/hostels/${hostelId}`);

      const after = await Hostel.findById(hostelId);
      expect(after.analytics.views).toBe(viewsBefore + 1);
    });

    it('should return 404 for non-existent hostel', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/v1/hostels/${fakeId}`);

      expect(response.status).toBe(404);
    });
  });

  // ✅ UPDATE HOSTEL TESTS
  describe('PATCH /api/v1/hostels/:id - Update Hostel', () => {
    it('should update hostel by owner', async () => {
      const response = await request(app)
        .patch(`/api/v1/hostels/${hostelId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Elite Hostel Campus - Updated',
          amenities: ['WiFi', 'AC', 'CCTV', 'Study Room']
        });

      expect(response.status).toBe(200);
      expect(response.body.data.hostel.name).toBe('Elite Hostel Campus - Updated');
    });

    it('should prevent non-owner updates', async () => {
      const otherUser = await User.create({
        fullName: 'Other User',
        email: 'other@example.com',
        password: 'Test123!',
        role: 'seller',
        campus: campusId
      });
      const otherToken = otherUser.generateAuthToken();

      const response = await request(app)
        .patch(`/api/v1/hostels/${hostelId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ name: 'Hacked Hostel' });

      expect(response.status).toBe(403);
    });
  });

  // ✅ DELETE HOSTEL TESTS
  describe('DELETE /api/v1/hostels/:id - Delete Hostel', () => {
    it('should delete hostel by owner', async () => {
      // Create another hostel to delete
      const deleteMe = await Hostel.create({
        name: 'To Delete',
        type: 'mixed',
        owner: userId,
        campus: campusId,
        contact: { phoneNumber: '08012345678' },
        location: {
          address: 'Test',
          campus: campusId,
          coordinates: { type: 'Point', coordinates: [3.3869, 6.5244] }
        },
        roomTypes: [{ type: 'single', price: 50000, occupancy: 1 }]
      });

      const response = await request(app)
        .delete(`/api/v1/hostels/${deleteMe._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(204);

      const check = await Hostel.findById(deleteMe._id);
      expect(check).toBeNull();
    });
  });

  // ✅ RATINGS TESTS
  describe('Hostel Ratings', () => {
    it('should add rating to hostel', async () => {
      const response = await request(app)
        .post(`/api/v1/hostels/${hostelId}/ratings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rating: 5,
          review: 'Excellent hostel with great facilities'
        });

      expect(response.status).toBe(201);
      expect(response.body.data.hostel.ratingsQuantity).toBeGreaterThan(0);
    });

    it('should get hostel ratings', async () => {
      const response = await request(app)
        .get(`/api/v1/hostels/${hostelId}/ratings`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('averageRating');
      expect(Array.isArray(response.body.data.ratings)).toBe(true);
    });

    it('should reject invalid rating', async () => {
      const response = await request(app)
        .post(`/api/v1/hostels/${hostelId}/ratings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rating: 10, // Invalid: max is 5
          review: 'Test'
        });

      expect(response.status).toBe(400);
    });
  });

  // ✅ GEOLOCATION TESTS
  describe('GET /api/v1/hostels/nearby - Nearby Hostels', () => {
    it('should find nearby hostels', async () => {
      const response = await request(app)
        .get('/api/v1/hostels/nearby')
        .query({
          lng: 3.3869,
          lat: 6.5244,
          maxDistance: 10000
        });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data.hostels)).toBe(true);
    });

    it('should require coordinates', async () => {
      const response = await request(app)
        .get('/api/v1/hostels/nearby')
        .query({ maxDistance: 10000 });

      expect(response.status).toBe(400);
    });
  });

  // ✅ ADMIN VERIFICATION
  describe('Admin Functions', () => {
    it('should verify hostel (admin only)', async () => {
      // Create admin user
      const admin = await User.create({
        fullName: 'Admin User',
        email: 'admin@example.com',
        password: 'Test123!',
        role: 'admin',
        campus: campusId
      });
      const adminToken = admin.generateAuthToken();

      const response = await request(app)
        .post(`/api/v1/hostels/${hostelId}/verify`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.hostel.isVerified).toBe(true);
      expect(response.body.data.hostel.status).toBe('active');
    });

    it('should reject non-admin verification', async () => {
      const response = await request(app)
        .post(`/api/v1/hostels/${hostelId}/verify`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
    });
  });
});

module.exports = {};
