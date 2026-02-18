const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const serviceReviewController = require('../controllers/serviceReviewController');

const router = express.Router();

router
  .route('/')
  .get(serviceReviewController.getAllServiceReviews)
  .post(authMiddleware.protect, serviceReviewController.createServiceReview);

router
  .route('/:id')
  .get(serviceReviewController.getServiceReview)
  .patch(authMiddleware.protect, serviceReviewController.updateServiceReview)
  .delete(authMiddleware.protect, serviceReviewController.deleteServiceReview);

module.exports = router;
