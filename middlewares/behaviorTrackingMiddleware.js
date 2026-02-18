const UserBehavior = require('../models/userBehaviorModel');
const catchAsync = require('../utils/catchAsync');

/**
 * Middleware to track user viewing behavior
 * Attach to routes where items are viewed
 */
exports.trackViewBehavior = catchAsync(async (req, res, next) => {
  // Store middleware for later use
  const originalJson = res.json;
  
  res.json = function(data) {
    // After successful response, track behavior
    if (res.statusCode === 200 && req.user && req.itemId) {
      const behavior = new UserBehavior({
        user: req.user.id,
        action: 'viewed',
        item: {
          id: req.itemId,
          model: req.itemModel || 'Product',
          category: req.itemCategory,
          tags: req.itemTags,
          price: req.itemPrice
        },
        metadata: {
          referrer: req.get('referer'),
          session: req.sessionID,
          deviceType: req.device || 'desktop'
        }
      });
      
      behavior.save().catch(err => console.error('Track view error:', err));
    }
    
    return originalJson.call(this, data);
  };
  
  next();
});

/**
 * Middleware to track search behavior
 * Attach to search routes
 */
exports.trackSearchBehavior = catchAsync(async (req, res, next) => {
  // Store middleware for later use
  const originalJson = res.json;
  
  res.json = function(data) {
    // After successful search response, track behavior
    if (res.statusCode === 200 && req.user && req.query.search) {
      const behavior = new UserBehavior({
        user: req.user.id,
        action: 'searched',
        item: {
          id: null,
          model: 'Search'
        },
        metadata: {
          searchQuery: req.query.search,
          filterApplied: req.query,
          session: req.sessionID,
          deviceType: req.device || 'desktop'
        }
      });
      
      behavior.save().catch(err => console.error('Track search error:', err));
    }
    
    return originalJson.call(this, data);
  };
  
  next();
});

/**
 * Middleware to track click behavior
 * Attach to item detail routes
 */
exports.trackClickBehavior = catchAsync(async (req, res, next) => {
  if (req.user && req.itemId) {
    const behavior = new UserBehavior({
      user: req.user.id,
      action: 'clicked',
      item: {
        id: req.itemId,
        model: req.itemModel || 'Product'
      },
      metadata: {
        referrer: req.get('referer'),
        session: req.sessionID,
        deviceType: req.device || 'desktop'
      }
    });
    
    await behavior.save().catch(err => console.error('Track click error:', err));
  }
  
  next();
});

/**
 * Middleware to track purchase behavior
 * Attach to order completion routes
 */
exports.trackPurchaseBehavior = async (userId, itemId, itemModel = 'Product') => {
  try {
    const behavior = new UserBehavior({
      user: userId,
      action: 'purchased',
      item: {
        id: itemId,
        model: itemModel
      },
      engagementScore: 10
    });
    
    await behavior.save();
  } catch (err) {
    console.error('Track purchase error:', err);
  }
};

/**
 * Middleware to track favorite behavior
 * Attach to favorite/unfavorite routes
 */
exports.trackFavoriteBehavior = async (userId, itemId, itemModel = 'Product', action = 'added') => {
  try {
    const behavior = new UserBehavior({
      user: userId,
      action: 'added-to-favorites',
      item: {
        id: itemId,
        model: itemModel
      }
    });
    
    await behavior.save();
  } catch (err) {
    console.error('Track favorite error:', err);
  }
};

/**
 * Middleware to track review behavior
 * Attach to review creation routes
 */
exports.trackReviewBehavior = async (userId, itemId, itemModel = 'Product', rating) => {
  try {
    const behavior = new UserBehavior({
      user: userId,
      action: 'reviewed',
      item: {
        id: itemId,
        model: itemModel
      },
      engagementScore: 8
    });
    
    await behavior.save();
  } catch (err) {
    console.error('Track review error:', err);
  }
};

/**
 * Middleware to track filter usage
 */
exports.trackFilterBehavior = async (userId, filters) => {
  try {
    const behavior = new UserBehavior({
      user: userId,
      action: 'filter-used',
      item: {
        id: null,
        model: 'Filter'
      },
      metadata: {
        filterApplied: filters
      },
      engagementScore: 1
    });
    
    await behavior.save();
  } catch (err) {
    console.error('Track filter error:', err);
  }
};

/**
 * Middleware to detect device type
 * Attach to all routes
 */
exports.detectDevice = (req, res, next) => {
  const ua = req.get('user-agent') || '';
  
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    req.device = 'mobile';
  } else if (/ipad|android|tablet|playbook|silk|kindle/i.test(ua)) {
    req.device = 'tablet';
  } else {
    req.device = 'desktop';
  }
  
  next();
};

/**
 * Middleware to generate session ID if not exists
 */
exports.generateSessionId = (req, res, next) => {
  if (!req.sessionID) {
    req.sessionID = `${req.user?.id || 'anonymous'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
};

module.exports = exports;
