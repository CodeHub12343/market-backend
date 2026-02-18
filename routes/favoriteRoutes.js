// routes/favoriteRoutes.js
const express = require('express');
const favoriteController = require('../controllers/favoriteController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// All favorite routes require authentication
router.use(authMiddleware.protect);

// Toggle favorite (add/remove)
router.post('/toggle', favoriteController.toggleFavorite);

// Create explicit favorite (optional)
router.post('/', favoriteController.createFavorite);

// Get all favorites for current user (optional query ?itemType=Post)
router.get('/', favoriteController.getAllFavorites);

// Get single favorite
router.get('/:id', favoriteController.getFavorite);

// Delete favorite
router.delete('/:id', favoriteController.deleteFavorite);

module.exports = router;
