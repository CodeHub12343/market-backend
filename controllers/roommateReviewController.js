const RoommateReview = require('../models/roommateReviewModel')
const RoommateListing = require('../models/roommateListingModel')
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/appError')

// Create review
exports.createReview = catchAsync(async (req, res, next) => {
  const { roommate, rating, categories, comment } = req.body

  if (!roommate) {
    return next(new AppError('Roommate ID is required', 400))
  }

  // Validate roommate exists
  const roommateData = await RoommateListing.findById(roommate)
  if (!roommateData) {
    return next(new AppError('Roommate listing not found', 404))
  }

  // Check if review already exists
  const existingReview = await RoommateReview.findOne({
    roommate,
    reviewer: req.user._id
  })

  if (existingReview) {
    return next(new AppError('You have already reviewed this listing', 400))
  }

  const review = await RoommateReview.create({
    roommate,
    reviewer: req.user._id,
    landlord: roommateData.poster,
    rating,
    categories,
    comment
  })

  // Recalculate averages
  await RoommateReview.calcAverageRating(roommate)

  await review.populate('reviewer', 'firstName lastName avatar')

  res.status(201).json({
    status: 'success',
    data: { review }
  })
})

// Get reviews for a roommate
exports.getRoommateReviews = catchAsync(async (req, res, next) => {
  const { roommate } = req.query
  const page = req.query.page * 1 || 1
  const limit = req.query.limit * 1 || 10
  const skip = (page - 1) * limit

  if (!roommate) {
    return next(new AppError('Roommate ID is required', 400))
  }

  // Verify roommate exists
  const roommateData = await RoommateListing.findById(roommate)
  if (!roommateData) {
    return next(new AppError('Roommate listing not found', 404))
  }

  const reviews = await RoommateReview.find({
    roommate,
    status: 'approved'
  })
    .skip(skip)
    .limit(limit)
    .sort('-createdAt')

  const total = await RoommateReview.countDocuments({
    roommate,
    status: 'approved'
  })

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: { reviews }
  })
})

// Get review details
exports.getReview = catchAsync(async (req, res, next) => {
  const review = await RoommateReview.findById(req.params.id)

  if (!review) {
    return next(new AppError('Review not found', 404))
  }

  res.status(200).json({
    status: 'success',
    data: { review }
  })
})

// Update review
exports.updateReview = catchAsync(async (req, res, next) => {
  const { rating, categories, comment } = req.body

  let review = await RoommateReview.findById(req.params.id)

  if (!review) {
    return next(new AppError('Review not found', 404))
  }

  // Check authorization
  if (req.user._id.toString() !== review.reviewer.toString()) {
    return next(new AppError('Not authorized to update this review', 403))
  }

  // Update fields
  if (rating) review.rating = rating
  if (categories) review.categories = categories
  if (comment) review.comment = comment

  await review.save()

  // Recalculate averages
  await RoommateReview.calcAverageRating(review.roommate)

  await review.populate('reviewer', 'firstName lastName avatar')

  res.status(200).json({
    status: 'success',
    data: { review }
  })
})

// Delete review
exports.deleteReview = catchAsync(async (req, res, next) => {
  const review = await RoommateReview.findById(req.params.id)

  if (!review) {
    return next(new AppError('Review not found', 404))
  }

  // Check authorization
  if (req.user._id.toString() !== review.reviewer.toString()) {
    return next(new AppError('Not authorized to delete this review', 403))
  }

  const roommateId = review.roommate
  await RoommateReview.findByIdAndDelete(req.params.id)

  // Recalculate averages
  await RoommateReview.calcAverageRating(roommateId)

  res.status(204).json({
    status: 'success',
    data: null
  })
})

// Get review stats for roommate
exports.getReviewStats = catchAsync(async (req, res, next) => {
  const { roommateId } = req.params
  const mongoose = require('mongoose')

  const stats = await RoommateReview.aggregate([
    { $match: { roommate: new mongoose.Types.ObjectId(roommateId), status: 'approved' } },
    {
      $group: {
        _id: '$roommate',
        avgRating: { $avg: '$rating' },
        avgCleanliness: { $avg: '$categories.cleanliness' },
        avgCommunication: { $avg: '$categories.communication' },
        avgRespectful: { $avg: '$categories.respectful' },
        totalReviews: { $sum: 1 },
        ratingDistribution: { $push: '$rating' }
      }
    }
  ])

  if (stats.length === 0) {
    return res.status(200).json({
      status: 'success',
      data: {
        stats: {
          avgRating: 0,
          totalReviews: 0,
          avgCleanliness: 0,
          avgCommunication: 0,
          avgRespectful: 0
        }
      }
    })
  }

  const stat = stats[0]
  const ratingCounts = stat.ratingDistribution.reduce((acc, rating) => {
    acc[rating] = (acc[rating] || 0) + 1
    return acc
  }, {})

  res.status(200).json({
    status: 'success',
    data: {
      stats: {
        avgRating: stat.avgRating.toFixed(1),
        totalReviews: stat.totalReviews,
        avgCleanliness: stat.avgCleanliness.toFixed(1),
        avgCommunication: stat.avgCommunication.toFixed(1),
        avgRespectful: stat.avgRespectful.toFixed(1),
        ratingDistribution: ratingCounts
      }
    }
  })
})

// Mark review as helpful
exports.markHelpful = catchAsync(async (req, res, next) => {
  const review = await RoommateReview.findByIdAndUpdate(
    req.params.id,
    { $inc: { helpfulCount: 1 } },
    { new: true }
  )

  res.status(200).json({
    status: 'success',
    data: { review }
  })
})

// Mark review as unhelpful
exports.markUnhelpful = catchAsync(async (req, res, next) => {
  const review = await RoommateReview.findByIdAndUpdate(
    req.params.id,
    { $inc: { unhelpfulCount: 1 } },
    { new: true }
  )

  res.status(200).json({
    status: 'success',
    data: { review }
  })
})
