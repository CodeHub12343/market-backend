const RoommateApplication = require('../models/roommateApplicationModel')
const RoommateListing = require('../models/roommateListingModel')
const User = require('../models/userModel')
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/appError')
const APIFeatures = require('../utils/apiFeatures')

// Create application
exports.createApplication = catchAsync(async (req, res, next) => {
  const { roommateId, message, budget, moveInDate, leaseDuration } = req.body

  if (!roommateId) {
    return next(new AppError('Roommate ID is required', 400))
  }

  // Validate roommate exists
  const roommate = await RoommateListing.findById(roommateId)
  if (!roommate) {
    return next(new AppError('Roommate listing not found', 404))
  }

  // Check if already applied
  const existingApplication = await RoommateApplication.findOne({
    roommate: roommateId,
    applicant: req.user._id,
    status: { $in: ['pending', 'approved'] }
  })

  if (existingApplication) {
    return next(new AppError('You have already applied for this listing', 400))
  }

  const application = await RoommateApplication.create({
    roommate: roommateId,
    applicant: req.user._id,
    landlord: roommate.poster,
    message,
    budget,
    moveInDate,
    leaseDuration
  })

  // Populate and return
  await application.populate([
    { path: 'applicant', select: 'firstName lastName email avatar' },
    { path: 'roommate', select: 'title location' }
  ])

  res.status(201).json({
    status: 'success',
    data: { application }
  })
})

// Get user's applications (both sent and received)
exports.getMyApplications = catchAsync(async (req, res, next) => {
  const { status, type } = req.query
  const page = req.query.page * 1 || 1
  const limit = req.query.limit * 1 || 12
  const skip = (page - 1) * limit

  let query = {}

  if (type === 'sent') {
    query.applicant = req.user._id
  } else if (type === 'received') {
    query.landlord = req.user._id
  } else {
    // Get both
    query = {
      $or: [{ applicant: req.user._id }, { landlord: req.user._id }]
    }
  }

  if (status) {
    query.status = status
  }

  const applications = await RoommateApplication.find(query)
    .populate('applicant', 'firstName lastName email avatar')
    .populate('roommate', 'title location budget poster images')
    .populate('landlord', 'firstName lastName email avatar')
    .skip(skip)
    .limit(limit)
    .sort('-createdAt')

  const total = await RoommateApplication.countDocuments(query)

  res.status(200).json({
    status: 'success',
    results: applications.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: { applications }
  })
})

// Get application details
exports.getApplication = catchAsync(async (req, res, next) => {
  const application = await RoommateApplication.findById(req.params.id)
    .populate('applicant', 'firstName lastName email avatar')
    .populate('roommate', 'title location budget poster images')
    .populate('landlord', 'firstName lastName email avatar')

  if (!application) {
    return next(new AppError('Application not found', 404))
  }

  // Check authorization
  if (
    req.user._id.toString() !== application.applicant._id.toString() &&
    req.user._id.toString() !== application.landlord._id.toString()
  ) {
    return next(new AppError('Not authorized to view this application', 403))
  }

  res.status(200).json({
    status: 'success',
    data: { application }
  })
})

// Approve application (landlord)
exports.approveApplication = catchAsync(async (req, res, next) => {
  const { responseMessage } = req.body

  const application = await RoommateApplication.findById(req.params.id)
    .populate('landlord', 'fullName email')
    .populate('roommate', 'title poster')

  if (!application) {
    return next(new AppError('Application not found', 404))
  }

  console.log('🔍 Approve check - Current user:', req.user._id.toString())
  console.log('🔍 Approve check - Application landlord:', application.landlord?._id?.toString())
  console.log('🔍 Approve check - Roommate poster:', application.roommate?.poster?.toString())

  // Check authorization - user must be the landlord
  if (!application.landlord) {
    // Fallback: if landlord not populated, check if user is the poster of the roommate listing
    const listing = await RoommateListing.findById(application.roommate)
    if (req.user._id.toString() !== listing.poster.toString()) {
      return next(new AppError('Not authorized to approve this application', 403))
    }
  } else if (req.user._id.toString() !== application.landlord._id.toString()) {
    return next(new AppError('Not authorized to approve this application', 403))
  }

  application.status = 'approved'
  application.responseMessage = responseMessage
  application.responseDate = Date.now()
  await application.save()

  await application.populate([
    { path: 'applicant', select: 'firstName lastName email avatar' },
    { path: 'roommate', select: 'title location' }
  ])

  res.status(200).json({
    status: 'success',
    data: { application }
  })
})

// Reject application (landlord)
exports.rejectApplication = catchAsync(async (req, res, next) => {
  const { responseMessage } = req.body

  const application = await RoommateApplication.findById(req.params.id)
    .populate('landlord', 'fullName email')
    .populate('roommate', 'title poster')

  if (!application) {
    return next(new AppError('Application not found', 404))
  }

  console.log('🔍 Reject check - Current user:', req.user._id.toString())
  console.log('🔍 Reject check - Application landlord:', application.landlord?._id?.toString())
  console.log('🔍 Reject check - Roommate poster:', application.roommate?.poster?.toString())

  // Check authorization - user must be the landlord
  if (!application.landlord) {
    // Fallback: if landlord not populated, check if user is the poster of the roommate listing
    const listing = await RoommateListing.findById(application.roommate)
    if (req.user._id.toString() !== listing.poster.toString()) {
      return next(new AppError('Not authorized to reject this application', 403))
    }
  } else if (req.user._id.toString() !== application.landlord._id.toString()) {
    return next(new AppError('Not authorized to reject this application', 403))
  }

  application.status = 'rejected'
  application.responseMessage = responseMessage
  application.responseDate = Date.now()
  await application.save()

  await application.populate([
    { path: 'applicant', select: 'firstName lastName email avatar' },
    { path: 'roommate', select: 'title location' }
  ])

  res.status(200).json({
    status: 'success',
    data: { application }
  })
})

// Withdraw application (applicant)
exports.withdrawApplication = catchAsync(async (req, res, next) => {
  const application = await RoommateApplication.findById(req.params.id)

  if (!application) {
    return next(new AppError('Application not found', 404))
  }

  // Check authorization
  if (req.user._id.toString() !== application.applicant.toString()) {
    return next(new AppError('Not authorized to withdraw this application', 403))
  }

  if (application.status === 'approved') {
    return next(new AppError('Cannot withdraw an approved application', 400))
  }

  application.status = 'withdrawn'
  await application.save()

  res.status(200).json({
    status: 'success',
    message: 'Application withdrawn successfully',
    data: { application }
  })
})

// Get roommate's applications
exports.getRoommateApplications = catchAsync(async (req, res, next) => {
  const { roommateId } = req.params
  const { status } = req.query
  const page = req.query.page * 1 || 1
  const limit = req.query.limit * 1 || 12
  const skip = (page - 1) * limit

  // Verify roommate ownership
  const roommate = await RoommateListing.findById(roommateId)
  if (!roommate) {
    return next(new AppError('Roommate listing not found', 404))
  }

  if (req.user._id.toString() !== roommate.poster.toString()) {
    return next(new AppError('Not authorized to view these applications', 403))
  }

  let query = { roommate: roommateId }
  if (status) {
    query.status = status
  }

  const applications = await RoommateApplication.find(query)
    .skip(skip)
    .limit(limit)
    .sort('-createdAt')

  const total = await RoommateApplication.countDocuments(query)

  res.status(200).json({
    status: 'success',
    results: applications.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: { applications }
  })
})
