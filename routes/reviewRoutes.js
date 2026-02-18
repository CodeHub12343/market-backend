// src/routes/reviewRoutes.js
const express = require('express');
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router({ mergeParams: true });

// All routes below require authentication
router.use(authMiddleware.protect);

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(authMiddleware.restrictTo('buyer', 'seller', 'service_provider'), reviewController.createReview);

router
  .route('/:id')
  .patch(reviewController.updateReview)
  .delete(reviewController.deleteReview);

module.exports = router;
