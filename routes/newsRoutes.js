// routes/newsRoutes.js
const express = require('express');
const newsController = require('../controllers/newsController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Public routes
router.get('/', newsController.getAll);
router.get('/trending', newsController.getTrendingNews);
router.get('/featured', newsController.getFeaturedNews);
router.get('/category/:category', newsController.getNewsByCategory);
router.get('/:id', newsController.get);

// View tracking
router.post('/:id/view', newsController.incrementNewsViews);

// Protected routes (create/update/delete) - restrict to admin/editor roles
router.use(authMiddleware.protect);

// Saved news
router.post('/:id/save', newsController.saveNews);
router.get('/saved/my', newsController.getSavedNews);

// Analytics
router.get('/:id/analytics', newsController.getNewsAnalytics);

// Create: only admin/editor and accept optional banner image under field 'image'
router.post('/', newsController.uploadBanner, newsController.create);

// Update: only admin/editor and accept banner replacement
router.patch('/:id', authMiddleware.restrictTo('admin', 'editor'), newsController.uploadBanner, newsController.update);
router.delete('/:id', authMiddleware.restrictTo('admin', 'editor'), newsController.delete);

module.exports = router;
