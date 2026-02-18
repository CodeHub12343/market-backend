const ShopOffer = require('../models/shopOfferModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');
const { sendToUser } = require('../socketManager');

/**
 * Create a new shop offer
 * @route POST /api/v1/shop-offers
 * @access Private (Shops/Sellers)
 */
exports.createShopOffer = catchAsync(async (req, res, next) => {
  const {
    title,
    description,
    shop,
    category,
    startDate,
    endDate,
    discount,
    location,
    termsConditions,
    maxClaims,
    visibility
  } = req.body;

  // Validate required fields
  if (!title || !shop || !discount?.value || !startDate || !endDate || !location?.address || !location?.campus) {
    return next(new AppError('Missing required fields: title, shop, discount value, dates, address, and campus', 400));
  }

  // Validate discount
  if (discount.type === 'percentage' && (discount.value < 1 || discount.value > 100)) {
    return next(new AppError('Discount percentage must be between 1 and 100', 400));
  }

  if (discount.type === 'flat' && discount.value <= 0) {
    return next(new AppError('Flat discount must be greater than 0', 400));
  }

  // Validate dates
  if (new Date(endDate) <= new Date(startDate)) {
    return next(new AppError('End date must be after start date', 400));
  }

  // Create offer
  const offerData = {
    title,
    description: description || '',
    shop,
    category: category || 'general',
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    discount: {
      type: discount.type,
      value: discount.value
    },
    location: {
      address: location.address,
      campus: location.campus
    },
    termsConditions: termsConditions || '',
    maxClaims: maxClaims ? parseInt(maxClaims) : null,
    visibility: visibility || 'public',
    seller: req.user.id,
    claims: [],
    claimCount: 0,
    image: req.body.image || null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const offer = await ShopOffer.create(offerData);

  // Populate shop data
  await offer.populate('shop', 'name logo');

  res.status(201).json({
    status: 'success',
    data: { offer }
  });
});

/**
 * Get all shop offers with filters
 * @route GET /api/v1/shop-offers
 * @access Public
 */
exports.getAllShopOffers = catchAsync(async (req, res) => {
  // Build query
  let query = ShopOffer.find();

  // Filter by visibility
  if (req.user) {
    query = query.where('$or').equals([
      { visibility: 'public' },
      { visibility: 'campus', 'location.campus': req.user.campus },
      { seller: req.user.id }
    ]);
  } else {
    query = query.where('visibility').equals('public');
  }

  // Filter by active status
  const now = new Date();
  query = query.where('startDate').lte(now).where('endDate').gte(now);

  // Search
  if (req.query.search) {
    query = query.where('$or').equals([
      { title: new RegExp(req.query.search, 'i') },
      { description: new RegExp(req.query.search, 'i') }
    ]);
  }

  // Filter by category
  if (req.query.category) {
    query = query.where('category').equals(req.query.category);
  }

  // Filter by campus
  if (req.query.campus) {
    query = query.where('location.campus').equals(req.query.campus);
  }

  // Pagination
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 12;
  const skip = (page - 1) * limit;

  query = query.skip(skip).limit(limit);

  // Execute query
  const offers = await query
    .populate('shop', 'name logo')
    .populate('location.campus', 'name')
    .sort('-createdAt');

  const total = await ShopOffer.countDocuments(query.getQuery());

  res.status(200).json({
    status: 'success',
    results: offers.length,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    data: { offers }
  });
});

/**
 * Get single shop offer
 * @route GET /api/v1/shop-offers/:id
 * @access Public
 */
exports.getShopOffer = catchAsync(async (req, res, next) => {
  const offer = await ShopOffer.findById(req.params.id)
    .populate('shop', 'name logo')
    .populate('location.campus', 'name')
    .populate('seller', 'fullName avatar');

  if (!offer) {
    return next(new AppError('Offer not found', 404));
  }

  // Check visibility permissions
  if (offer.visibility === 'campus') {
    if (!req.user || offer.location.campus.toString() !== req.user.campus?.toString()) {
      return next(new AppError('This offer is only visible to campus members', 403));
    }
  }

  res.status(200).json({
    status: 'success',
    data: { offer }
  });
});

/**
 * Get user's own offers
 * @route GET /api/v1/shop-offers/my-offers
 * @access Private
 */
exports.getMyShopOffers = catchAsync(async (req, res) => {
  const offers = await ShopOffer.find({ seller: req.user.id })
    .populate('shop', 'name logo')
    .populate('location.campus', 'name')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: offers.length,
    data: { offers }
  });
});

/**
 * Update shop offer
 * @route PATCH /api/v1/shop-offers/:id
 * @access Private
 */
exports.updateShopOffer = catchAsync(async (req, res, next) => {
  let offer = await ShopOffer.findById(req.params.id);

  if (!offer) {
    return next(new AppError('Offer not found', 404));
  }

  // Check ownership
  if (offer.seller.toString() !== req.user.id.toString()) {
    return next(new AppError('You are not authorized to update this offer', 403));
  }

  // Check if already expired
  if (new Date() > offer.endDate) {
    return next(new AppError('Cannot update an expired offer', 400));
  }

  // Update allowed fields
  const allowedFields = [
    'title', 'description', 'category', 'startDate', 'endDate',
    'discount', 'termsConditions', 'maxClaims', 'visibility'
  ];

  const updateData = {};
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  // Validate dates if updated
  if (updateData.startDate || updateData.endDate) {
    const startDate = new Date(updateData.startDate || offer.startDate);
    const endDate = new Date(updateData.endDate || offer.endDate);
    if (endDate <= startDate) {
      return next(new AppError('End date must be after start date', 400));
    }
  }

  // Validate discount if updated
  if (updateData.discount) {
    if (updateData.discount.type === 'percentage' && (updateData.discount.value < 1 || updateData.discount.value > 100)) {
      return next(new AppError('Discount percentage must be between 1 and 100', 400));
    }
  }

  updateData.updatedAt = new Date();

  offer = await ShopOffer.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
    .populate('shop', 'name logo')
    .populate('location.campus', 'name');

  res.status(200).json({
    status: 'success',
    data: { offer }
  });
});

/**
 * Delete shop offer
 * @route DELETE /api/v1/shop-offers/:id
 * @access Private
 */
exports.deleteShopOffer = catchAsync(async (req, res, next) => {
  const offer = await ShopOffer.findById(req.params.id);

  if (!offer) {
    return next(new AppError('Offer not found', 404));
  }

  // Check ownership
  if (offer.seller.toString() !== req.user.id.toString()) {
    return next(new AppError('You are not authorized to delete this offer', 403));
  }

  await ShopOffer.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null
  });
});

/**
 * Claim an offer
 * @route POST /api/v1/shop-offers/:id/claim
 * @access Private
 */
exports.claimShopOffer = catchAsync(async (req, res, next) => {
  const offer = await ShopOffer.findById(req.params.id);

  if (!offer) {
    return next(new AppError('Offer not found', 404));
  }

  // Check if already claimed
  const existingClaim = offer.claims.find(claim => claim.user.toString() === req.user.id.toString());
  if (existingClaim) {
    return next(new AppError('You have already claimed this offer', 400));
  }

  // Check max claims
  if (offer.maxClaims && offer.claimCount >= offer.maxClaims) {
    return next(new AppError('Maximum claims reached for this offer', 400));
  }

  // Check if offer is still active
  const now = new Date();
  if (now < offer.startDate || now > offer.endDate) {
    return next(new AppError('This offer is no longer active', 400));
  }

  // Add claim
  offer.claims.push({
    user: req.user.id,
    claimedAt: new Date(),
    status: 'claimed'
  });
  offer.claimCount += 1;

  await offer.save();

  res.status(200).json({
    status: 'success',
    message: 'Offer claimed successfully',
    data: { offer }
  });
});

/**
 * Unclaim an offer
 * @route POST /api/v1/shop-offers/:id/unclaim
 * @access Private
 */
exports.unclaimShopOffer = catchAsync(async (req, res, next) => {
  const offer = await ShopOffer.findById(req.params.id);

  if (!offer) {
    return next(new AppError('Offer not found', 404));
  }

  // Find and remove claim
  const claimIndex = offer.claims.findIndex(claim => claim.user.toString() === req.user.id.toString());
  if (claimIndex === -1) {
    return next(new AppError('You have not claimed this offer', 400));
  }

  offer.claims.splice(claimIndex, 1);
  offer.claimCount = Math.max(0, offer.claimCount - 1);

  await offer.save();

  res.status(200).json({
    status: 'success',
    message: 'Offer unclaimed successfully',
    data: { offer }
  });
});

/**
 * Toggle favorite
 * @route POST /api/v1/shop-offers/:id/favorite
 * @access Private
 */
exports.toggleFavoriteShopOffer = catchAsync(async (req, res, next) => {
  const offer = await ShopOffer.findById(req.params.id);

  if (!offer) {
    return next(new AppError('Offer not found', 404));
  }

  const favoriteIndex = offer.favorites?.findIndex(fav => fav.toString() === req.user.id.toString()) ?? -1;

  if (favoriteIndex === -1) {
    // Add to favorites
    if (!offer.favorites) offer.favorites = [];
    offer.favorites.push(req.user.id);
  } else {
    // Remove from favorites
    offer.favorites.splice(favoriteIndex, 1);
  }

  await offer.save();

  res.status(200).json({
    status: 'success',
    message: favoriteIndex === -1 ? 'Added to favorites' : 'Removed from favorites',
    data: { offer }
  });
});

/**
 * Get trending offers
 * @route GET /api/v1/shop-offers/trending
 * @access Public
 */
exports.getTrendingShopOffers = catchAsync(async (req, res) => {
  const now = new Date();

  const offers = await ShopOffer.find({
    startDate: { $lte: now },
    endDate: { $gte: now },
    visibility: 'public'
  })
    .populate('shop', 'name logo')
    .populate('location.campus', 'name')
    .sort('-claimCount')
    .limit(12);

  res.status(200).json({
    status: 'success',
    results: offers.length,
    data: { offers }
  });
});

/**
 * Search offers
 * @route GET /api/v1/shop-offers/search
 * @access Public
 */
exports.searchShopOffers = catchAsync(async (req, res) => {
  const { query, category, campus } = req.query;

  let searchQuery = {};

  if (query) {
    searchQuery.$or = [
      { title: new RegExp(query, 'i') },
      { description: new RegExp(query, 'i') }
    ];
  }

  if (category) {
    searchQuery.category = category;
  }

  if (campus) {
    searchQuery['location.campus'] = campus;
  }

  // Add visibility filter
  const now = new Date();
  searchQuery.startDate = { $lte: now };
  searchQuery.endDate = { $gte: now };

  const offers = await ShopOffer.find(searchQuery)
    .populate('shop', 'name logo')
    .populate('location.campus', 'name')
    .sort('-createdAt')
    .limit(20);

  res.status(200).json({
    status: 'success',
    results: offers.length,
    data: { offers }
  });
});
