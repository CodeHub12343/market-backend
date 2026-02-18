const express = require('express');
const hostelController = require('../controllers/hostelController');
const authMiddleware = require('../middlewares/authMiddleware');
const hostelMiddleware = require('../middlewares/hostelMiddleware');

const router = express.Router();

// Public routes
router.get('/search/suggestions', hostelController.getHostelSearchSuggestions);
router.get('/search/history', hostelController.getHostelSearchHistory);
router.get('/search/popular', hostelController.getPopularHostels);
router.get('/search', hostelController.searchHostels);
router.get('/nearby', hostelController.getNearbyHostels);
router.get('/types', hostelController.getHostelTypes);
router.get('/amenities', hostelController.getHostelAmenities);
router.get('/price-range', hostelController.getPriceRange);
router.get('/:id/ratings', hostelController.getHostelRatings);
router.get('/:id/reviews', hostelController.getHostelReviews);
router.get('/:id/rating-stats', hostelController.getHostelRatingStats);
router.get('/:id', hostelController.getHostel);

// Protected routes (require authentication)
router.use(authMiddleware.protect);

// This must be AFTER protect middleware so req.user is available for campus filtering
router.get('/', hostelController.getAllHostels);

// Owner/Agent routes
router.post(
  '/',
  hostelMiddleware.uploadHostelImages,
  hostelMiddleware.processHostelImages,
  hostelMiddleware.validateHostelData,
  hostelController.createHostel
);

router.get('/my-hostels/list', hostelController.getMyHostels);

router.patch(
  '/:id',
  hostelMiddleware.validateHostelOwnership,
  hostelMiddleware.uploadHostelImages,
  hostelMiddleware.processHostelImages,
  hostelController.updateHostel
);

router.post(
  '/:id/images',
  hostelMiddleware.validateHostelOwnership,
  hostelMiddleware.uploadHostelImages,
  hostelMiddleware.processHostelImages,
  hostelController.addHostelImages
);

router.delete(
  '/:id',
  hostelMiddleware.checkHostelDeletion,
  hostelController.deleteHostel
);

router.post(
  '/:id/ratings',
  hostelController.addHostelRating
);

// Review routes (POST requires authentication)
router.post('/:id/reviews', hostelController.addHostelReview);

// Individual review management routes
router.patch('/reviews/:id', hostelController.updateHostelReview);
router.delete('/reviews/:id', hostelController.deleteHostelReview);
router.patch('/reviews/:id/helpful', hostelController.markReviewHelpful);

// Admin routes
router.post(
  '/:id/verify',
  authMiddleware.restrictTo('admin'),
  hostelController.verifyHostel
);

module.exports = router;
