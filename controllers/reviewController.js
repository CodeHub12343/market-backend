// src/controllers/reviewController.js
const Review = require('../models/reviewModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Create Review
exports.createReview = catchAsync(async (req, res, next) => {
  if (!req.body.product) req.body.product = req.params.productId;
  if (!req.body.user) req.body.user = req.user.id;

  const review = await Review.create(req.body);
  await review.populate({ path: 'user', select: 'fullName avatar role campus' });
  
  res.status(201).json({
    status: 'success',
    data: { review },
  });
});

// Get all reviews (optionally filter by product)
exports.getAllReviews = catchAsync(async (req, res, next) => {
  // If productId is provided, verify product exists first
  if (req.params.productId) {
    const Product = require('../models/productModel');
    const product = await Product.findById(req.params.productId);
    
    if (!product) {
      return next(new AppError('Product not found', 404));
    }
  }

  const filter = req.params.productId ? { product: req.params.productId } : {};
  const reviews = await Review.find(filter)
    .populate({
      path: 'user',
      select: 'fullName avatar'
    })
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: { reviews },
  });
});

// Update review (only author or admin)
exports.updateReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  if (!review) return next(new AppError('Review not found', 404));

  if (review.user.id !== req.user.id && req.user.role !== 'admin')
    return next(new AppError('You are not authorized to edit this review', 403));

  const updated = await Review.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  res.status(200).json({
    status: 'success',
    data: { review: updated },
  });
});

// Delete review
exports.deleteReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  if (!review) return next(new AppError('Review not found', 404));

  if (review.user.id !== req.user.id && req.user.role !== 'admin')
    return next(new AppError('You are not authorized to delete this review', 403));

  await Review.findByIdAndDelete(req.params.id);
  res.status(204).json({ status: 'success', data: null });
});
