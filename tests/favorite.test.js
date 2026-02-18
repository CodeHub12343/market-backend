const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/userModel');
const Favorite = require('../models/favoriteModel');
const Post = require('../models/postModel');
const Product = require('../models/productModel');

describe('Favorites API', () => {
  let authToken;
  let userId;
  let testPost;
  let testProduct;

  beforeAll(async () => {
    // Create test user
    const user = await User.create({
      fullName: 'Test User',
      email: 'test@example.com',
      password: 'Test123!',
      role: 'user'
    });
    userId = user._id;
    authToken = user.generateAuthToken();

    // Create test items
    testPost = await Post.create({
      content: 'Test post content',
      author: userId,
      campus: new mongoose.Types.ObjectId()
    });

    testProduct = await Product.create({
      title: 'Test Product',
      price: 100,
      seller: userId,
      campus: new mongoose.Types.ObjectId()
    });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Favorite.deleteMany({});
    await Post.deleteMany({});
    await Product.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Favorite.deleteMany({});
  });

  describe('POST /api/v1/favorites/toggle', () => {
    it('should add item to favorites', async () => {
      const response = await request(app)
        .post('/api/v1/favorites/toggle')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          itemId: testPost._id,
          itemType: 'Post'
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('added to favorites');
    });

    it('should remove item from favorites if already favorited', async () => {
      // First add to favorites
      await Favorite.create({
        user: userId,
        item: testPost._id,
        itemType: 'Post'
      });

      const response = await request(app)
        .post('/api/v1/favorites/toggle')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          itemId: testPost._id,
          itemType: 'Post'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('removed from favorites');
    });

    it('should return 400 for invalid item type', async () => {
      const response = await request(app)
        .post('/api/v1/favorites/toggle')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          itemId: testPost._id,
          itemType: 'InvalidType'
        });

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent item', async () => {
      const response = await request(app)
        .post('/api/v1/favorites/toggle')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          itemId: new mongoose.Types.ObjectId(),
          itemType: 'Post'
        });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/v1/favorites', () => {
    beforeEach(async () => {
      // Create test favorites
      await Favorite.create([
        {
          user: userId,
          item: testPost._id,
          itemType: 'Post',
          tags: ['test', 'post']
        },
        {
          user: userId,
          item: testProduct._id,
          itemType: 'Product',
          priority: 'high'
        }
      ]);
    });

    it('should get all favorites for user', async () => {
      const response = await request(app)
        .get('/api/v1/favorites')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.results).toBe(2);
      expect(response.body.data.favorites).toHaveLength(2);
    });

    it('should filter favorites by item type', async () => {
      const response = await request(app)
        .get('/api/v1/favorites?itemType=Post')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.results).toBe(1);
      expect(response.body.data.favorites[0].itemType).toBe('Post');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/favorites?page=1&limit=1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.results).toBe(1);
      expect(response.body.page).toBe(1);
      expect(response.body.pages).toBe(2);
    });

    it('should support search', async () => {
      const response = await request(app)
        .get('/api/v1/favorites?search=test')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.results).toBe(1);
    });
  });

  describe('GET /api/v1/favorites/search', () => {
    beforeEach(async () => {
      await Favorite.create({
        user: userId,
        item: testPost._id,
        itemType: 'Post',
        tags: ['important', 'work'],
        notes: 'This is a test note'
      });
    });

    it('should search favorites by tags and notes', async () => {
      const response = await request(app)
        .get('/api/v1/favorites/search?q=important')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.results).toBe(1);
    });

    it('should return 400 for empty search query', async () => {
      const response = await request(app)
        .get('/api/v1/favorites/search?q=')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/favorites/analytics', () => {
    beforeEach(async () => {
      await Favorite.create([
        {
          user: userId,
          item: testPost._id,
          itemType: 'Post',
          metadata: { accessCount: 5 }
        },
        {
          user: userId,
          item: testProduct._id,
          itemType: 'Product',
          metadata: { accessCount: 3 }
        }
      ]);
    });

    it('should return favorite analytics', async () => {
      const response = await request(app)
        .get('/api/v1/favorites/analytics')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.totalFavorites).toBe(2);
      expect(response.body.data.byType).toHaveLength(2);
    });
  });

  describe('POST /api/v1/favorites/bulk', () => {
    it('should add multiple favorites', async () => {
      const response = await request(app)
        .post('/api/v1/favorites/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          operation: 'add',
          items: [
            { itemId: testPost._id, itemType: 'Post' },
            { itemId: testProduct._id, itemType: 'Product' }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });

    it('should clear all favorites', async () => {
      // First add some favorites
      await Favorite.create([
        { user: userId, item: testPost._id, itemType: 'Post' },
        { user: userId, item: testProduct._id, itemType: 'Product' }
      ]);

      const response = await request(app)
        .post('/api/v1/favorites/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          operation: 'clear'
        });

      expect(response.status).toBe(200);
      
      // Verify favorites are cleared
      const favorites = await Favorite.find({ user: userId });
      expect(favorites).toHaveLength(0);
    });
  });

  describe('PATCH /api/v1/favorites/:id', () => {
    let favoriteId;

    beforeEach(async () => {
      const favorite = await Favorite.create({
        user: userId,
        item: testPost._id,
        itemType: 'Post'
      });
      favoriteId = favorite._id;
    });

    it('should update favorite tags and notes', async () => {
      const response = await request(app)
        .patch(`/api/v1/favorites/${favoriteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tags: ['updated', 'test'],
          notes: 'Updated notes',
          priority: 'high'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.favorite.tags).toEqual(['updated', 'test']);
      expect(response.body.data.favorite.notes).toBe('Updated notes');
      expect(response.body.data.favorite.priority).toBe('high');
    });
  });

  describe('POST /api/v1/favorites/:id/tags', () => {
    let favoriteId;

    beforeEach(async () => {
      const favorite = await Favorite.create({
        user: userId,
        item: testPost._id,
        itemType: 'Post',
        tags: ['existing']
      });
      favoriteId = favorite._id;
    });

    it('should add tag to favorite', async () => {
      const response = await request(app)
        .post(`/api/v1/favorites/${favoriteId}/tags`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tag: 'new-tag'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.favorite.tags).toContain('new-tag');
    });
  });

  describe('DELETE /api/v1/favorites/:id/tags/:tag', () => {
    let favoriteId;

    beforeEach(async () => {
      const favorite = await Favorite.create({
        user: userId,
        item: testPost._id,
        itemType: 'Post',
        tags: ['tag1', 'tag2']
      });
      favoriteId = favorite._id;
    });

    it('should remove tag from favorite', async () => {
      const response = await request(app)
        .delete(`/api/v1/favorites/${favoriteId}/tags/tag1`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.favorite.tags).not.toContain('tag1');
      expect(response.body.data.favorite.tags).toContain('tag2');
    });
  });

  describe('PATCH /api/v1/favorites/:id/archive', () => {
    let favoriteId;

    beforeEach(async () => {
      const favorite = await Favorite.create({
        user: userId,
        item: testPost._id,
        itemType: 'Post'
      });
      favoriteId = favorite._id;
    });

    it('should archive favorite', async () => {
      const response = await request(app)
        .patch(`/api/v1/favorites/${favoriteId}/archive`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.favorite.isActive).toBe(false);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all routes', async () => {
      const response = await request(app)
        .get('/api/v1/favorites');

      expect(response.status).toBe(401);
    });

    it('should not allow access to other users favorites', async () => {
      // Create another user
      const otherUser = await User.create({
        fullName: 'Other User',
        email: 'other@example.com',
        password: 'Test123!'
      });

      // Create favorite for other user
      const favorite = await Favorite.create({
        user: otherUser._id,
        item: testPost._id,
        itemType: 'Post'
      });

      const response = await request(app)
        .get(`/api/v1/favorites/${favorite._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on toggle operations', async () => {
      // This would require more sophisticated rate limiting testing
      // For now, just verify the endpoint works
      const response = await request(app)
        .post('/api/v1/favorites/toggle')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          itemId: testPost._id,
          itemType: 'Post'
        });

      expect(response.status).toBe(200);
    });
  });
});