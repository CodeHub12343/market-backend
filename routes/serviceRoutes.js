const express = require('express');
const serviceController = require('../controllers/serviceController');
const serviceReviewController = require('../controllers/serviceReviewController');
const authMiddleware = require('../middlewares/authMiddleware');
const serviceMiddleware = require('../middlewares/serviceMiddleware');

const router = express.Router();

// Search endpoints (before /:id routes to avoid conflicts)
router.get('/search/advanced', serviceController.advancedSearchServices);
router.get('/search/suggestions', serviceController.getServiceSearchSuggestions);
router.get('/search/popular', serviceController.getPopularServiceSearches);
router.get('/search/locations', serviceController.getServiceLocations);
router.get('/search/history', serviceController.getSearchHistory);
router.post('/search/history', authMiddleware.protect, serviceController.saveServiceSearchHistory);
router.delete('/search/history', authMiddleware.protect, serviceController.clearServiceSearchHistory);
router.delete('/search/history/:id', authMiddleware.protect, serviceController.deleteServiceSearchHistoryItem);

// Recommendations endpoints (before /:id routes to avoid conflicts)
router.get('/popular', serviceController.getPopularServiceSearches);
router.get('/recommendations/personalized', authMiddleware.protect, serviceController.getPersonalizedServiceRecommendations);

// Get current user's services
router.get('/me', authMiddleware.protect, serviceController.getMyServices);

router
  .route('/')
  .get(authMiddleware.protect, serviceController.getAllServices)
  // Use upload & processing middlewares so multipart/form-data (files + fields) are parsed
  .post(
    authMiddleware.protect,
    serviceMiddleware.uploadServiceImages,
    serviceMiddleware.processServiceImages,
    serviceMiddleware.parseServiceFormData,
    serviceMiddleware.validateServiceData,
    serviceController.createService
  );

// Get service statistics (before /:id routes)
router.get('/:id/stats', serviceController.getServiceStats);

// Service detail endpoints
router.get('/:id/reviews', serviceController.getServiceReviews);
router.get('/:id/reviews/stats', serviceController.getServiceReviewStats);
router.post('/:id/reviews', authMiddleware.protect, serviceReviewController.createServiceReview);
router.get('/:id/related', serviceController.getRelatedServices);
router.get('/:id/options', serviceController.getServiceOptions);
router.get('/:id/is-favorited', authMiddleware.protect, serviceController.checkIfServiceFavorited);

router
  .route('/:id')
  .get(serviceController.getService)
  .patch(
    authMiddleware.protect,
    serviceMiddleware.uploadServiceImages,
    serviceMiddleware.processServiceImages,
    serviceController.updateService
  )
  .delete(authMiddleware.protect, serviceController.deleteService);

module.exports = router;

