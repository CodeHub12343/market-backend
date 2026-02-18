const Recommendation = require('../models/recommendationModel');
const UserBehavior = require('../models/userBehaviorModel');
const Product = require('../models/productModel');
const Service = require('../models/serviceModel');
const User = require('../models/userModel');
const Category = require('../models/categoryModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Redis with fallback - disabled for now
const redis = null;
const cacheGet = async (key) => null;
const cacheSet = async (key, value, ttl) => true;

// ============================================================================
// RECOMMENDATION GENERATION ALGORITHMS
// ============================================================================

/**
 * Collaborative filtering: Find users with similar interests and recommend their items
 */
async function collaborativeFiltering(userId, limit = 5) {
  try {
    // Get user's behavior
    const userBehaviors = await UserBehavior.find({ user: userId })
      .select('item action engagementScore')
      .limit(100);
    
    const userInteractions = {};
    userBehaviors.forEach(b => {
      const key = `${b.item.model}:${b.item.id}`;
      userInteractions[key] = (userInteractions[key] || 0) + b.engagementScore;
    });
    
    // Find similar users (users who interacted with same items)
    const similarUsers = await UserBehavior.aggregate([
      {
        $match: {
          user: { $ne: new require('mongoose').Types.ObjectId(userId) },
          'item.id': { $in: Array.from(Object.keys(userInteractions)).map(k => k.split(':')[1]) }
        }
      },
      {
        $group: {
          _id: '$user',
          commonInteractions: { $sum: 1 },
          totalEngagement: { $sum: '$engagementScore' }
        }
      },
      {
        $sort: { commonInteractions: -1, totalEngagement: -1 }
      },
      {
        $limit: 10
      }
    ]);
    
    // Get items from similar users that current user hasn't interacted with
    const similarUserIds = similarUsers.map(u => u._id);
    
    const recommendations = await UserBehavior.aggregate([
      {
        $match: {
          user: { $in: similarUserIds },
          action: { $in: ['purchased', 'added-to-favorites', 'reviewed'] }
        }
      },
      {
        $group: {
          _id: { id: '$item.id', model: '$item.model' },
          score: { $sum: '$engagementScore' },
          count: { $sum: 1 },
          category: { $first: '$item.category' }
        }
      },
      {
        $sort: { score: -1 }
      },
      {
        $limit: limit
      }
    ]);
    
    return recommendations.map(r => ({
      ...r._id,
      recommendationType: 'collaborative-similar-users',
      score: Math.min(100, r.score * 10),
      context: { similarUsersCount: similarUsers.length }
    }));
  } catch (err) {
    console.error('Collaborative filtering error:', err);
    return [];
  }
}

/**
 * Content-based filtering: Recommend similar items to what user liked
 */
async function contentBasedFiltering(userId, limit = 5) {
  try {
    // Get user's favorite categories and tags
    const userInterests = await UserBehavior.aggregate([
      {
        $match: {
          user: require('mongoose').Types.ObjectId(userId),
          action: { $in: ['purchased', 'added-to-favorites', 'reviewed', 'viewed'] }
        }
      },
      {
        $group: {
          _id: null,
          categories: { $push: '$item.category' },
          tags: { $push: '$item.tags' }
        }
      }
    ]);
    
    if (!userInterests.length) return [];
    
    const { categories, tags } = userInterests[0];
    const flatTags = tags.flat().filter(t => t);
    
    // Find products with similar categories or tags
    const similarProducts = await Product.find({
      $or: [
        { category: { $in: categories.filter(c => c) } },
        { tags: { $in: flatTags } }
      ]
    })
      .select('_id name category tags rating reviewsCount')
      .limit(limit);
    
    return similarProducts.map(p => ({
      id: p._id,
      model: 'Product',
      recommendationType: 'content-based',
      score: 75,
      context: {
        matchedCategory: categories.includes(p.category),
        matchedTags: p.tags.some(t => flatTags.includes(t))
      }
    }));
  } catch (err) {
    console.error('Content-based filtering error:', err);
    return [];
  }
}

/**
 * Trending recommendations: Popular items gaining traction
 */
async function trendingRecommendations(limit = 5, days = 7) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const trending = await UserBehavior.aggregate([
      {
        $match: {
          timestamp: { $gte: cutoffDate },
          action: { $in: ['clicked', 'viewed', 'purchased', 'added-to-favorites'] }
        }
      },
      {
        $group: {
          _id: { id: '$item.id', model: '$item.model' },
          popularity: { $sum: 1 },
          totalEngagement: { $sum: '$engagementScore' },
          category: { $first: '$item.category' }
        }
      },
      {
        $sort: { popularity: -1, totalEngagement: -1 }
      },
      {
        $limit: limit
      }
    ]);
    
    return trending.map(t => ({
      ...t._id,
      recommendationType: 'trending',
      score: Math.min(100, t.popularity * 5),
      context: { popularityScore: t.popularity }
    }));
  } catch (err) {
    console.error('Trending recommendations error:', err);
    return [];
  }
}

/**
 * Similar items: If user viewed/bought item X, recommend similar items
 */
async function similarItemsRecommendations(userId, limit = 5) {
  try {
    // Get user's recently viewed/purchased products
    const userItems = await UserBehavior.find({
      user: userId,
      action: { $in: ['viewed', 'purchased'] },
      'item.model': 'Product'
    })
      .select('item')
      .sort({ timestamp: -1 })
      .limit(5);
    
    if (!userItems.length) return [];
    
    const itemIds = userItems.map(u => u.item.id);
    
    // Get items with same category or similar tags
    const recentItems = await Product.find({ _id: { $in: itemIds } })
      .select('category tags');
    
    const categories = recentItems.map(i => i.category).filter(c => c);
    const allTags = recentItems.flatMap(i => i.tags).filter(t => t);
    
    const similar = await Product.find({
      _id: { $nin: itemIds },
      $or: [
        { category: { $in: categories } },
        { tags: { $in: allTags } }
      ]
    })
      .select('_id name category tags price rating')
      .limit(limit);
    
    return similar.map(s => ({
      id: s._id,
      model: 'Product',
      recommendationType: 'collaborative-similar-items',
      score: 80,
      context: { basedOnRecentItems: itemIds.length }
    }));
  } catch (err) {
    console.error('Similar items recommendation error:', err);
    return [];
  }
}

/**
 * Back-in-stock recommendations
 */
async function backInStockRecommendations(userId, limit = 5) {
  try {
    // Get user's previously viewed/favorited items that were out of stock
    const userFavorites = await UserBehavior.find({
      user: userId,
      action: 'added-to-favorites',
      'item.model': 'Product'
    })
      .select('item')
      .limit(20);
    
    const itemIds = userFavorites.map(f => f.item.id);
    
    // Check if any are now in stock
    const backInStock = await Product.find({
      _id: { $in: itemIds },
      isAvailable: true,
      stock: { $gt: 0 }
    })
      .select('_id name price stock')
      .limit(limit);
    
    return backInStock.map(p => ({
      id: p._id,
      model: 'Product',
      recommendationType: 'back-in-stock',
      score: 95,
      context: { previouslyWanted: true }
    }));
  } catch (err) {
    console.error('Back-in-stock recommendation error:', err);
    return [];
  }
}

// ============================================================================
// GET RECOMMENDATIONS ENDPOINTS
// ============================================================================

/**
 * Get personalized recommendations for the current user
 * GET /api/v1/recommendations
 */
exports.getRecommendations = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { limit = 10, type = 'all' } = req.query;
  
  try {
    // Check cache (disabled for now)
    const cacheKey = `recommendations:${userId}:${type}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.status(200).json({
        status: 'success',
        source: 'cache',
        data: { recommendations: cached }
      });
    }
    
    let recommendations = [];
    
    if (type === 'all' || type === 'collaborative') {
      const collab = await collaborativeFiltering(userId, Math.ceil(parseInt(limit) / 4));
      recommendations = [...recommendations, ...collab];
    }
    
    if (type === 'all' || type === 'content-based') {
      const content = await contentBasedFiltering(userId, Math.ceil(parseInt(limit) / 4));
      recommendations = [...recommendations, ...content];
    }
    
    if (type === 'all' || type === 'trending') {
      const trending = await trendingRecommendations(Math.ceil(parseInt(limit) / 4));
      recommendations = [...recommendations, ...trending];
    }
    
    if (type === 'all' || type === 'similar') {
      const similar = await similarItemsRecommendations(userId, Math.ceil(parseInt(limit) / 4));
      recommendations = [...recommendations, ...similar];
    }
    
    // Limit and sort by score
    recommendations = recommendations
      .slice(0, parseInt(limit))
      .sort((a, b) => b.score - a.score);
    
    // Enrich recommendations with full item data
    const enrichedRecs = await Promise.all(recommendations.map(async (rec) => {
      const Model = rec.model === 'Product' ? Product : Service;
      const item = await Model.findById(rec.id);
      
      return {
        ...rec,
        itemDetails: item
      };
    }));
    
    // Cache for 1 hour (disabled for now)
    await cacheSet(cacheKey, enrichedRecs, 3600);
    
    // Create Recommendation documents
    for (const rec of enrichedRecs) {
      const existingRec = await Recommendation.findOne({
        user: userId,
        'item.id': rec.id,
        recommendationType: rec.recommendationType
      });
      
      if (!existingRec) {
        const newRec = new Recommendation({
          user: userId,
          item: {
            id: rec.id,
            model: rec.model,
            title: rec.itemDetails?.name,
            price: rec.itemDetails?.price,
            rating: rec.itemDetails?.rating
          },
          recommendationType: rec.recommendationType,
          score: rec.score,
          scoreBreakdown: {
            personalizedScore: rec.score
          },
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        });
        
        await newRec.save().catch(err => console.error('Save rec error:', err));
      }
    }
    
    res.status(200).json({
      status: 'success',
      results: enrichedRecs.length,
      data: { recommendations: enrichedRecs }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Get recommendations for a specific product
 * GET /api/v1/recommendations/product/:productId
 */
exports.getProductRecommendations = catchAsync(async (req, res, next) => {
  const { productId } = req.params;
  const { limit = 5 } = req.query;
  
  try {
    const product = await Product.findById(productId);
    
    if (!product) {
      return next(new AppError('Product not found', 404));
    }
    
    // Find similar products
    const similar = await Product.find({
      _id: { $ne: productId },
      $or: [
        { category: product.category },
        { tags: { $in: product.tags } }
      ]
    })
      .select('_id name price category tags rating images')
      .limit(parseInt(limit));
    
    res.status(200).json({
      status: 'success',
      results: similar.length,
      data: { recommendations: similar }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Get trending recommendations
 * GET /api/v1/recommendations/trending
 */
exports.getTrendingRecommendations = catchAsync(async (req, res, next) => {
  const { limit = 10, days = 7 } = req.query;
  
  try {
    const trending = await trendingRecommendations(parseInt(limit), parseInt(days));
    
    // Enrich with full item data
    const enriched = await Promise.all(trending.map(async (rec) => {
      const Model = rec.model === 'Product' ? Product : Service;
      const item = await Model.findById(rec.id);
      return { ...rec, itemDetails: item };
    }));
    
    res.status(200).json({
      status: 'success',
      results: enriched.length,
      data: { recommendations: enriched }
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// RECOMMENDATION INTERACTIONS
// ============================================================================

/**
 * Mark recommendation as clicked
 * POST /api/v1/recommendations/:recommendationId/click
 */
exports.markRecommationAsClicked = catchAsync(async (req, res, next) => {
  const { recommendationId } = req.params;
  
  const recommendation = await Recommendation.findByIdAndUpdate(
    recommendationId,
    {
      isClicked: true,
      clickedAt: Date.now()
    },
    { new: true }
  );
  
  if (!recommendation) {
    return next(new AppError('Recommendation not found', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: { recommendation }
  });
});

/**
 * Mark recommendation as dismissed
 * POST /api/v1/recommendations/:recommendationId/dismiss
 */
exports.dismissRecommendation = catchAsync(async (req, res, next) => {
  const { recommendationId } = req.params;
  const { reason = 'other' } = req.body;
  
  const recommendation = await Recommendation.findById(recommendationId);
  
  if (!recommendation) {
    return next(new AppError('Recommendation not found', 404));
  }
  
  await recommendation.dismiss(reason);
  
  res.status(200).json({
    status: 'success',
    message: 'Recommendation dismissed',
    data: { recommendation }
  });
});

/**
 * Rate a recommendation
 * POST /api/v1/recommendations/:recommendationId/rate
 */
exports.rateRecommendation = catchAsync(async (req, res, next) => {
  const { recommendationId } = req.params;
  const { rating, comment } = req.body;
  
  if (!rating || rating < 1 || rating > 5) {
    return next(new AppError('Please provide a rating between 1 and 5', 400));
  }
  
  const recommendation = await Recommendation.findByIdAndUpdate(
    recommendationId,
    {
      userRating: rating,
      ratingComment: comment,
      ratedAt: Date.now()
    },
    { new: true, runValidators: true }
  );
  
  if (!recommendation) {
    return next(new AppError('Recommendation not found', 404));
  }
  
  res.status(200).json({
    status: 'success',
    message: 'Rating recorded successfully',
    data: { recommendation }
  });
});

/**
 * Get recommendation analytics
 * GET /api/v1/recommendations/analytics
 */
exports.getRecommendationAnalytics = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { days = 30 } = req.query;
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
  
  const [
    totalRecommendations,
    clickedCount,
    purchasedCount,
    dismissedCount,
    byType
  ] = await Promise.all([
    Recommendation.countDocuments({
      user: userId,
      createdAt: { $gte: cutoffDate }
    }),
    
    Recommendation.countDocuments({
      user: userId,
      createdAt: { $gte: cutoffDate },
      isClicked: true
    }),
    
    Recommendation.countDocuments({
      user: userId,
      createdAt: { $gte: cutoffDate },
      isPurchased: true
    }),
    
    Recommendation.countDocuments({
      user: userId,
      createdAt: { $gte: cutoffDate },
      isDismissed: true
    }),
    
    Recommendation.aggregate([
      {
        $match: {
          user: require('mongoose').Types.ObjectId(userId),
          createdAt: { $gte: cutoffDate }
        }
      },
      {
        $group: {
          _id: '$recommendationType',
          count: { $sum: 1 },
          clicks: { $sum: { $cond: ['$isClicked', 1, 0] } },
          purchases: { $sum: { $cond: ['$isPurchased', 1, 0] } },
          dismissals: { $sum: { $cond: ['$isDismissed', 1, 0] } }
        }
      }
    ])
  ]);
  
  const clickThroughRate = totalRecommendations > 0 ? (clickedCount / totalRecommendations * 100).toFixed(2) : 0;
  const conversionRate = totalRecommendations > 0 ? (purchasedCount / totalRecommendations * 100).toFixed(2) : 0;
  const dismissalRate = totalRecommendations > 0 ? (dismissedCount / totalRecommendations * 100).toFixed(2) : 0;
  
  res.status(200).json({
    status: 'success',
    data: {
      analytics: {
        totalRecommendations,
        clickedCount,
        purchasedCount,
        dismissedCount,
        clickThroughRate: `${clickThroughRate}%`,
        conversionRate: `${conversionRate}%`,
        dismissalRate: `${dismissalRate}%`,
        byType
      }
    }
  });
});

module.exports = exports;
