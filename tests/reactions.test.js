/**
 * Message Reactions Feature - Integration Tests
 * Tests for real-time reactions with Socket.IO and REST API
 */

const request = require('supertest');
const app = require('../app');
const io = require('socket.io-client');

// Test data
let testUser1, testUser2, testChat, testMessage, authToken1, authToken2;

describe('Message Reactions Feature', () => {
  // Setup before all tests
  beforeAll(async () => {
    // Create test users and authenticate
    // This would typically use your auth endpoints
  });

  describe('REST API - Reactions Endpoints', () => {
    describe('POST /api/v1/messages/:id/reactions', () => {
      it('should add a reaction to a message', async () => {
        const res = await request(app)
          .post(`/api/v1/messages/${testMessage._id}/reactions`)
          .set('Authorization', `Bearer ${authToken1}`)
          .send({ emoji: '👍' });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.data.reaction.emoji).toBe('👍');
        expect(res.body.data.reaction.userCount).toBe(1);
        expect(res.body.data.reaction.userReacted).toBe(true);
      });

      it('should reject invalid emoji', async () => {
        const res = await request(app)
          .post(`/api/v1/messages/${testMessage._id}/reactions`)
          .set('Authorization', `Bearer ${authToken1}`)
          .send({ emoji: '🚀' }); // Not in allowed list

        expect(res.status).toBe(400);
        expect(res.body.status).toBe('error');
      });

      it('should reject missing emoji', async () => {
        const res = await request(app)
          .post(`/api/v1/messages/${testMessage._id}/reactions`)
          .set('Authorization', `Bearer ${authToken1}`)
          .send({});

        expect(res.status).toBe(400);
      });

      it('should reject if user not chat member', async () => {
        const res = await request(app)
          .post(`/api/v1/messages/${testMessage._id}/reactions`)
          .set('Authorization', `Bearer ${nonMemberToken}`)
          .send({ emoji: '👍' });

        expect(res.status).toBe(403);
      });

      it('should return 404 for non-existent message', async () => {
        const res = await request(app)
          .post('/api/v1/messages/invalid_id/reactions')
          .set('Authorization', `Bearer ${authToken1}`)
          .send({ emoji: '👍' });

        expect(res.status).toBe(404);
      });
    });

    describe('DELETE /api/v1/messages/:id/reactions', () => {
      it('should remove a reaction from a message', async () => {
        const res = await request(app)
          .delete(`/api/v1/messages/${testMessage._id}/reactions`)
          .set('Authorization', `Bearer ${authToken1}`)
          .send({ emoji: '👍' });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.data.reaction.removed).toBe(true);
      });

      it('should reject if user not chat member', async () => {
        const res = await request(app)
          .delete(`/api/v1/messages/${testMessage._id}/reactions`)
          .set('Authorization', `Bearer ${nonMemberToken}`)
          .send({ emoji: '👍' });

        expect(res.status).toBe(403);
      });
    });

    describe('GET /api/v1/messages/:messageId/reactions/stats', () => {
      it('should return reaction statistics', async () => {
        const res = await request(app)
          .get(`/api/v1/messages/${testMessage._id}/reactions/stats`)
          .set('Authorization', `Bearer ${authToken1}`);

        expect(res.status).toBe(200);
        expect(res.body.data.stats).toBeDefined();
        expect(res.body.data.stats.totalReactions).toBeGreaterThanOrEqual(0);
        expect(res.body.data.stats.totalUniqueEmojis).toBeGreaterThanOrEqual(0);
        expect(res.body.data.stats.topReactions).toBeDefined();
      });

      it('should return 404 for non-existent message', async () => {
        const res = await request(app)
          .get('/api/v1/messages/invalid_id/reactions/stats')
          .set('Authorization', `Bearer ${authToken1}`);

        expect(res.status).toBe(404);
      });
    });

    describe('GET /api/v1/messages/:messageId/reactions/users', () => {
      it('should return users for specific emoji', async () => {
        // First add a reaction
        await request(app)
          .post(`/api/v1/messages/${testMessage._id}/reactions`)
          .set('Authorization', `Bearer ${authToken1}`)
          .send({ emoji: '👍' });

        // Then get users
        const res = await request(app)
          .get(`/api/v1/messages/${testMessage._id}/reactions/users?emoji=👍`)
          .set('Authorization', `Bearer ${authToken1}`);

        expect(res.status).toBe(200);
        expect(res.body.data.users).toBeDefined();
        expect(Array.isArray(res.body.data.users)).toBe(true);
      });

      it('should reject invalid emoji', async () => {
        const res = await request(app)
          .get(`/api/v1/messages/${testMessage._id}/reactions/users?emoji=🚀`)
          .set('Authorization', `Bearer ${authToken1}`);

        expect(res.status).toBe(400);
      });

      it('should return 400 for missing emoji parameter', async () => {
        const res = await request(app)
          .get(`/api/v1/messages/${testMessage._id}/reactions/users`)
          .set('Authorization', `Bearer ${authToken1}`);

        expect(res.status).toBe(400);
      });
    });

    describe('GET /api/v1/messages/reactions/allowed', () => {
      it('should return all allowed reactions', async () => {
        const res = await request(app)
          .get('/api/v1/messages/reactions/allowed')
          .set('Authorization', `Bearer ${authToken1}`);

        expect(res.status).toBe(200);
        expect(res.body.data.reactions).toBeDefined();
        expect(Array.isArray(res.body.data.reactions)).toBe(true);
        expect(res.body.data.reactions.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Socket.IO Real-Time Reactions', () => {
    let socket1, socket2;

    beforeAll((done) => {
      socket1 = io('http://localhost:5000', {
        auth: { token: authToken1 }
      });
      socket2 = io('http://localhost:5000', {
        auth: { token: authToken2 }
      });

      socket1.on('connect', () => {
        socket2.on('connect', done);
      });
    });

    afterAll(() => {
      socket1.close();
      socket2.close();
    });

    describe('addReaction event', () => {
      it('should emit reactionAdded to all users in chat', (done) => {
        socket2.on('reactionAdded', (data) => {
          expect(data.messageId).toBe(testMessage._id.toString());
          expect(data.emoji).toBe('👍');
          expect(data.userId).toBe(testUser1._id.toString());
          expect(data.reactions).toBeDefined();
          done();
        });

        socket1.emit('addReaction', {
          messageId: testMessage._id,
          chatId: testChat._id,
          emoji: '👍'
        });
      });

      it('should reject invalid emoji', (done) => {
        socket1.on('error', (data) => {
          expect(data.message).toBe('Invalid emoji reaction');
          done();
        });

        socket1.emit('addReaction', {
          messageId: testMessage._id,
          chatId: testChat._id,
          emoji: '🚀'
        });
      });
    });

    describe('removeReaction event', () => {
      it('should emit reactionRemoved to all users in chat', (done) => {
        socket2.on('reactionRemoved', (data) => {
          expect(data.messageId).toBe(testMessage._id.toString());
          expect(data.emoji).toBe('👍');
          expect(data.userId).toBe(testUser1._id.toString());
          expect(data.reactions).toBeDefined();
          done();
        });

        socket1.emit('removeReaction', {
          messageId: testMessage._id,
          chatId: testChat._id,
          emoji: '👍'
        });
      });
    });

    describe('getReactions event', () => {
      it('should return reactions for message', (done) => {
        socket1.emit('getReactions', {
          messageId: testMessage._id,
          chatId: testChat._id
        }, (response) => {
          expect(response.success).toBe(true);
          expect(response.reactions).toBeDefined();
          expect(response.totalReactions).toBeGreaterThanOrEqual(0);
          done();
        });
      });
    });
  });

  describe('Reaction Validation Utility', () => {
    const reactionValidator = require('../../utils/reactionValidator');

    describe('validateReaction', () => {
      it('should validate allowed emoji', () => {
        const result = reactionValidator.validateReaction('👍');
        expect(result.valid).toBe(true);
        expect(result.emoji).toBe('👍');
      });

      it('should reject disallowed emoji', () => {
        const result = reactionValidator.validateReaction('🚀');
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should reject non-string input', () => {
        const result = reactionValidator.validateReaction(123);
        expect(result.valid).toBe(false);
      });

      it('should reject empty string', () => {
        const result = reactionValidator.validateReaction('');
        expect(result.valid).toBe(false);
      });
    });

    describe('getReactionStats', () => {
      it('should calculate stats correctly', () => {
        const reactions = [
          { emoji: '👍', count: 5, users: ['u1', 'u2', 'u3', 'u4', 'u5'] },
          { emoji: '❤️', count: 3, users: ['u1', 'u6', 'u7'] }
        ];

        const stats = reactionValidator.getReactionStats(reactions);
        expect(stats.totalReactions).toBe(8);
        expect(stats.totalUniqueEmojis).toBe(2);
        expect(stats.reactionBreakdown['👍']).toBe(5);
        expect(stats.reactionBreakdown['❤️']).toBe(3);
      });

      it('should handle empty reactions', () => {
        const stats = reactionValidator.getReactionStats([]);
        expect(stats.totalReactions).toBe(0);
        expect(stats.totalUniqueEmojis).toBe(0);
      });
    });

    describe('hasUserReacted', () => {
      it('should return true if user reacted', () => {
        const reactions = [
          { emoji: '👍', count: 2, users: [{ _id: 'user1' }, { _id: 'user2' }] }
        ];

        expect(reactionValidator.hasUserReacted(reactions, '👍', 'user1')).toBe(true);
      });

      it('should return false if user did not react', () => {
        const reactions = [
          { emoji: '👍', count: 2, users: [{ _id: 'user1' }, { _id: 'user2' }] }
        ];

        expect(reactionValidator.hasUserReacted(reactions, '👍', 'user3')).toBe(false);
      });
    });

    describe('formatReactionsForResponse', () => {
      it('should format reactions correctly', () => {
        const reactions = [
          {
            emoji: '👍',
            count: 2,
            users: [
              { _id: 'u1', fullName: 'John', photo: 'url1' },
              { _id: 'u2', fullName: 'Jane', photo: 'url2' }
            ]
          }
        ];

        const formatted = reactionValidator.formatReactionsForResponse(reactions);
        expect(formatted.length).toBe(1);
        expect(formatted[0].emoji).toBe('👍');
        expect(formatted[0].count).toBe(2);
        expect(formatted[0].users.length).toBe(2);
      });
    });
  });
});
