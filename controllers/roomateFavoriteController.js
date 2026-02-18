const RoomateFavorite = require('../models/roomateFavoriteModel')
const RoommateListing = require('../models/roommateListingModel')
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/appError')

// Add to favorites
exports.addToFavorites = catchAsync(async (req, res, next) => {
  const { roommateId } = req.params
  const { notes } = req.body

  // Verify roommate exists
  const roommate = await RoommateListing.findById(roommateId)
  if (!roommate) {
    return next(new AppError('Roommate listing not found', 404))
  }

  // Check if already favorited
  const existingFavorite = await RoomateFavorite.findOne({
    user: req.user._id,
    roommate: roommateId
  })

  if (existingFavorite) {
    return next(new AppError('Already in favorites', 400))
  }

  const favorite = await RoomateFavorite.create({
    user: req.user._id,
    roommate: roommateId,
    notes
  })

  await favorite.populate('roommate', 'title location images budget')

  res.status(201).json({
    status: 'success',
    data: { favorite }
  })
})

// Remove from favorites
exports.removeFromFavorites = catchAsync(async (req, res, next) => {
  const { roommateId } = req.params

  const favorite = await RoomateFavorite.findOneAndDelete({
    user: req.user._id,
    roommate: roommateId
  })

  if (!favorite) {
    return next(new AppError('Not in favorites', 404))
  }

  res.status(204).json({
    status: 'success',
    data: null
  })
})

// Get user's favorites
exports.getMyFavorites = catchAsync(async (req, res, next) => {
  const page = req.query.page * 1 || 1
  const limit = req.query.limit * 1 || 12
  const skip = (page - 1) * limit

  const favorites = await RoomateFavorite.find({ user: req.user._id })
    .skip(skip)
    .limit(limit)
    .sort('-savedAt')

  const total = await RoomateFavorite.countDocuments({ user: req.user._id })

  // Extract roommate data for display
  const roommates = favorites.map(fav => ({
    ...fav.roommate.toObject(),
    savedAt: fav.savedAt,
    notes: fav.notes
  }))

  res.status(200).json({
    status: 'success',
    results: favorites.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: { roommates, favorites }
  })
})

// Check if favorited
exports.checkFavorite = catchAsync(async (req, res, next) => {
  const { roommateId } = req.params

  const favorite = await RoomateFavorite.findOne({
    user: req.user._id,
    roommate: roommateId
  })

  res.status(200).json({
    status: 'success',
    data: {
      isFavorited: !!favorite,
      favorite
    }
  })
})

// Toggle favorite (add or remove)
exports.toggleFavorite = catchAsync(async (req, res, next) => {
  const { roommateId } = req.params
  const { notes } = req.body

  // Verify roommate exists
  const roommate = await RoommateListing.findById(roommateId)
  if (!roommate) {
    return next(new AppError('Roommate listing not found', 404))
  }

  let favorite = await RoomateFavorite.findOne({
    user: req.user._id,
    roommate: roommateId
  })

  if (favorite) {
    // Remove from favorites
    await RoomateFavorite.findByIdAndDelete(favorite._id)
    res.status(200).json({
      status: 'success',
      message: 'Removed from favorites',
      data: { isFavorited: false }
    })
  } else {
    // Add to favorites
    favorite = await RoomateFavorite.create({
      user: req.user._id,
      roommate: roommateId,
      notes
    })

    await favorite.populate('roommate', 'title location images budget')

    res.status(201).json({
      status: 'success',
      message: 'Added to favorites',
      data: { isFavorited: true, favorite }
    })
  }
})

// Update favorite notes
exports.updateFavoriteNotes = catchAsync(async (req, res, next) => {
  const { roommateId } = req.params
  const { notes } = req.body

  const favorite = await RoomateFavorite.findOneAndUpdate(
    { user: req.user._id, roommate: roommateId },
    { notes },
    { new: true }
  )

  if (!favorite) {
    return next(new AppError('Not in favorites', 404))
  }

  res.status(200).json({
    status: 'success',
    data: { favorite }
  })
})
