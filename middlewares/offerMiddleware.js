const Offer = require('../models/offerModel');
const Request = require('../models/requestModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Check if user owns the offer (seller)
exports.checkOfferOwnership = catchAsync(async (req, res, next) => {
  const offer = await Offer.findById(req.params.id);
  
  if (!offer) {
    return next(new AppError('Offer not found', 404));
  }
  
  if (offer.seller.toString() !== req.user.id) {
    return next(new AppError('You are not authorized to perform this action', 403));
  }
  
  req.offer = offer;
  next();
});

// Check if user can manage the offer (seller or buyer)
exports.checkOfferManagement = catchAsync(async (req, res, next) => {
  const offer = await Offer.findById(req.params.id)
    .populate('seller', '_id')
    .populate({
      path: 'request',
      select: 'requester',
      populate: {
        path: 'requester',
        select: '_id'
      }
    });
  
  if (!offer) {
    return next(new AppError('Offer not found', 404));
  }

  const sellerId = offer.seller._id.toString();
  const buyerId = offer.request.requester._id.toString();
  const userId = req.user.id.toString();

  console.log('Offer Management Check:', {
    sellerId,
    buyerId,
    userId,
    isSeller: sellerId === userId,
    isBuyer: buyerId === userId
  });

  const isSeller = sellerId === userId;
  const isBuyer = buyerId === userId;
  
  if (!isSeller && !isBuyer) {
    return next(new AppError('You are not authorized to manage this offer', 403));
  }
  
  req.offer = offer;
  next();
});

// Check if offer is in a valid state for the action
exports.checkOfferStatus = (allowedStatuses) => {
  return (req, res, next) => {
    if (!req.offer) {
      return next(new AppError('Offer not loaded before status check', 400));
    }
    
    if (!allowedStatuses.includes(req.offer.status)) {
      return next(new AppError(`Offer must be in one of these states: ${allowedStatuses.join(', ')}`, 400));
    }
    
    next();
  };
};

// Check if request is open for new offers
exports.checkRequestOpen = catchAsync(async (req, res, next) => {
  const { request } = req.body;
  
  if (!request) {
    return next();
  }
  
  const requestDoc = await Request.findById(request);
  if (!requestDoc) {
    return next(new AppError('Request not found', 404));
  }
  
  if (requestDoc.status !== 'open') {
    return next(new AppError('Cannot make offers on a closed or fulfilled request', 400));
  }
  
  req.request = requestDoc;
  next();
});

// Check if user can create offers (must be seller)
exports.checkSellerRole = (req, res, next) => {
  // Allow all users to create offers
  next();
};

// Check if user can accept/reject offers (must be buyer)
exports.checkBuyerRole = (req, res, next) => {
  if (req.user.role !== 'user' && req.user.role !== 'admin') {
    return next(new AppError('Only buyers can accept or reject offers', 403));
  }
  next();
};

// Validate offer data before creation/update
exports.validateOfferData = (req, res, next) => {
  const { amount, message } = req.body;
  
  // Validate amount
  if (amount !== undefined) {
    if (typeof amount !== 'number' || amount <= 0) {
      return next(new AppError('Amount must be a positive number', 400));
    }
    
    if (amount > 1000000) {
      return next(new AppError('Amount cannot exceed $1,000,000', 400));
    }
  }
  
  // Validate message
  if (message !== undefined && message.length > 500) {
    return next(new AppError('Message cannot exceed 500 characters', 400));
  }
  
  next();
};

// Check if offer can be withdrawn (only pending offers)
exports.checkWithdrawPermission = (req, res, next) => {
  if (!req.offer) {
    return next(new AppError('Offer not loaded before withdraw check', 400));
  }
  
  if (req.offer.status !== 'pending') {
    return next(new AppError('Only pending offers can be withdrawn', 400));
  }
  
  next();
};

// Check if offer can be accepted (only pending offers)
exports.checkAcceptPermission = (req, res, next) => {
  if (!req.offer) {
    return next(new AppError('Offer not loaded before accept check', 400));
  }
  
  if (req.offer.status !== 'pending') {
    return next(new AppError('Only pending offers can be accepted', 400));
  }
  
  next();
};

// Check if offer can be rejected (only pending offers)
exports.checkRejectPermission = (req, res, next) => {
  if (!req.offer) {
    return next(new AppError('Offer not loaded before reject check', 400));
  }
  
  if (req.offer.status !== 'pending') {
    return next(new AppError('Only pending offers can be rejected', 400));
  }
  
  next();
};

// Populate offer with related data
exports.populateOfferData = catchAsync(async (req, res, next) => {
  if (req.offer) {
    await req.offer.populate([
      { path: 'seller', select: 'fullName email role campus' },
      { path: 'request', select: 'title description status requester' },
      { path: 'product', select: 'name price images' }
    ]);
  }
  next();
});

// Check analytics permissions
exports.checkAnalyticsPermission = (req, res, next) => {
  const { seller, request } = req.query;
  
  // If filtering by specific seller, check if user is that seller or admin
  if (seller && seller !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You can only view analytics for your own offers', 403));
  }
  
  // If filtering by specific request, check if user is the requester or admin
  if (request && req.user.role !== 'admin') {
    // This would need to be enhanced to check if user is the requester
    // For now, allow if user is admin
  }
  
  next();
};

// Rate limiting for offer creation
exports.rateLimitOfferCreation = (req, res, next) => {
  // This would integrate with your rate limiting system
  // For now, just pass through
  next();
};

// Validate bulk operations
exports.validateBulkOperation = (req, res, next) => {
  const { offerIds } = req.body;
  
  if (!Array.isArray(offerIds) || offerIds.length === 0) {
    return next(new AppError('Offer IDs array is required', 400));
  }
  
  if (offerIds.length > 50) {
    return next(new AppError('Cannot process more than 50 offers at once', 400));
  }
  
  // Validate all IDs are valid MongoDB ObjectIds
  const mongoose = require('mongoose');
  const invalidIds = offerIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
  
  if (invalidIds.length > 0) {
    return next(new AppError('Invalid offer IDs provided', 400));
  }
  
  next();
};

// Check if user can perform bulk operations on offers
exports.checkBulkOperationPermission = catchAsync(async (req, res, next) => {
  const { offerIds } = req.body;
  
  // Check if user owns all the offers or is admin
  const offers = await Offer.find({ _id: { $in: offerIds } });
  
  if (offers.length !== offerIds.length) {
    return next(new AppError('Some offers not found', 404));
  }
  
  const unauthorizedOffers = offers.filter(offer => 
    offer.seller.toString() !== req.user.id && req.user.role !== 'admin'
  );
  
  if (unauthorizedOffers.length > 0) {
    return next(new AppError('You can only perform bulk operations on your own offers', 403));
  }
  
  req.offers = offers;
  next();
});

module.exports = exports;