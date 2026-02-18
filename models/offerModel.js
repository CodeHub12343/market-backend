// src/models/offerModel.js
const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema(
  {
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Request',
      required: [true, 'Offer must be linked to a request']
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product' // optional: seller can offer a product they already listed
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Offer must have a seller']
    },
    amount: {
      type: Number,
      required: [true, 'Offer must include an amount'],
      min: [0.01, 'Amount must be at least $0.01'],
      max: [1000000, 'Amount cannot exceed $1,000,000']
    },
    message: {
      type: String,
      trim: true,
      maxlength: [500, 'Message cannot exceed 500 characters']
    },
    // pending, accepted, rejected, withdrawn, cancelled
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'withdrawn', 'cancelled'],
      default: 'pending'
    },
    // Additional fields for enhanced functionality
    reason: {
      type: String,
      trim: true,
      maxlength: [200, 'Reason cannot exceed 200 characters']
    },
    expiresAt: {
      type: Date,
      default: function() {
        return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      }
    },
    // Analytics and tracking
    analytics: {
      views: { type: Number, default: 0 },
      lastViewed: { type: Date },
      responseTime: { type: Number }, // in hours
      acceptanceRate: { type: Number, default: 0 }
    },
    // Offer history for audit trail
    history: [{
      action: { type: String, enum: ['created', 'updated', 'accepted', 'rejected', 'withdrawn', 'cancelled'] },
      timestamp: { type: Date, default: Date.now },
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      details: { type: String },
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed
    }],
    // Settings
    settings: {
      autoExpire: { type: Boolean, default: true },
      notifyOnView: { type: Boolean, default: false },
      allowCounterOffers: { type: Boolean, default: true }
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual fields
offerSchema.virtual('isActive').get(function() {
  return this.status === 'pending' && !this.isExpired;
});

offerSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

offerSchema.virtual('timeRemaining').get(function() {
  if (!this.expiresAt) return null;
  const now = new Date();
  const remaining = this.expiresAt - now;
  return remaining > 0 ? Math.ceil(remaining / (1000 * 60 * 60)) : 0; // hours
});

offerSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(this.amount);
});

// Indexes for better performance
offerSchema.index({ request: 1, status: 1 });
offerSchema.index({ seller: 1, status: 1 });
offerSchema.index({ status: 1, createdAt: -1 });
offerSchema.index({ amount: 1 });
offerSchema.index({ expiresAt: 1 });
offerSchema.index({ 'analytics.views': -1 });

// Text search index
offerSchema.index({ 
  message: 'text',
  reason: 'text'
});

// Pre-save middleware
offerSchema.pre('save', function(next) {
  // Check if offer is expired and update status if needed
  if (this.expiresAt && this.expiresAt < new Date() && this.status === 'pending') {
    this.status = 'cancelled';
  }
  
  // Add to history if status changed
  if (this.isModified('status') && !this.isNew) {
    this.history.push({
      action: this.status,
      timestamp: new Date(),
      user: this.seller, // This should be the user making the change
      details: `Status changed to ${this.status}`
    });
  }
  
  next();
});

// Pre-find middleware to auto-populate
offerSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'seller',
    select: 'fullName campus role isAvailable',
    populate: {
      path: 'campus',
      select: 'name location'
    }
  }).populate({
    path: 'request',
    select: 'title description desiredPrice location requiredDate status',
    populate: {
      path: 'requester',
      select: 'fullName phoneNumber whatsapp email'
    }
  });
  next();
});

// Static methods
offerSchema.statics.getOffersByStatus = function(status, limit = 20) {
  return this.find({ status }).limit(limit).sort('-createdAt');
};

offerSchema.statics.getExpiredOffers = function() {
  return this.find({ 
    status: 'pending', 
    expiresAt: { $lt: new Date() } 
  });
};

offerSchema.statics.getOffersBySeller = function(sellerId, status = null) {
  const filter = { seller: sellerId };
  if (status) filter.status = status;
  return this.find(filter).sort('-createdAt');
};

offerSchema.statics.getOffersByRequest = function(requestId) {
  return this.find({ request: requestId }).sort('-createdAt');
};

offerSchema.statics.searchOffers = function(query, filters = {}) {
  const searchQuery = {};
  
  if (query) {
    searchQuery.$text = { $search: query };
  }
  
  if (filters.status) searchQuery.status = filters.status;
  if (filters.seller) searchQuery.seller = filters.seller;
  if (filters.request) searchQuery.request = filters.request;
  if (filters.minAmount) searchQuery.amount = { $gte: filters.minAmount };
  if (filters.maxAmount) {
    searchQuery.amount = { ...searchQuery.amount, $lte: filters.maxAmount };
  }
  
  return this.find(searchQuery).sort('-createdAt');
};

offerSchema.statics.getAnalytics = function(sellerId = null, period = '30d') {
  const now = new Date();
  let startDate;
  
  switch (period) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '1y':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(0);
  }
  
  const filter = { createdAt: { $gte: startDate } };
  if (sellerId) filter.seller = sellerId;
  
  return this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        avgAmount: { $avg: '$amount' }
      }
    }
  ]);
};

// Instance methods
offerSchema.methods.incrementViews = function() {
  this.analytics.views += 1;
  this.analytics.lastViewed = new Date();
  return this.save();
};

offerSchema.methods.updateStatus = function(newStatus, reason = null, userId = null) {
  const oldStatus = this.status;
  this.status = newStatus;
  if (reason) this.reason = reason;
  
  this.history.push({
    action: newStatus,
    timestamp: new Date(),
    user: userId || this.seller,
    details: reason || `Status changed from ${oldStatus} to ${newStatus}`,
    oldValue: oldStatus,
    newValue: newStatus
  });
  
  return this.save();
};

offerSchema.methods.extendExpiration = function(days = 7) {
  this.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return this.save();
};

offerSchema.methods.calculateResponseTime = function() {
  if (this.status === 'accepted' || this.status === 'rejected') {
    const responseTime = (new Date() - this.createdAt) / (1000 * 60 * 60); // hours
    this.analytics.responseTime = responseTime;
    return this.save();
  }
};

const Offer = mongoose.model('Offer', offerSchema);
module.exports = Offer;
