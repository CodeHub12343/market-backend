const express = require('express')
const roommateReviewController = require('../controllers/roommateReviewController')
const authMiddleware = require('../middlewares/authMiddleware')

const router = express.Router()

// Public routes
router.get('/:id', roommateReviewController.getReview)
router.get('/stats/:roommateId', roommateReviewController.getReviewStats)

// Get reviews for roommate - GET /api/v1/roommate-reviews?roommate=:id
router.get('/', roommateReviewController.getRoommateReviews)

// Protected routes
router.use(authMiddleware.protect)

// Create review - POST /api/v1/roommate-reviews with roommate in body
router.post('/', roommateReviewController.createReview)

// Update review
router.patch('/:id', roommateReviewController.updateReview)

// Delete review
router.delete('/:id', roommateReviewController.deleteReview)

// Mark as helpful/unhelpful
router.post('/:id/helpful', roommateReviewController.markHelpful)
router.post('/:id/unhelpful', roommateReviewController.markUnhelpful)

module.exports = router
