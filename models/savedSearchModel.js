const mongoose = require('mongoose');

const savedSearchSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'A saved search must belong to a user']
    },
    
    name: {
      type: String,
      required: [true, 'Please provide a name for this search'],
      trim: true,
      maxlength: [50, 'Search name cannot exceed 50 characters'],
      minlength: [2, 'Search name must be at least 2 characters']
    },
    
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Description cannot exceed 200 characters']
    },
    
    // Search parameters
    searchType: {
      type: String,
      enum: ['products', 'services', 'posts', 'users', 'global'],
      required: true
    },
    
    filters: {
      // Generic filters
      search: String,
      category: [mongoose.Schema.Types.ObjectId],
      tags: [String],
      
      // Product-specific filters
      minPrice: Number,
      maxPrice: Number,
      condition: {
        type: String,
        enum: ['new', 'like-new', 'good', 'fair', 'poor']
      },
      status: {
        type: String,
        enum: ['active', 'inactive', 'sold', 'out-of-stock']
      },
      
      // Location-based filters
      location: {
        coordinates: [Number], // [lng, lat]
        radius: Number, // in kilometers
        address: String
      },
      
      // Availability filters
      isAvailable: Boolean,
      inStock: Boolean,
      
      // Sorting preferences
      sortBy: {
        type: String,
        enum: ['relevance', 'price-asc', 'price-desc', 'newest', 'oldest', 'most-viewed', 'most-liked', 'rating'],
        default: 'relevance'
      }
    },
    
    // Search statistics
    statistics: {
      resultsCount: { type: Number, default: 0 },
      timesRun: { type: Number, default: 0 },
      lastResults: [mongoose.Schema.Types.Mixed], // Store last results for quick access
      averageResultsCount: { type: Number, default: 0 }
    },
    
    // Notifications
    notifications: {
      enabled: { type: Boolean, default: false },
      frequency: {
        type: String,
        enum: ['instant', 'daily', 'weekly', 'never'],
        default: 'never'
      },
      lastNotificationSent: Date,
      newItemsCount: { type: Number, default: 0 }
    },
    
    // Metadata
    isDefault: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },
    tags: [String],
    
    createdAt: {
      type: Date,
      default: Date.now
    },
    
    lastUsedAt: Date,
    
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    indexes: [
      { user: 1, createdAt: -1 },
      { user: 1, isPinned: -1 },
      { user: 1, lastUsedAt: -1 },
      { 'filters.search': 1 },
      { searchType: 1, createdAt: -1 }
    ]
  }
);

// Update lastUsedAt before saving
savedSearchSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.updatedAt = Date.now();
  }
  next();
});

// Update lastUsedAt when search is executed
savedSearchSchema.methods.recordExecution = function(resultsCount) {
  this.lastUsedAt = Date.now();
  this.statistics.timesRun += 1;
  this.statistics.resultsCount = resultsCount;
  
  // Calculate average
  if (this.statistics.timesRun > 0) {
    this.statistics.averageResultsCount = 
      (this.statistics.averageResultsCount * (this.statistics.timesRun - 1) + resultsCount) / 
      this.statistics.timesRun;
  }
  
  return this.save();
};

module.exports = mongoose.model('SavedSearch', savedSearchSchema);
