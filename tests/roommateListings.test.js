const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/userModel');
const RoomateListing = require('../models/roommateListingModel');
const Campus = require('../models/campusModel');

describe('Roommate Listings API', () => {
  let authToken;
  let userId;
  let campusId;
  let listingId;

  beforeAll(async () => {
    // Create test campus
    const campus = await Campus.create({
      name: 'Test University',
      location: 'Test City',
      verified: true
    });
    campusId = campus._id;

    // Create test user (student)
    const user = await User.create({
      fullName: 'Jane Student',
      email: 'student@example.com',
      password: 'Test123!',
      role: 'buyer',
      campus: campusId,
      department: 'Computer Science',
      graduationYear: 2025
    });
    userId = user._id;
    authToken = user.generateAuthToken();
  });

  afterAll(async () => {
    await User.deleteMany({});
    await RoomateListing.deleteMany({});
    await Campus.deleteMany({});
  });

  // ✅ CREATE ROOMMATE LISTING TESTS
  describe('POST /api/v1/roommate-listings - Create Listing', () => {
    it('should create a roommate listing with valid data', async () => {
      const listingData = {
        title: 'Looking for roommate - Near Campus',
        description: 'I have a spacious double room in a secure apartment',
        accommodation: 'apartment',
        roomType: 'double',
        numberOfRooms: 2,
        location: {
          address: '456 Student Avenue',
          city: 'Lagos',
          campus: campusId,
          coordinates: {
            type: 'Point',
            coordinates: [3.3869, 6.5244]
          },
          distanceFromCampusKm: 1.2
        },
        budget: {
          minPrice: 40000,
          maxPrice: 60000,
          currency: 'NGN',
          pricingPeriod: 'per-month'
        },
        preferences: {
          genderPreference: 'female',
          lifestyleCompatibility: ['clean', 'organized', 'quiet']
        },
        contact: {
          phoneNumber: '08087654321',
          whatsapp: '08087654321',
          preferredContactMethod: 'whatsapp'
        }
      };

      const response = await request(app)
        .post('/api/v1/roommate-listings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(listingData);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.listing).toHaveProperty('_id');
      expect(response.body.data.listing.status).toBe('active');
      expect(response.body.data.listing.daysUntilExpiry).toBe(90);

      listingId = response.body.data.listing._id;
    });

    it('should fail without required fields', async () => {
      const response = await request(app)
        .post('/api/v1/roommate-listings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Listing'
          // Missing required fields
        });

      expect(response.status).toBe(400);
    });

    it('should fail if minPrice > maxPrice', async () => {
      const response = await request(app)
        .post('/api/v1/roommate-listings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test',
          description: 'Test',
          accommodation: 'apartment',
          location: {
            address: 'Test',
            campus: campusId
          },
          budget: {
            minPrice: 100000,
            maxPrice: 50000 // Invalid
          },
          preferences: {
            genderPreference: 'any'
          },
          contact: {
            phoneNumber: '08012345678'
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Minimum price cannot be greater than maximum price');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/roommate-listings')
        .send({
          title: 'Test Listing'
        });

      expect(response.status).toBe(401);
    });
  });

  // ✅ RETRIEVE LISTING TESTS
  describe('GET /api/v1/roommate-listings - Get All Listings', () => {
    it('should get all active listings', async () => {
      const response = await request(app)
        .get('/api/v1/roommate-listings')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(Array.isArray(response.body.data.listings)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/roommate-listings')
        .query({ page: 1, limit: 5 });

      expect(response.status).toBe(200);
      expect(response.body.data.listings.length).toBeLessThanOrEqual(5);
    });
  });

  // ✅ SEARCH LISTING TESTS
  describe('GET /api/v1/roommate-listings/search - Search Listings', () => {
    it('should search listings by gender preference', async () => {
      const response = await request(app)
        .get('/api/v1/roommate-listings/search')
        .query({ gender: 'female' });

      expect(response.status).toBe(200);
      expect(response.body.data.listings.every(
        l => l.preferences.genderPreference === 'female' || l.preferences.genderPreference === 'any'
      )).toBe(true);
    });

    it('should filter by price range', async () => {
      const response = await request(app)
        .get('/api/v1/roommate-listings/search')
        .query({ minPrice: 30000, maxPrice: 80000 });

      expect(response.status).toBe(200);
    });

    it('should filter by accommodation type', async () => {
      const response = await request(app)
        .get('/api/v1/roommate-listings/search')
        .query({ accommodation: 'apartment' });

      expect(response.status).toBe(200);
      expect(response.body.data.listings.every(l => l.accommodation === 'apartment')).toBe(true);
    });

    it('should search by text', async () => {
      const response = await request(app)
        .get('/api/v1/roommate-listings/search')
        .query({ searchText: 'Near Campus' });

      expect(response.status).toBe(200);
    });
  });

  // ✅ GET SINGLE LISTING TESTS
  describe('GET /api/v1/roommate-listings/:id - Get Single Listing', () => {
    it('should get a single listing by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/roommate-listings/${listingId}`);

      expect(response.status).toBe(200);
      expect(response.body.data.listing._id).toBe(listingId.toString());
    });

    it('should increment views when fetched', async () => {
      const before = await RoomateListing.findById(listingId);
      const viewsBefore = before.analytics.views;

      await request(app).get(`/api/v1/roommate-listings/${listingId}`);

      const after = await RoomateListing.findById(listingId);
      expect(after.analytics.views).toBe(viewsBefore + 1);
    });

    it('should return 404 for non-existent listing', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/v1/roommate-listings/${fakeId}`);

      expect(response.status).toBe(404);
    });
  });

  // ✅ GET MY LISTINGS TESTS
  describe('GET /api/v1/roommate-listings/my-listings/list - My Listings', () => {
    it('should get user\'s own listings', async () => {
      const response = await request(app)
        .get('/api/v1/roommate-listings/my-listings/list')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.listings.every(l => l.poster._id === userId.toString())).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/roommate-listings/my-listings/list');

      expect(response.status).toBe(401);
    });
  });

  // ✅ UPDATE LISTING TESTS
  describe('PATCH /api/v1/roommate-listings/:id - Update Listing', () => {
    it('should update listing by poster', async () => {
      const response = await request(app)
        .patch(`/api/v1/roommate-listings/${listingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Title',
          budget: {
            minPrice: 35000,
            maxPrice: 65000
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.data.listing.title).toBe('Updated Title');
    });

    it('should prevent non-poster updates', async () => {
      const otherUser = await User.create({
        fullName: 'Other Student',
        email: 'other@example.com',
        password: 'Test123!',
        role: 'buyer',
        campus: campusId
      });
      const otherToken = otherUser.generateAuthToken();

      const response = await request(app)
        .patch(`/api/v1/roommate-listings/${listingId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ title: 'Hacked' });

      expect(response.status).toBe(403);
    });
  });

  // ✅ CLOSE LISTING TESTS
  describe('POST /api/v1/roommate-listings/:id/close - Close Listing', () => {
    it('should close listing by poster', async () => {
      // Create a listing to close
      const temp = await RoomateListing.create({
        title: 'To Close',
        description: 'Test',
        accommodation: 'apartment',
        location: {
          address: 'Test',
          campus: campusId,
          coordinates: { type: 'Point', coordinates: [3.3869, 6.5244] }
        },
        budget: {
          minPrice: 40000,
          maxPrice: 60000
        },
        preferences: {
          genderPreference: 'any'
        },
        contact: {
          phoneNumber: '08012345678'
        },
        poster: userId
      });

      const response = await request(app)
        .post(`/api/v1/roommate-listings/${temp._id}/close`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'found-roommate'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.listing.status).toBe('closed');
      expect(response.body.data.listing.closedReason).toBe('found-roommate');
    });
  });

  // ✅ DELETE LISTING TESTS
  describe('DELETE /api/v1/roommate-listings/:id - Delete Listing', () => {
    it('should delete listing by poster', async () => {
      // Create a listing to delete
      const toDelete = await RoomateListing.create({
        title: 'To Delete',
        description: 'Test',
        accommodation: 'apartment',
        location: {
          address: 'Test',
          campus: campusId,
          coordinates: { type: 'Point', coordinates: [3.3869, 6.5244] }
        },
        budget: {
          minPrice: 40000,
          maxPrice: 60000
        },
        preferences: {
          genderPreference: 'any'
        },
        contact: {
          phoneNumber: '08012345678'
        },
        poster: userId
      });

      const response = await request(app)
        .delete(`/api/v1/roommate-listings/${toDelete._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(204);

      const check = await RoomateListing.findById(toDelete._id);
      expect(check).toBeNull();
    });
  });

  // ✅ INQUIRY REGISTRATION
  describe('POST /api/v1/roommate-listings/:id/inquiry - Register Inquiry', () => {
    it('should register inquiry and increment counter', async () => {
      const before = await RoomateListing.findById(listingId);
      const inquiriesBefore = before.analytics.inquiries;

      const response = await request(app)
        .post(`/api/v1/roommate-listings/${listingId}/inquiry`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.inquiryCount).toBe(inquiriesBefore + 1);
    });
  });

  // ✅ GEOLOCATION TESTS
  describe('GET /api/v1/roommate-listings/nearby - Nearby Listings', () => {
    it('should find nearby listings', async () => {
      const response = await request(app)
        .get('/api/v1/roommate-listings/nearby')
        .query({
          lng: 3.3869,
          lat: 6.5244,
          maxDistance: 10000
        });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data.listings)).toBe(true);
    });

    it('should require coordinates', async () => {
      const response = await request(app)
        .get('/api/v1/roommate-listings/nearby')
        .query({ maxDistance: 10000 });

      expect(response.status).toBe(400);
    });
  });

  // ✅ SMART MATCHING
  describe('GET /api/v1/roommate-listings/matching/suggestions - Smart Matching', () => {
    it('should get matching listings based on profile', async () => {
      const response = await request(app)
        .get('/api/v1/roommate-listings/matching/suggestions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data.listings)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/roommate-listings/matching/suggestions');

      expect(response.status).toBe(401);
    });
  });
});

module.exports = {};
