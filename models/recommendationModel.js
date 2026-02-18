const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    
    // Item being recommended
    item: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
      },
      model: {
        type: String,
        enum: ['Product', 'Service', 'Post', 'Shop', 'Event'],
        required: true
      },
      title: String,
      description: String,
      image: String,
      price: Number,
      rating: Number,
      reviewsCount: Number
    },
    
    // Recommendation details
    recommendationType: {
      type: String,
      enum: [
        'collaborative-similar-users', // Users like you bought this
        'collaborative-similar-items', // Customers who viewed X also viewed this
        'content-based', // Similar to what you like
        'trending', // Popular right now
        'personalized', // Based on your preferences
        'seasonal', // Seasonal recommendations
        'deal-alert', // Price drop on wishlist item
        'back-in-stock', // Item you liked is back in stock
        'complementary', // Complements your past purchase
        'cross-category' // Different but related category
      ],
      required: true,
      index: true
    },
    
    // Recommendation score
    score: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
      default: 50
    },
    
    // Score breakdown
    scoreBreakdown: {
      collaborativeScore: { type: Number, default: 0 },
      contentScore: { type: Number, default: 0 },
      popularityScore: { type: Number, default: 0 },
      personalizedScore: { type: Number, default: 0 }
    },
    
    // Recommendation context
    context: {
      basedOnProduct: mongoose.Schema.Types.ObjectId,
      basedOnCategory: mongoose.Schema.Types.ObjectId,
      basedOnBrowsingHistory: Boolean,
      basedOnPurchaseHistory: Boolean,
      relatedToSearchQuery: String
    },
    
    // Engagement tracking
    isShown: { type: Boolean, default: true },
    isClicked: { type: Boolean, default: false },
    clickedAt: Date,
    
    isPurchased: { type: Boolean, default: false },
    purchasedAt: Date,
    
    isDismissed: { type: Boolean, default: false },
    dismissedAt: Date,
    dismissReason: {
      type: String,
      enum: ['not-interested', 'already-have', 'too-expensive', 'quality-issues', 'other']
    },
    
    isLiked: { type: Boolean, default: false },
    likedAt: Date,
    
    // Rating feedback
    userRating: {
      type: Number,
      min: 1,
      max: 5
    },
    ratingComment: String,
    ratedAt: Date,
    
    // Expiration
    expiresAt: Date, // Recommendations auto-expire
    status: {
      type: String,
      enum: ['active', 'expired', 'hidden'],
      default: 'active',
      index: true
    },
    
    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    
    updatedAt: Date
  },
  {
    timestamps: true,
    indexes: [
      { user: 1, createdAt: -1 },
      { user: 1, status: 1, createdAt: -1 },
      { user: 1, recommendationType: 1, score: -1 },
      { user: 1, isClicked: 1 },
      { user: 1, isPurchased: 1 },
      { 'item.model': 1, 'item.id': 1 },
      { status: 1, expiresAt: 1 },
      { createdAt: 1 } // For cleanup/archiving
    ]
  }
);

// Auto-set status to expired if past expiresAt
recommendationSchema.pre('save', function(next) {
  if (this.expiresAt && new Date() > this.expiresAt) {
    this.status = 'expired';
  }
  this.updatedAt = Date.now();
  next();
});

// Instance methods
recommendationSchema.methods.markAsClicked = function() {
  this.isClicked = true;
  this.clickedAt = Date.now();
  return this.save();
};

recommendationSchema.methods.markAsPurchased = function() {
  this.isPurchased = true;
  this.purchasedAt = Date.now();
  return this.save();
};

recommendationSchema.methods.dismiss = function(reason = 'other') {
  this.isDismissed = true;
  this.dismissedAt = Date.now();
  this.dismissReason = reason;
  this.status = 'hidden';
  return this.save();
};

// Static methods
recommendationSchema.statics.expireOldRecommendations = function() {
  return this.updateMany(
    { expiresAt: { $lt: Date.now() }, status: 'active' },
    { status: 'expired' }
  );
};

module.exports = mongoose.model('Recommendation', recommendationSchema);
