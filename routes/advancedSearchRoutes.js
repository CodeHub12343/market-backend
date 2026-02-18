const express = require('express');
const router = express.Router();
const advancedSearchController = require('../controllers/advancedSearchController');
const { protect } = require('../middlewares/authMiddleware');

// Public search routes
router.get('/products', advancedSearchController.searchProducts);
router.get('/services', advancedSearchController.searchServices);
router.get('/global', advancedSearchController.globalSearch);
router.get('/autocomplete', advancedSearchController.getAutocomplete);

// Trending searches (public)
router.get('/trending', advancedSearchController.getTrendingSearches);

// Protected routes (require authentication)
router.use(protect);

// Saved searches
router.get('/saved', advancedSearchController.getSavedSearches);
router.post('/saved', advancedSearchController.createSavedSearch);
router.get('/saved/:id', advancedSearchController.getSavedSearch);
router.patch('/saved/:id', advancedSearchController.updateSavedSearch);
router.delete('/saved/:id', advancedSearchController.deleteSavedSearch);
router.post('/saved/:id/execute', advancedSearchController.executeSavedSearch);

// Analytics
router.get('/analytics', advancedSearchController.getSearchAnalytics);
router.post('/feedback', advancedSearchController.recordSearchFeedback);

module.exports = router;
