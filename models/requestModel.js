// src/models/requestModel.js
const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Request must have a title'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RequestCategory'
    },
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Request must belong to a user']
    },
    campus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campus'
    },
    // status: open, fulfilled, closed
    status: {
      type: String,
      enum: ['open', 'fulfilled', 'closed'],
      default: 'open'
    },
    // optional desired price (buyer indicates budget)
    desiredPrice: {
      type: Number,
      min: [0, 'Desired price must be positive'],
      max: [1000000, 'Desired price cannot exceed $1,000,000']
    },
    // Additional fields for enhanced functionality
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: [20, 'Tag cannot exceed 20 characters']
    }],
    location: {
      address: {
        type: String,
        trim: true,
        maxlength: [200, 'Address cannot exceed 200 characters']
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        validate: {
          validator: function(v) {
            return v.length === 2;
          },
          message: 'Coordinates must be an array of 2 numbers [longitude, latitude]'
        }
      }
    },
    whatsappNumber: {
      type: String,
      trim: true,
      match: {
        regex: /^\+[1-9]\d{1,14}$/,
        message: 'WhatsApp number must be in international format (e.g., +1234567890)'
      }
    },
    expiresAt: {
      type: Date,
      default: function() {
        return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      }
    },
    images: [{
      type: String,
      validate: {
        validator: function(v) {
          return /^https?:\/\/.+/.test(v);
        },
        message: 'Image must be a valid URL'
      }
    }],
    // Analytics and tracking
    analytics: {
      views: { type: Number, default: 0 },
      lastViewed: { type: Date },
      offersCount: { type: Number, default: 0 },
      responseTime: { type: Number }, // in hours
      fulfillmentRate: { type: Number, default: 0 }
    },
    // Request history for audit trail
    history: [{
      action: { type: String, enum: ['created', 'updated', 'fulfilled', 'closed', 'reopened', 'extended', 'images_uploaded', 'deleted'] },
      timestamp: { type: Date, default: Date.now },
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      details: { type: String },
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed
    }],
    // Settings
    settings: {
      allowOffers: { type: Boolean, default: true },
      notifyOnOffer: { type: Boolean, default: true },
      autoClose: { type: Boolean, default: false },
      publicVisibility: { type: Boolean, default: true }
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual fields
requestSchema.virtual('offers', {
  ref: 'Offer',
  foreignField: 'request',
  localField: '_id'
});

requestSchema.virtual('isActive').get(function() {
  return this.status === 'open' && (!this.expiresAt || this.expiresAt > new Date());
});

requestSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

requestSchema.virtual('timeRemaining').get(function() {
  if (!this.expiresAt) return null;
  const now = new Date();
  const remaining = this.expiresAt - now;
  return remaining > 0 ? Math.ceil(remaining / (1000 * 60 * 60 * 24)) : 0; // days
});

requestSchema.virtual('formattedPrice').get(function() {
  if (!this.desiredPrice) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(this.desiredPrice);
});

requestSchema.virtual('hasOffers').get(function() {
  return this.analytics.offersCount > 0;
});

// Indexes for better performance
requestSchema.index({ requester: 1, status: 1 });
requestSchema.index({ status: 1, createdAt: -1 });
requestSchema.index({ category: 1, status: 1 });
requestSchema.index({ campus: 1, status: 1 });
requestSchema.index({ priority: 1, status: 1 });
requestSchema.index({ expiresAt: 1 });
requestSchema.index({ 'analytics.views': -1 });
requestSchema.index({ 'analytics.offersCount': -1 });

// Text search index
requestSchema.index({ 
  title: 'text',
  description: 'text',
  tags: 'text'
});

// Geospatial index for location-based queries
requestSchema.index({ 'location.coordinates': '2dsphere' });

// Pre-save middleware
requestSchema.pre('save', function(next) {
  // Check if request is expired and update status if needed
  if (this.expiresAt && this.expiresAt < new Date() && this.status === 'open') {
    this.status = 'closed';
  }
  
  // Add to history if status changed
  if (this.isModified('status') && !this.isNew) {
    this.history.push({
      action: this.status,
      timestamp: new Date(),
      user: this.requester, // This should be the user making the change
      details: `Status changed to ${this.status}`
    });
  }
  
  next();
});

// Pre-find middleware to auto-populate
requestSchema.pre(/^find/, function (next) {
  this.populate({ path: 'requester', select: 'fullName campus role' });
  next();
});

// Static methods
requestSchema.statics.getRequestsByStatus = function(status, limit = 20) {
  return this.find({ status }).limit(limit).sort('-createdAt');
};

requestSchema.statics.getExpiredRequests = function() {
  return this.find({ 
    status: 'open', 
    expiresAt: { $lt: new Date() } 
  });
};

requestSchema.statics.getRequestsByRequester = function(requesterId, status = null) {
  const filter = { requester: requesterId };
  if (status) filter.status = status;
  return this.find(filter).sort('-createdAt');
};

requestSchema.statics.getRequestsByCategory = function(categoryId, status = 'open') {
  return this.find({ category: categoryId, status }).sort('-createdAt');
};

requestSchema.statics.getRequestsByCampus = function(campusId, status = 'open') {
  return this.find({ campus: campusId, status }).sort('-createdAt');
};

requestSchema.statics.searchRequests = function(query, filters = {}) {
  const searchQuery = {};
  
  if (query) {
    searchQuery.$text = { $search: query };
  }
  
  if (filters.status) searchQuery.status = filters.status;
  if (filters.category) searchQuery.category = filters.category;
  if (filters.campus) searchQuery.campus = filters.campus;
  if (filters.requester) searchQuery.requester = filters.requester;
  if (filters.priority) searchQuery.priority = filters.priority;
  if (filters.minPrice) searchQuery.desiredPrice = { $gte: filters.minPrice };
  if (filters.maxPrice) {
    searchQuery.desiredPrice = { ...searchQuery.desiredPrice, $lte: filters.maxPrice };
  }
  if (filters.hasOffers !== undefined) {
    if (filters.hasOffers) {
      searchQuery['analytics.offersCount'] = { $gt: 0 };
    } else {
      searchQuery['analytics.offersCount'] = 0;
    }
  }
  if (filters.expired !== undefined) {
    if (filters.expired) {
      searchQuery.expiresAt = { $lt: new Date() };
    } else {
      searchQuery.expiresAt = { $gte: new Date() };
    }
  }
  
  return this.find(searchQuery).sort('-createdAt');
};

requestSchema.statics.getAnalytics = function(requesterId = null, period = '30d') {
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
  if (requesterId) filter.requester = requesterId;
  
  return this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalPrice: { $sum: '$desiredPrice' },
        avgPrice: { $avg: '$desiredPrice' },
        avgViews: { $avg: '$analytics.views' },
        avgOffers: { $avg: '$analytics.offersCount' }
      }
    }
  ]);
};

// Instance methods
requestSchema.methods.incrementViews = function() {
  this.analytics.views += 1;
  this.analytics.lastViewed = new Date();
  return this.save();
};

requestSchema.methods.updateStatus = function(newStatus, reason = null, userId = null) {
  const oldStatus = this.status;
  this.status = newStatus;
  
  this.history.push({
    action: newStatus,
    timestamp: new Date(),
    user: userId || this.requester,
    details: reason || `Status changed from ${oldStatus} to ${newStatus}`,
    oldValue: oldStatus,
    newValue: newStatus
  });
  
  return this.save();
};

requestSchema.methods.extendExpiration = function(days = 30) {
  this.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return this.save();
};

requestSchema.methods.calculateResponseTime = function() {
  if (this.status === 'fulfilled') {
    const responseTime = (new Date() - this.createdAt) / (1000 * 60 * 60); // hours
    this.analytics.responseTime = responseTime;
    return this.save();
  }
};

requestSchema.methods.updateOffersCount = async function() {
  const Offer = require('./offerModel');
  const count = await Offer.countDocuments({ request: this._id });
  this.analytics.offersCount = count;
  return this.save();
};

const Request = mongoose.model('Request', requestSchema);
module.exports = Request;
