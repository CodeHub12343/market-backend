const express = require('express')
const roomateFavoriteController = require('../controllers/roomateFavoriteController')
const authMiddleware = require('../middlewares/authMiddleware')

const router = express.Router()

// All routes require authentication
router.use(authMiddleware.protect)

// Get user's favorites
router.get('/', roomateFavoriteController.getMyFavorites)

// Check if favorited
router.get('/:roommateId/check', roomateFavoriteController.checkFavorite)

// Add to favorites
router.post('/:roommateId', roomateFavoriteController.addToFavorites)

// Toggle favorite (add or remove)
router.post('/:roommateId/toggle', roomateFavoriteController.toggleFavorite)

// Update favorite notes
router.patch('/:roommateId', roomateFavoriteController.updateFavoriteNotes)

// Remove from favorites
router.delete('/:roommateId', roomateFavoriteController.removeFromFavorites)

module.exports = router
