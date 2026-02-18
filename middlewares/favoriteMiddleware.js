const Favorite = require('../models/favoriteModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Check if user owns the favorite
exports.checkFavoriteOwnership = catchAsync(async (req, res, next) => {
  const favorite = await Favorite.findById(req.params.id);
  if (!favorite) return next(new AppError('Favorite not found', 404));
  
  if (favorite.user.toString() !== req.user._id.toString()) {
    return next(new AppError('You do not have permission to access this favorite', 403));
  }
  
  req.favorite = favorite;
  next();
});

// Check if user can manage favorites (owner or admin)
exports.checkFavoriteManagement = catchAsync(async (req, res, next) => {
  const favorite = await Favorite.findById(req.params.id);
  if (!favorite) return next(new AppError('Favorite not found', 404));
  
  const isOwner = favorite.user.toString() === req.user._id.toString();
  const isAdmin = req.user.role && ['admin', 'moderator'].includes(req.user.role);
  
  if (!isOwner && !isAdmin) {
    return next(new AppError('You do not have permission to manage this favorite', 403));
  }
  
  req.favorite = favorite;
  next();
});

// Validate item exists before favoriting
exports.validateItemExists = catchAsync(async (req, res, next) => {
  const { itemId, itemType } = req.body;
  
  if (!itemId || !itemType) {
    return next(new AppError('Item ID and type are required', 400));
  }
  
  let Model;
  switch (itemType) {
    case 'Post':
      Model = require('../models/postModel');
      break;
    case 'Product':
      Model = require('../models/productModel');
      break;
    case 'Service':
      Model = require('../models/serviceModel');
      break;
    case 'Event':
      Model = require('../models/eventModel');
      break;
    case 'Document':
      Model = require('../models/documentModel');
      break;
    default:
      return next(new AppError('Invalid item type', 400));
  }
  
  const item = await Model.findById(itemId);
  if (!item) {
    return next(new AppError(`${itemType} not found`, 404));
  }
  
  req.item = item;
  next();
});

// Check if item is already favorited
exports.checkDuplicateFavorite = catchAsync(async (req, res, next) => {
  const { itemId, itemType } = req.body;
  const userId = req.user._id;
  
  const existing = await Favorite.findOne({
    user: userId,
    item: itemId,
    itemType: itemType
  });
  
  if (existing) {
    return next(new AppError('Item is already in favorites', 400));
  }
  
  next();
});

// Rate limiting for favorite operations
exports.favoriteRateLimit = (req, res, next) => {
  // Simple in-memory rate limiting for favorites
  const userId = req.user._id.toString();
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 30; // 30 requests per minute
  
  if (!req.app.locals.favoriteRateLimit) {
    req.app.locals.favoriteRateLimit = new Map();
  }
  
  const userRequests = req.app.locals.favoriteRateLimit.get(userId) || [];
  const recentRequests = userRequests.filter(time => now - time < windowMs);
  
  if (recentRequests.length >= maxRequests) {
    return next(new AppError('Too many favorite operations. Please try again later.', 429));
  }
  
  recentRequests.push(now);
  req.app.locals.favoriteRateLimit.set(userId, recentRequests);
  
  next();
};

// Validate bulk operation permissions
exports.validateBulkPermissions = catchAsync(async (req, res, next) => {
  const { operation, items } = req.body;
  
  if (operation === 'clear') {
    // Clear all favorites for current user - always allowed
    return next();
  }
  
  if (items && items.length > 0) {
    // Check if user can perform bulk operations on these items
    const favoriteIds = items.filter(item => item.favoriteId).map(item => item.favoriteId);
    
    if (favoriteIds.length > 0) {
      const favorites = await Favorite.find({ _id: { $in: favoriteIds } });
      const isAdmin = req.user.role && ['admin', 'moderator'].includes(req.user.role);
      
      if (!isAdmin) {
        const allOwned = favorites.every(fav => fav.user.toString() === req.user._id.toString());
        if (!allOwned) {
          return next(new AppError('You can only perform bulk operations on your own favorites', 403));
        }
      }
    }
  }
  
  next();
});

// Check admin permissions for user favorites
exports.checkAdminPermissions = (req, res, next) => {
  const isAdmin = req.user.role && ['admin', 'moderator'].includes(req.user.role);
  if (!isAdmin) {
    return next(new AppError('Admin access required', 403));
  }
  next();
};

// Validate search parameters
exports.validateSearchParams = (req, res, next) => {
  const { q, itemType, page, limit } = req.query;
  
  if (!q || q.trim().length === 0) {
    return next(new AppError('Search query is required', 400));
  }
  
  if (q.length > 100) {
    return next(new AppError('Search query too long (max 100 characters)', 400));
  }
  
  if (itemType && !['Post', 'Product', 'Service', 'Event', 'Document'].includes(itemType)) {
    return next(new AppError('Invalid item type filter', 400));
  }
  
  next();
};

// Check analytics permissions
exports.checkAnalyticsPermissions = (req, res, next) => {
  const isAdmin = req.user.role && ['admin', 'moderator'].includes(req.user.role);
  const isOwner = req.params.userId ? req.params.userId === req.user._id.toString() : true;
  
  if (!isAdmin && !isOwner) {
    return next(new AppError('You can only view your own analytics', 403));
  }
  
  next();
};