const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const { protect } = require('../middlewares/authMiddleware');

// Trending recommendations (public)
router.get('/trending', recommendationController.getTrendingRecommendations);

// Product-specific recommendations (public)
router.get('/product/:productId', recommendationController.getProductRecommendations);

// Protected routes (require authentication)
router.use(protect);

// Get personalized recommendations
router.get('/', recommendationController.getRecommendations);

// Recommendation interactions
router.post('/:recommendationId/click', recommendationController.markRecommationAsClicked);
router.post('/:recommendationId/dismiss', recommendationController.dismissRecommendation);
router.post('/:recommendationId/rate', recommendationController.rateRecommendation);

// Analytics
router.get('/analytics', recommendationController.getRecommendationAnalytics);

module.exports = router;
