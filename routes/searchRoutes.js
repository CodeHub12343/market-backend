const express = require('express');
const searchController = require('../controllers/searchController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Protect all routes after this middleware
router.use(authMiddleware.protect);

// Search routes
router.get('/products', searchController.searchProducts);
router.get('/services', searchController.searchServices);
router.get('/posts', searchController.searchPosts);
router.get('/users', searchController.searchUsers);
router.get('/global', searchController.globalSearch);

module.exports = router;