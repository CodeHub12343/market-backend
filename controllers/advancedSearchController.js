const Product = require('../models/productModel');
const Service = require('../models/serviceModel');
const User = require('../models/userModel');
const Post = require('../models/postModel');
const SavedSearch = require('../models/savedSearchModel');
const SearchAnalytics = require('../models/searchAnalyticsModel');
const UserBehavior = require('../models/userBehaviorModel');
const Category = require('../models/categoryModel');
const SearchFeatures = require('../utils/searchFeatures');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Redis with fallback - disabled for now
const redis = null;
const cacheGet = async (key) => null;
const cacheSet = async (key, value, ttl) => true;

// ============================================================================
// SEARCH FUNCTIONALITY
// ============================================================================

/**
 * Advanced search for products with full-text search and filters
 * GET /api/v1/search/products
 * Query params: search, category, minPrice, maxPrice, tags, sort, page, limit, location, radius
 */
exports.searchProducts = catchAsync(async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;
    const { search } = req.query;
    
    // Build cache key
    const cacheKey = `search:products:${JSON.stringify(req.query)}`;
    
    // Try to get from cache (disabled for now)
    const cachedResults = await cacheGet(cacheKey);
    if (cachedResults) {
      return res.status(200).json({
        status: 'success',
        source: 'cache',
        results: cachedResults.length,
        data: { products: cachedResults }
      });
    }
    
    // Apply search features
    const features = new SearchFeatures(Product.find(), req.query)
      .search()
      .filterByPrice()
      .filterByCategory()
      .filterByTags()
      .filterByLocation()
      .sort()
      .paginate();
    
    const products = await features.query;
    
    // Cache results for 1 hour (disabled for now)
    await cacheSet(cacheKey, products, 3600);
    
    // Record search analytics if user is logged in
    if (userId) {
      const analytics = new SearchAnalytics({
        user: userId,
        searchQuery: search || 'no-query',
        searchType: 'products',
        filters: req.query,
        resultsCount: products.length,
        resultsShown: Math.min(products.length, req.query.limit || 10),
        device: req.device || 'desktop',
        userAgent: req.get('user-agent'),
        ipAddress: req.ip
      });
      
      await analytics.save().catch(err => console.error('Analytics save error:', err));
    }
    
    res.status(200).json({
      status: 'success',
      source: 'query',
      results: products.length,
      data: { products }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Advanced search for services with filters
 * GET /api/v1/search/services
 */
exports.searchServices = catchAsync(async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;
    const { search } = req.query;
    
    // Build cache key
    const cacheKey = `search:services:${JSON.stringify(req.query)}`;
    const cachedResults = await cacheGet(cacheKey);
    if (cachedResults) {
      return res.status(200).json({
        status: 'success',
        source: 'cache',
        results: cachedResults.length,
        data: { services: cachedResults }
      });
    }
    
    const features = new SearchFeatures(Service.find(), req.query)
      .search()
      .filterByPrice()
      .filterByLocation()
      .filterByAvailability()
      .filterByCategory()
      .filterByTags()
      .sort()
      .paginate();
    
    const services = await features.query;
    
    await cacheSet(cacheKey, services, 3600);
    
    if (userId) {
      const analytics = new SearchAnalytics({
        user: userId,
        searchQuery: search || 'no-query',
        searchType: 'services',
        filters: req.query,
        resultsCount: services.length,
        resultsShown: Math.min(services.length, req.query.limit || 10),
        device: req.device || 'desktop',
        userAgent: req.get('user-agent'),
        ipAddress: req.ip
      });
      
      await analytics.save().catch(err => console.error('Analytics save error:', err));
    }
    
    res.status(200).json({
      status: 'success',
      source: 'query',
      results: services.length,
      data: { services }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Global search across all collections with faceted results
 * GET /api/v1/search/global
 */
exports.globalSearch = catchAsync(async (req, res, next) => {
  const { query, limit = 5 } = req.query;
  const userId = req.user ? req.user.id : null;
  
  if (!query) {
    return next(new AppError('Please provide a search query', 400));
  }
  
  try {
    // Check cache
    const cacheKey = `global-search:${query}:${limit}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.status(200).json({
        status: 'success',
        source: 'cache',
        data: cached
      });
    }
    
    const [products, services, posts, users] = await Promise.all([
      Product.find(
        { $text: { $search: query } },
        { score: { $meta: 'textScore' } }
      ).sort({ score: { $meta: 'textScore' } }).limit(parseInt(limit)),
      
      Service.find(
        { $text: { $search: query } },
        { score: { $meta: 'textScore' } }
      ).sort({ score: { $meta: 'textScore' } }).limit(parseInt(limit)),
      
      Post.find(
        { $text: { $search: query } },
        { score: { $meta: 'textScore' } }
      ).sort({ score: { $meta: 'textScore' } }).limit(parseInt(limit)),
      
      User.find(
        { $text: { $search: query } },
        { score: { $meta: 'textScore' } }
      ).sort({ score: { $meta: 'textScore' } }).limit(parseInt(limit))
    ]);
    
    const result = {
      products: products || [],
      services: services || [],
      posts: posts || [],
      users: users || [],
      totalResults: (products?.length || 0) + (services?.length || 0) + (posts?.length || 0) + (users?.length || 0)
    };
    
    // Cache for 30 minutes (disabled for now)
    await cacheSet(cacheKey, result, 1800);
    
    // Record analytics
    if (userId) {
      const analytics = new SearchAnalytics({
        user: userId,
        searchQuery: query,
        searchType: 'global',
        resultsCount: result.totalResults,
        device: req.device || 'desktop',
        userAgent: req.get('user-agent'),
        ipAddress: req.ip
      });
      
      await analytics.save().catch(err => console.error('Analytics save error:', err));
    }
    
    res.status(200).json({
      status: 'success',
      source: 'query',
      data: result
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// AUTOCOMPLETE & SUGGESTIONS
// ============================================================================

/**
 * Get search autocomplete suggestions
 * GET /api/v1/search/autocomplete
 */
exports.getAutocomplete = catchAsync(async (req, res, next) => {
  const { query, type = 'all', limit = 5 } = req.query;
  
  if (!query || query.length < 2) {
    return res.status(200).json({
      status: 'success',
      data: { suggestions: [] }
    });
  }
  
  try {
    const regex = new RegExp(`^${query}`, 'i');
    const suggestions = {};
    
    // Get suggestions from different models
    if (type === 'all' || type === 'products') {
      suggestions.products = await Product.distinct('name', { name: regex }).limit(parseInt(limit));
    }
    
    if (type === 'all' || type === 'services') {
      suggestions.services = await Service.distinct('name', { name: regex }).limit(parseInt(limit));
    }
    
    if (type === 'all' || type === 'categories') {
      suggestions.categories = await Category.distinct('name', { name: regex }).limit(parseInt(limit));
    }
    
    if (type === 'all' || type === 'tags') {
      suggestions.tags = await Product.distinct('tags', { tags: regex }).limit(parseInt(limit));
    }
    
    res.status(200).json({
      status: 'success',
      data: suggestions
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// SAVED SEARCHES
// ============================================================================

/**
 * Get all saved searches for the current user
 * GET /api/v1/search/saved
 */
exports.getSavedSearches = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  
  const savedSearches = await SavedSearch.find({ user: userId })
    .sort({ isPinned: -1, lastUsedAt: -1 });
  
  res.status(200).json({
    status: 'success',
    results: savedSearches.length,
    data: { savedSearches }
  });
});

/**
 * Get a specific saved search by ID
 * GET /api/v1/search/saved/:id
 */
exports.getSavedSearch = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  const savedSearch = await SavedSearch.findById(id);
  
  if (!savedSearch) {
    return next(new AppError('Saved search not found', 404));
  }
  
  // Check authorization
  if (savedSearch.user.toString() !== req.user.id) {
    return next(new AppError('You do not have permission to access this saved search', 403));
  }
  
  res.status(200).json({
    status: 'success',
    data: { savedSearch }
  });
});

/**
 * Create a new saved search
 * POST /api/v1/search/saved
 */
exports.createSavedSearch = catchAsync(async (req, res, next) => {
  const { name, description, searchType, filters, notifications } = req.body;
  
  // Validate required fields
  if (!name || !searchType || !filters) {
    return next(new AppError('Please provide name, searchType, and filters', 400));
  }
  
  const savedSearch = new SavedSearch({
    user: req.user.id,
    name,
    description,
    searchType,
    filters,
    notifications: notifications || { enabled: false, frequency: 'never' }
  });
  
  await savedSearch.save();
  
  res.status(201).json({
    status: 'success',
    message: 'Saved search created successfully',
    data: { savedSearch }
  });
});

/**
 * Update a saved search
 * PATCH /api/v1/search/saved/:id
 */
exports.updateSavedSearch = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { name, description, filters, notifications, isPinned } = req.body;
  
  const savedSearch = await SavedSearch.findById(id);
  
  if (!savedSearch) {
    return next(new AppError('Saved search not found', 404));
  }
  
  if (savedSearch.user.toString() !== req.user.id) {
    return next(new AppError('You do not have permission to update this saved search', 403));
  }
  
  if (name) savedSearch.name = name;
  if (description) savedSearch.description = description;
  if (filters) savedSearch.filters = filters;
  if (notifications) savedSearch.notifications = notifications;
  if (isPinned !== undefined) savedSearch.isPinned = isPinned;
  
  await savedSearch.save();
  
  res.status(200).json({
    status: 'success',
    message: 'Saved search updated successfully',
    data: { savedSearch }
  });
});

/**
 * Delete a saved search
 * DELETE /api/v1/search/saved/:id
 */
exports.deleteSavedSearch = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  const savedSearch = await SavedSearch.findById(id);
  
  if (!savedSearch) {
    return next(new AppError('Saved search not found', 404));
  }
  
  if (savedSearch.user.toString() !== req.user.id) {
    return next(new AppError('You do not have permission to delete this saved search', 403));
  }
  
  await SavedSearch.findByIdAndDelete(id);
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});

/**
 * Execute a saved search
 * POST /api/v1/search/saved/:id/execute
 */
exports.executeSavedSearch = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  const savedSearch = await SavedSearch.findById(id);
  
  if (!savedSearch) {
    return next(new AppError('Saved search not found', 404));
  }
  
  if (savedSearch.user.toString() !== req.user.id) {
    return next(new AppError('You do not have permission to execute this saved search', 403));
  }
  
  // Convert filters to query string
  const queryString = Object.entries(savedSearch.filters).reduce((acc, [key, value]) => {
    if (value !== null && value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {});
  
  // Execute search based on type
  let query;
  const Model = savedSearch.searchType === 'products' ? Product : 
                 savedSearch.searchType === 'services' ? Service :
                 Post;
  
  const features = new SearchFeatures(Model.find(), queryString)
    .search()
    .filterByPrice()
    .filterByCategory()
    .filterByTags()
    .sort()
    .paginate();
  
  const results = await features.query;
  
  // Record execution
  await savedSearch.recordExecution(results.length);
  
  res.status(200).json({
    status: 'success',
    message: 'Saved search executed successfully',
    results: results.length,
    data: { results }
  });
});

// ============================================================================
// SEARCH ANALYTICS
// ============================================================================

/**
 * Get search analytics for the current user
 * GET /api/v1/search/analytics
 */
exports.getSearchAnalytics = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { days = 30 } = req.query;
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
  
  const [
    totalSearches,
    searchesByType,
    topSearchQueries,
    searchQueriesTrend
  ] = await Promise.all([
    // Total searches
    SearchAnalytics.countDocuments({
      user: userId,
      timestamp: { $gte: cutoffDate }
    }),
    
    // Searches by type
    SearchAnalytics.aggregate([
      {
        $match: {
          user: require('mongoose').Types.ObjectId(userId),
          timestamp: { $gte: cutoffDate }
        }
      },
      {
        $group: {
          _id: '$searchType',
          count: { $sum: 1 },
          avgResults: { $avg: '$resultsCount' }
        }
      }
    ]),
    
    // Top search queries
    SearchAnalytics.aggregate([
      {
        $match: {
          user: require('mongoose').Types.ObjectId(userId),
          timestamp: { $gte: cutoffDate }
        }
      },
      {
        $group: {
          _id: '$searchQuery',
          count: { $sum: 1 },
          totalClicks: { $sum: '$itemsClicked' },
          conversions: { $sum: { $cond: ['$conversionOccurred', 1, 0] } }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]),
    
    // Search trend over time
    SearchAnalytics.aggregate([
      {
        $match: {
          user: require('mongoose').Types.ObjectId(userId),
          timestamp: { $gte: cutoffDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ])
  ]);
  
  res.status(200).json({
    status: 'success',
    data: {
      analytics: {
        totalSearches,
        searchesByType,
        topSearchQueries,
        searchTrend: searchQueriesTrend
      }
    }
  });
});

/**
 * Get trending searches globally
 * GET /api/v1/search/trending
 */
exports.getTrendingSearches = catchAsync(async (req, res, next) => {
  const { days = 7, limit = 10, searchType = 'all' } = req.query;
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
  
  const match = {
    timestamp: { $gte: cutoffDate }
  };
  
  if (searchType !== 'all') {
    match.searchType = searchType;
  }
  
  const trendingSearches = await SearchAnalytics.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$searchQuery',
        count: { $sum: 1 },
        avgResultsCount: { $avg: '$resultsCount' },
        conversionRate: {
          $avg: {
            $cond: ['$conversionOccurred', 1, 0]
          }
        }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: parseInt(limit)
    }
  ]);
  
  res.status(200).json({
    status: 'success',
    results: trendingSearches.length,
    data: { trendingSearches }
  });
});

/**
 * Record search feedback
 * POST /api/v1/search/feedback
 */
exports.recordSearchFeedback = catchAsync(async (req, res, next) => {
  const { searchAnalyticsId, relevant, helpful, rating, comment } = req.body;
  
  const analytics = await SearchAnalytics.findByIdAndUpdate(
    searchAnalyticsId,
    {
      'userFeedback.relevant': relevant,
      'userFeedback.helpful': helpful,
      'userFeedback.rating': rating,
      'userFeedback.comment': comment
    },
    { new: true, runValidators: true }
  );
  
  if (!analytics) {
    return next(new AppError('Search analytics record not found', 404));
  }
  
  res.status(200).json({
    status: 'success',
    message: 'Feedback recorded successfully',
    data: { analytics }
  });
});

module.exports = exports;
