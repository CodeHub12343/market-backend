const express = require('express');
const shopReviewController = require('../controllers/shopReviewController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

const router = express.Router({ mergeParams: true });

router.use(protect);

router
  .route('/')
  .get(shopReviewController.getAllShopReviews)
  .post(
    restrictTo('user'),
    shopReviewController.setShopUserIds,
    shopReviewController.createShopReview
  );

router
  .route('/:id')
  .get(shopReviewController.getShopReview)
  .patch(restrictTo('user', 'admin'), shopReviewController.updateShopReview)
  .delete(restrictTo('user', 'admin'), shopReviewController.deleteShopReview);

module.exports = router;
