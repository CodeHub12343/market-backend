const mongoose = require('mongoose');

const userBehaviorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    
    // Action type
    action: {
      type: String,
      enum: [
        'viewed', // Product/service viewed
        'searched', // Search performed
        'clicked', // Link clicked
        'purchased', // Item purchased
        'added-to-cart', // Item added to cart
        'added-to-favorites', // Item favorited
        'reviewed', // Review/rating written
        'shared', // Item shared
        'dismissed', // Item dismissed/hidden
        'reported', // Item reported
        'commented', // Comment added
        'liked', // Item liked
        'followed', // User/shop followed
        'visited-profile', // Profile visited
        'contacted-seller', // Seller contacted
        'spent-time', // Time spent on item
        'filter-used', // Filter applied
        'sort-used' // Sort option used
      ],
      required: true,
      index: true
    },
    
    // Item involved in the action
    item: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
      },
      model: {
        type: String,
        enum: ['Product', 'Service', 'Post', 'Shop', 'User', 'Event', 'Document', 'News'],
        required: true
      },
      category: mongoose.Schema.Types.ObjectId,
      tags: [String],
      price: Number
    },
    
    // Action metadata
    metadata: {
      duration: Number, // Time spent (in milliseconds)
      searchQuery: String, // If action is search
      filterApplied: mongoose.Schema.Types.Mixed, // Filters used
      referrer: String, // Where user came from
      session: String, // Session ID
      deviceType: {
        type: String,
        enum: ['mobile', 'tablet', 'desktop']
      },
      location: {
        coordinates: [Number],
        address: String
      }
    },
    
    // Engagement score contribution
    engagementScore: {
      type: Number,
      default: 0,
      min: 0
      // Viewing: 1pt, Searching: 2pts, Clicking: 3pts, 
      // Purchasing: 10pts, Favorites: 5pts, Review: 8pts
    },
    
    // Timestamp
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
      expires: 15552000 // Auto-delete after 180 days
    },
    
    // Year, Month, Day for analytics
    year: Number,
    month: Number,
    day: Number,
    dayOfWeek: Number,
    hour: Number
  },
  {
    timestamps: false,
    indexes: [
      { user: 1, timestamp: -1 },
      { user: 1, action: 1, timestamp: -1 },
      { user: 1, 'item.id': 1 },
      { user: 1, 'item.model': 1, timestamp: -1 },
      { 'item.id': 1, action: 1 },
      { action: 1, timestamp: -1 },
      { timestamp: 1 }, // For TTL deletion
      { user: 1, year: 1, month: 1 }
    ]
  }
);

// Middleware to calculate engagement score and set time fields
userBehaviorSchema.pre('save', function(next) {
  const date = this.timestamp || new Date();
  
  // Set time-based fields for analytics
  this.year = date.getFullYear();
  this.month = date.getMonth() + 1;
  this.day = date.getDate();
  this.dayOfWeek = date.getDay();
  this.hour = date.getHours();
  
  // Calculate engagement score based on action
  const scoreMap = {
    'viewed': 1,
    'searched': 2,
    'clicked': 3,
    'added-to-cart': 4,
    'added-to-favorites': 5,
    'reviewed': 8,
    'purchased': 10,
    'shared': 6,
    'liked': 3,
    'commented': 4,
    'followed': 5,
    'contacted-seller': 7,
    'filter-used': 1,
    'sort-used': 1,
    'spent-time': 1,
    'visited-profile': 2,
    'dismissed': -2,
    'reported': -5
  };
  
  this.engagementScore = scoreMap[this.action] || 0;
  
  next();
});

// Static method to get user behavior summary
userBehaviorSchema.statics.getUserBehaviorSummary = async function(userId, days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const summary = await this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        timestamp: { $gte: cutoffDate }
      }
    },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        totalEngagement: { $sum: '$engagementScore' }
      }
    },
    {
      $sort: { totalEngagement: -1 }
    }
  ]);
  
  return summary;
};

// Static method to get user interests
userBehaviorSchema.statics.getUserInterests = async function(userId, days = 60) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const interests = await this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        timestamp: { $gte: cutoffDate },
        'item.category': { $exists: true, $ne: null }
      }
    },
    {
      $group: {
        _id: '$item.category',
        count: { $sum: 1 },
        totalEngagement: { $sum: '$engagementScore' },
        actions: { $push: '$action' }
      }
    },
    {
      $sort: { totalEngagement: -1 }
    },
    {
      $limit: 10
    },
    {
      $lookup: {
        from: 'categories',
        localField: '_id',
        foreignField: '_id',
        as: 'categoryInfo'
      }
    }
  ]);
  
  return interests;
};

module.exports = mongoose.model('UserBehavior', userBehaviorSchema);
