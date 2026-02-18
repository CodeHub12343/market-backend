// controllers/favoriteController.js
const Favorite = require('../models/favoriteModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Post = require('../models/postModel');
const Product = require('../models/productModel');
const Service = require('../models/serviceModel');
const Event = require('../models/eventModel');
const Document = require('../models/documentModel');

/**
 * Lightweight projection helper
 * returns only the fields we want for each type to keep payload small
 */
const pickLightweight = (doc, itemType) => {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  switch (itemType) {
    case 'Post':
      return {
        _id: obj._id,
        content: obj.content || obj.caption || '',
        media: obj.media || (obj.image ? [{ url: obj.image }] : []),
        author: obj.author || null,
        createdAt: obj.createdAt
      };
    case 'Product':
      return {
        _id: obj._id,
        title: obj.title || obj.name || '',
        price: obj.price || 0,
        images: obj.images || obj.media || [],
        condition: obj.condition || null,
        seller: obj.seller || obj.owner || null,
        createdAt: obj.createdAt
      };
    case 'Service':
      return {
        _id: obj._id,
        title: obj.title || '',
        price: obj.price || 0,
        shortDescription: obj.description ? (obj.description.slice(0, 160)) : '',
        provider: obj.provider || null,
        createdAt: obj.createdAt
      };
    case 'Event':
      return {
        _id: obj._id,
        title: obj.title || '',
        date: obj.date,
        location: obj.location || '',
        category: obj.category || '',
        createdBy: obj.createdBy || null,
        createdAt: obj.createdAt
      };
    case 'Document':
      return {
        _id: obj._id,
        title: obj.title || '',
        fileType: obj.fileType || '',
        fileSize: obj.fileSize || 0,
        description: obj.description ? (obj.description.slice(0, 160)) : '',
        uploadedBy: obj.uploadedBy || null,
        createdAt: obj.createdAt
      };
    default:
      return { _id: obj._id };
  }
};

// GET /api/v1/favorites
exports.getAllFavorites = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { itemType, search, startDate, endDate, sort, page = 1, limit = 20 } = req.query;
  
  const filter = { user: userId, isActive: true };
  
  // Apply filters
  if (itemType) filter.itemType = itemType;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }
  if (search) {
    filter.$or = [
      { tags: { $in: [new RegExp(search, 'i')] } },
      { notes: { $regex: search, $options: 'i' } }
    ];
  }

  // Pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Get favorites with pagination
  const favorites = await Favorite.find(filter)
    .sort(sort || '-createdAt')
    .skip(skip)
    .limit(limitNum)
    .populate({
      path: 'item',
      populate: { path: 'author provider seller createdBy uploadedBy', select: 'fullName email campus' }
    });

  const total = await Favorite.countDocuments(filter);

  const transformed = favorites.map((fav) => ({
    _id: fav._id,
    itemType: fav.itemType,
    item: pickLightweight(fav.item, fav.itemType),
    tags: fav.tags,
    notes: fav.notes,
    priority: fav.priority,
    isRecent: fav.isRecent,
    isFrequentlyAccessed: fav.isFrequentlyAccessed,
    createdAt: fav.createdAt,
    updatedAt: fav.updatedAt
  }));

  res.status(200).json({
    status: 'success',
    results: transformed.length,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    data: { favorites: transformed }
  });
});

// GET /api/v1/favorites/:id
exports.getFavorite = catchAsync(async (req, res, next) => {
  const fav = await Favorite.findById(req.params.id).populate({
    path: 'item',
    populate: { path: 'author provider seller', select: 'fullName email campus' }
  });
  if (!fav) return next(new AppError('Favorite not found', 404));
  if (String(fav.user) !== String(req.user._id) && req.user.role !== 'admin') {
    return next(new AppError('Not authorized to view this favorite', 403));
  }

  res.status(200).json({
    status: 'success',
    data: {
      favorite: {
        _id: fav._id,
        itemType: fav.itemType,
        item: pickLightweight(fav.item, fav.itemType),
        createdAt: fav.createdAt
      }
    }
  });
});

// POST /api/v1/favorites/toggle
// body: { itemId, itemType }
exports.toggleFavorite = catchAsync(async (req, res, next) => {
  const { itemId, itemType } = req.body;
  if (!itemId || !itemType) return next(new AppError('itemId and itemType are required', 400));
  if (!['Post', 'Product', 'Service'].includes(itemType)) return next(new AppError('Invalid itemType', 400));

  // Ensure referenced item exists (quick check)
  let found = null;
  if (itemType === 'Post') found = await Post.findById(itemId);
  if (itemType === 'Product') found = await Product.findById(itemId);
  if (itemType === 'Service') found = await Service.findById(itemId);
  if (!found) return next(new AppError(`${itemType} not found`, 404));

  const userId = req.user._id;
  const existing = await Favorite.findOne({ user: userId, item: itemId, itemType });

  if (existing) {
    await existing.deleteOne();
    return res.status(200).json({
      status: 'success',
      message: `${itemType} removed from favorites`,
      data: null
    });
  }

  const fav = await Favorite.create({ user: userId, item: itemId, itemType });
  const populated = await fav.populate({
    path: 'item',
    populate: { path: 'author provider seller', select: 'fullName email campus' }
  });

  res.status(201).json({
    status: 'success',
    message: `${itemType} added to favorites`,
    data: {
      favorite: {
        _id: fav._id,
        itemType: fav.itemType,
        item: pickLightweight(populated.item, populated.itemType),
        createdAt: fav.createdAt
      }
    }
  });
});

// POST /api/v1/favorites  (optional explicit create)
exports.createFavorite = catchAsync(async (req, res, next) => {
  const { itemId, itemType } = req.body;
  if (!itemId || !itemType) return next(new AppError('itemId and itemType are required', 400));
  const userId = req.user._id;
  try {
    const fav = await Favorite.create({ user: userId, item: itemId, itemType });
    const populated = await fav.populate({
      path: 'item',
      populate: { path: 'author provider seller', select: 'fullName email campus' }
    });
    return res.status(201).json({
      status: 'success',
      data: {
        favorite: {
          _id: fav._id,
          itemType: fav.itemType,
          item: pickLightweight(populated.item, populated.itemType),
          createdAt: fav.createdAt
        }
      }
    });
  } catch (err) {
    // handle unique index duplicate
    if (err.code === 11000) {
      return next(new AppError('Item already favorited', 400));
    }
    throw err;
  }
});

// DELETE /api/v1/favorites/:id
exports.deleteFavorite = catchAsync(async (req, res, next) => {
  const fav = await Favorite.findById(req.params.id);
  if (!fav) return next(new AppError('Favorite not found', 404));
  if (String(fav.user) !== String(req.user._id) && req.user.role !== 'admin') {
    return next(new AppError('Not authorized to delete this favorite', 403));
  }
  await fav.deleteOne();
  res.status(204).json({ status: 'success', data: null });
});

// GET /api/v1/favorites/search
exports.searchFavorites = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { q, itemType, page = 1, limit = 20 } = req.query;
  
  const favorites = await Favorite.searchFavorites(userId, q, { itemType, page, limit });
  
  const transformed = favorites.map((fav) => ({
    _id: fav._id,
    itemType: fav.itemType,
    item: pickLightweight(fav.item, fav.itemType),
    tags: fav.tags,
    notes: fav.notes,
    priority: fav.priority,
    createdAt: fav.createdAt
  }));

  res.status(200).json({
    status: 'success',
    results: transformed.length,
    data: { favorites: transformed }
  });
});

// GET /api/v1/favorites/analytics
exports.getFavoriteAnalytics = catchAsync(async (req, res, next) => {
  const userId = req.params.userId || req.user._id;
  const { startDate, endDate, itemType } = req.query;
  
  const match = { user: userId, isActive: true };
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }
  if (itemType) match.itemType = itemType;

  const analytics = await Favorite.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$itemType',
        count: { $sum: 1 },
        lastAdded: { $max: '$createdAt' },
        avgAccessCount: { $avg: '$metadata.accessCount' }
      }
    },
    {
      $group: {
        _id: null,
        totalFavorites: { $sum: '$count' },
        byType: {
          $push: {
            type: '$_id',
            count: '$count',
            lastAdded: '$lastAdded',
            avgAccessCount: '$avgAccessCount'
          }
        }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: analytics[0] || { totalFavorites: 0, byType: [] }
  });
});

// GET /api/v1/favorites/popular
exports.getPopularFavorites = catchAsync(async (req, res, next) => {
  const { itemType, limit = 10 } = req.query;
  
  const popular = await Favorite.getPopularItems(itemType, limit);
  
  res.status(200).json({
    status: 'success',
    results: popular.length,
    data: { popular }
  });
});

// GET /api/v1/favorites/recent
exports.getRecentFavorites = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const limit = parseInt(req.query.limit) || 10;
  
  const recent = await Favorite.getRecentFavorites(userId, limit);
  
  const transformed = recent.map((fav) => ({
    _id: fav._id,
    itemType: fav.itemType,
    item: pickLightweight(fav.item, fav.itemType),
    createdAt: fav.createdAt
  }));

  res.status(200).json({
    status: 'success',
    results: transformed.length,
    data: { favorites: transformed }
  });
});

// POST /api/v1/favorites/bulk
exports.bulkFavoriteOperations = catchAsync(async (req, res, next) => {
  const { operation, items, itemType } = req.body;
  const userId = req.user._id;
  
  let result;
  
  switch (operation) {
    case 'add':
      if (!items || items.length === 0) {
        return next(new AppError('Items array is required for bulk add', 400));
      }
      
      const favoritesToAdd = items.map(item => ({
        user: userId,
        item: item.itemId,
        itemType: item.itemType,
        tags: item.tags || [],
        notes: item.notes || '',
        priority: item.priority || 'medium'
      }));
      
      try {
        result = await Favorite.insertMany(favoritesToAdd, { ordered: false });
      } catch (error) {
        if (error.code === 11000) {
          // Handle duplicates gracefully
          result = { insertedCount: error.result?.insertedCount || 0 };
        } else {
          throw error;
        }
      }
      break;
      
    case 'remove':
      if (items && items.length > 0) {
        const favoriteIds = items.map(item => item.favoriteId).filter(Boolean);
        result = await Favorite.deleteMany({ 
          _id: { $in: favoriteIds }, 
          user: userId 
        });
      } else {
        return next(new AppError('Items array is required for bulk remove', 400));
      }
      break;
      
    case 'clear':
      const filter = { user: userId };
      if (itemType) filter.itemType = itemType;
      result = await Favorite.deleteMany(filter);
      break;
      
    default:
      return next(new AppError('Invalid bulk operation', 400));
  }
  
  res.status(200).json({
    status: 'success',
    data: result
  });
});

// PATCH /api/v1/favorites/:id
exports.updateFavorite = catchAsync(async (req, res, next) => {
  const { tags, notes, priority } = req.body;
  const favorite = await Favorite.findById(req.params.id);
  
  if (!favorite) return next(new AppError('Favorite not found', 404));
  if (favorite.user.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to update this favorite', 403));
  }
  
  if (tags) favorite.tags = tags;
  if (notes !== undefined) favorite.notes = notes;
  if (priority) favorite.priority = priority;
  
  await favorite.save();
  
  res.status(200).json({
    status: 'success',
    data: { favorite }
  });
});

// POST /api/v1/favorites/:id/tags
exports.addTag = catchAsync(async (req, res, next) => {
  const { tag } = req.body;
  const favorite = await Favorite.findById(req.params.id);
  
  if (!favorite) return next(new AppError('Favorite not found', 404));
  if (favorite.user.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to modify this favorite', 403));
  }
  
  await favorite.addTag(tag);
  
  res.status(200).json({
    status: 'success',
    data: { favorite }
  });
});

// DELETE /api/v1/favorites/:id/tags/:tag
exports.removeTag = catchAsync(async (req, res, next) => {
  const { tag } = req.params;
  const favorite = await Favorite.findById(req.params.id);
  
  if (!favorite) return next(new AppError('Favorite not found', 404));
  if (favorite.user.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to modify this favorite', 403));
  }
  
  await favorite.removeTag(tag);
  
  res.status(200).json({
    status: 'success',
    data: { favorite }
  });
});

// PATCH /api/v1/favorites/:id/archive
exports.archiveFavorite = catchAsync(async (req, res, next) => {
  const favorite = await Favorite.findById(req.params.id);
  
  if (!favorite) return next(new AppError('Favorite not found', 404));
  if (favorite.user.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to archive this favorite', 403));
  }
  
  await favorite.archive();
  
  res.status(200).json({
    status: 'success',
    data: { favorite }
  });
});

// PATCH /api/v1/favorites/:id/restore
exports.restoreFavorite = catchAsync(async (req, res, next) => {
  const favorite = await Favorite.findById(req.params.id);
  
  if (!favorite) return next(new AppError('Favorite not found', 404));
  if (favorite.user.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to restore this favorite', 403));
  }
  
  await favorite.restore();
  
  res.status(200).json({
    status: 'success',
    data: { favorite }
  });
});

// GET /api/v1/favorites/user/:userId (admin only)
exports.getUserFavorites = catchAsync(async (req, res, next) => {
  const userId = req.params.userId;
  const { itemType, page = 1, limit = 20 } = req.query;
  
  const favorites = await Favorite.getUserFavorites(userId, { itemType, page, limit });
  
  const transformed = favorites.map((fav) => ({
    _id: fav._id,
    itemType: fav.itemType,
    item: pickLightweight(fav.item, fav.itemType),
    tags: fav.tags,
    notes: fav.notes,
    priority: fav.priority,
    createdAt: fav.createdAt
  }));

  res.status(200).json({
    status: 'success',
    results: transformed.length,
    data: { favorites: transformed }
  });
});
