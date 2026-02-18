const mongoose = require('mongoose');

const searchAnalyticsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    
    // What was searched
    searchQuery: {
      type: String,
      trim: true,
      required: true
    },
    
    searchType: {
      type: String,
      enum: ['products', 'services', 'posts', 'users', 'global', 'autocomplete'],
      required: true,
      index: true
    },
    
    // Filters applied
    filters: mongoose.Schema.Types.Mixed,
    
    // Results information
    resultsCount: {
      type: Number,
      default: 0
    },
    
    resultsShown: {
      type: Number,
      default: 0 // Number of items shown to user
    },
    
    itemsClicked: {
      type: Number,
      default: 0 // Number of items user interacted with
    },
    
    conversionOccurred: {
      type: Boolean,
      default: false
    },
    
    // User behavior tracking
    timeSpent: {
      type: Number, // in milliseconds
      default: 0
    },
    
    sessionId: String,
    
    // Device information
    device: {
      type: String,
      enum: ['mobile', 'tablet', 'desktop'],
      default: 'desktop'
    },
    
    userAgent: String,
    ipAddress: String,
    
    // Result quality
    userFeedback: {
      relevant: Boolean, // Did search return relevant results?
      helpful: Boolean, // Did results help user find what they needed?
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      comment: String
    },
    
    // Timestamp
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
      expires: 7776000 // Auto-delete after 90 days
    }
  },
  {
    timestamps: false,
    indexes: [
      { user: 1, timestamp: -1 },
      { searchQuery: 1, timestamp: -1 },
      { searchType: 1, timestamp: -1 },
      { user: 1, searchType: 1, timestamp: -1 },
      { timestamp: 1 } // For TTL deletion
    ]
  }
);

// Create text index for search query analysis
searchAnalyticsSchema.index({ searchQuery: 'text' });

module.exports = mongoose.model('SearchAnalytics', searchAnalyticsSchema);
