// models/favoriteModel.js
const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Favorite must belong to a user']
    },
    item: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Favorite must reference an item'],
      refPath: 'itemType'
    },
    itemType: {
      type: String,
      required: [true, 'Favorite must have an item type'],
      enum: ['Post', 'Product', 'Service', 'Event', 'Document']
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: [20, 'Tag cannot exceed 20 characters']
    }],
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters']
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    metadata: {
      source: {
        type: String,
        enum: ['manual', 'auto', 'import'],
        default: 'manual'
      },
      importedAt: Date,
      lastAccessed: Date,
      accessCount: {
        type: Number,
        default: 0
      }
    }
  },
  { timestamps: true }
);

// Indexes for performance
favoriteSchema.index({ user: 1, item: 1, itemType: 1 }, { unique: true });
favoriteSchema.index({ user: 1, createdAt: -1 });
favoriteSchema.index({ user: 1, itemType: 1, createdAt: -1 });
favoriteSchema.index({ user: 1, isActive: 1 });
favoriteSchema.index({ user: 1, priority: 1 });
favoriteSchema.index({ item: 1, itemType: 1 });
favoriteSchema.index({ tags: 1 });
favoriteSchema.index({ 'metadata.lastAccessed': -1 });

// Virtual fields
favoriteSchema.virtual('isRecent').get(function() {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  return this.createdAt > threeDaysAgo;
});

favoriteSchema.virtual('isFrequentlyAccessed').get(function() {
  return this.metadata.accessCount > 5;
});

// Pre-save middleware
favoriteSchema.pre('save', function(next) {
  if (this.isNew) {
    this.metadata.lastAccessed = new Date();
  }
  next();
});

// Static methods
favoriteSchema.statics.getUserFavorites = function(userId, options = {}) {
  const { itemType, limit = 20, page = 1, sort = '-createdAt' } = options;
  const filter = { user: userId, isActive: true };
  if (itemType) filter.itemType = itemType;
  
  return this.find(filter)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit);
};

favoriteSchema.statics.getFavoritesByType = function(userId, itemType) {
  return this.find({ user: userId, itemType, isActive: true }).sort('-createdAt');
};

favoriteSchema.statics.getFavoriteStats = function(userId) {
  return this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId), isActive: true } },
    {
      $group: {
        _id: '$itemType',
        count: { $sum: 1 },
        lastAdded: { $max: '$createdAt' }
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
            lastAdded: '$lastAdded'
          }
        }
      }
    }
  ]);
};

favoriteSchema.statics.getPopularItems = function(itemType, limit = 10) {
  return this.aggregate([
    { $match: { itemType, isActive: true } },
    {
      $group: {
        _id: '$item',
        favoriteCount: { $sum: 1 },
        lastFavorited: { $max: '$createdAt' }
      }
    },
    { $sort: { favoriteCount: -1, lastFavorited: -1 } },
    { $limit: limit }
  ]);
};

favoriteSchema.statics.getRecentFavorites = function(userId, limit = 10) {
  return this.find({ user: userId, isActive: true })
    .sort('-createdAt')
    .limit(limit);
};

favoriteSchema.statics.searchFavorites = function(userId, query, options = {}) {
  const { itemType, limit = 20, page = 1 } = options;
  const filter = { 
    user: userId, 
    isActive: true,
    $or: [
      { tags: { $in: [new RegExp(query, 'i')] } },
      { notes: { $regex: query, $options: 'i' } }
    ]
  };
  
  if (itemType) filter.itemType = itemType;
  
  return this.find(filter)
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(limit);
};

// Instance methods
favoriteSchema.methods.incrementAccess = function() {
  this.metadata.accessCount += 1;
  this.metadata.lastAccessed = new Date();
  return this.save();
};

favoriteSchema.methods.addTag = function(tag) {
  if (!this.tags.includes(tag) && this.tags.length < 10) {
    this.tags.push(tag);
    return this.save();
  }
  return Promise.resolve(this);
};

favoriteSchema.methods.removeTag = function(tag) {
  this.tags = this.tags.filter(t => t !== tag);
  return this.save();
};

favoriteSchema.methods.updateNotes = function(notes) {
  this.notes = notes;
  return this.save();
};

favoriteSchema.methods.setPriority = function(priority) {
  this.priority = priority;
  return this.save();
};

favoriteSchema.methods.archive = function() {
  this.isActive = false;
  return this.save();
};

favoriteSchema.methods.restore = function() {
  this.isActive = true;
  return this.save();
};

const Favorite = mongoose.model('Favorite', favoriteSchema);
module.exports = Favorite;
