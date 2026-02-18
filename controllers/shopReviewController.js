const ShopReview = require('../models/shopReviewModel');
const factory = require('./handlerFactory');

// Nested routes
exports.setShopUserIds = (req, res, next) => {
  if (!req.body.shop) req.body.shop = req.params.shopId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

exports.getAllShopReviews = factory.getAll(ShopReview);
exports.getShopReview = factory.getOne(ShopReview);
exports.createShopReview = factory.createOne(ShopReview);
exports.updateShopReview = factory.updateOne(ShopReview);
exports.deleteShopReview = factory.deleteOne(ShopReview);
