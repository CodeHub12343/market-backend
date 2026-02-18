const ServiceReview = require('../models/serviceReviewModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Create a new review
exports.createServiceReview = catchAsync(async (req, res, next) => {
  const { service, rating, review, title } = req.body;

  if (!service || !rating || !review || !title) {
    return next(new AppError('Service ID, rating, title, and review content are required', 400));
  }

  const newReview = await ServiceReview.create({
    service,
    rating,
    review,
    title,
    user: req.user._id
  });

  await newReview.populate({ path: 'user', select: 'fullName role campus' });

  res.status(201).json({
    status: 'success',
    data: { review: newReview }
  });
});

// Get all reviews
exports.getAllServiceReviews = catchAsync(async (req, res, next) => {
  const filter = req.query.service ? { service: req.query.service } : {};
  const reviews = await ServiceReview.find(filter).sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: reviews
  });
});

// Get single review
exports.getServiceReview = catchAsync(async (req, res, next) => {
  const review = await ServiceReview.findById(req.params.id);
  if (!review) return next(new AppError('Review not found', 404));

  res.status(200).json({ status: 'success', data: review });
});

// Update review (only owner)
exports.updateServiceReview = catchAsync(async (req, res, next) => {
  const review = await ServiceReview.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    req.body,
    { new: true, runValidators: true }
  )
    .populate({ path: 'user', select: 'fullName role campus' });

  if (!review) return next(new AppError('Not authorized or review not found', 404));
  res.status(200).json({ status: 'success', data: { review } });
});

// Delete review (only owner)
exports.deleteServiceReview = catchAsync(async (req, res, next) => {
  const review = await ServiceReview.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id
  });

  if (!review) return next(new AppError('Review not found or unauthorized', 404));
  res.status(204).json({ status: 'success', data: null });
});
