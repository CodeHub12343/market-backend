const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const { uploadAvatar, processAvatar } = require('../middlewares/profileMiddleware');
const profileController = require('../controllers/profileController');
const profileValidator = require('../validators/profileValidator');

const router = express.Router();

/**
 * ==================== PUBLIC ROUTES ====================
 */

// Get public user profile by ID
router.get('/users/:id', profileController.getUserProfile);

// Get user's followers (public)
router.get('/users/:id/followers', profileController.getFollowers);

// Get user's following list (public)
router.get('/users/:id/following', profileController.getFollowing);

/**
 * ==================== PROTECTED ROUTES ====================
 */
router.use(protect);

/**
 * ===== PROFILE MANAGEMENT =====
 */

// Get current user's profile
router.get('/me', profileController.getMyProfile);

// Update current user's profile
router.patch('/me',
  uploadAvatar,
  processAvatar,
  profileValidator.validateProfileUpdate,
  profileController.updateProfile
);

// Delete account (deactivate)
router.delete('/me', profileController.deleteAccount);

/**
 * ===== AVATAR MANAGEMENT =====
 */

// Upload/update avatar
router.post('/me/avatar',
  uploadAvatar,
  processAvatar,
  profileController.uploadAvatar
);

// Delete avatar
router.delete('/me/avatar', profileController.deleteProfilePicture);

/**
 * ===== PREFERENCES =====
 */

// Update preferences
router.patch('/me/preferences',
  profileValidator.validatePreferencesUpdate,
  profileController.updatePreferences
);

/**
 * ===== PROFILE STATS =====
 */

// Get profile statistics (posts, followers, etc.)
router.get('/me/stats', profileController.getProfileStats);

/**
 * ===== FOLLOWING/FOLLOWERS =====
 */

// Follow a user
router.post('/users/:id/follow', profileController.followUser);

// Unfollow a user
router.delete('/users/:id/follow', profileController.unfollowUser);

/**
 * ===== BLOCKING =====
 */

// Block a user
router.post('/users/:id/block', profileController.blockUser);

// Unblock a user
router.delete('/users/:id/block', profileController.unblockUser);

/**
 * ===== INTERNAL ROUTES =====
 */

// Update last login (used by auth middleware)
router.patch('/me/last-login', profileController.updateLastLogin);

module.exports = router;