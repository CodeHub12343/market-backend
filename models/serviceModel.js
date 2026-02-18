const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'A service must have a title'],
      trim: true,
      maxlength: [100, 'Service title cannot exceed 100 characters']
    },
    description: {
      type: String,
      required: [true, 'A service must have a description'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    price: {
      type: Number,
      required: [true, 'A service must have a price'],
      min: [0, 'Price must be positive']
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceCategory',
      default: null
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: [20, 'Tag cannot exceed 20 characters']
    }],
    
    // Provider and Location
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    campus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campus',
      required: true
    },
    
    // Contact Information
    whatsappNumber: {
      type: String,
      trim: true,
      default: null,
      validate: {
        validator: function(v) {
          if (!v) return true; // Optional field
          return /(\+)?\d{10,15}/.test(v.replace(/\D/g, ''));
        },
        message: 'WhatsApp number must be 10-15 digits'
      }
    },
    
    // Service Details
    duration: {
      type: Number,
      default: 60, // in minutes
      min: [1, 'Duration must be at least 1 minute'],
      max: [1440, 'Duration cannot exceed 24 hours']
    },
    maxBookings: {
      type: Number,
      default: 10,
      min: [1, 'Max bookings must be at least 1'],
      max: [100, 'Max bookings cannot exceed 100']
    },
    currentBookings: {
      type: Number,
      default: 0,
      min: [0, 'Current bookings cannot be negative']
    },
    
    // Location Information
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: false
      },
      address: {
        type: String,
        trim: true,
        maxlength: [200, 'Address cannot exceed 200 characters']
      }
    },
    
    // Availability Schedule
    availability: {
      days: [{
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      }],
      startTime: {
        type: String,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format']
      },
      endTime: {
        type: String,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format']
      }
    },
    
    // Booking Type (how service can be booked)
    bookingType: {
      type: String,
      enum: ['on-demand', 'available', 'by-appointment'],
      default: 'available',
      required: true
    },
    
    // Image Management
    images: [String],
    images_meta: [{
      url: String,
      public_id: String
    }],
    
    // Ratings and Reviews
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be at least 1.0'],
      max: [5, 'Rating must be below 5.0'],
      set: val => Math.round(val * 10) / 10
    },
    ratingsQuantity: {
      type: Number,
      default: 0
    },
    
    // Service Status
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'completed'],
      default: 'active'
    },
    active: {
      type: Boolean,
      default: true
    },
    
    // Analytics
    analytics: {
      views: {
        type: Number,
        default: 0
      },
      totalBookings: {
        type: Number,
        default: 0
      },
      totalRevenue: {
        type: Number,
        default: 0
      },
      lastViewed: {
        type: Date,
        default: Date.now
      }
    },
    
    // Settings
    settings: {
      allowInstantBooking: {
        type: Boolean,
        default: true
      },
      requireApproval: {
        type: Boolean,
        default: false
      },
      cancellationPolicy: {
        type: String,
        enum: ['flexible', 'moderate', 'strict'],
        default: 'moderate'
      }
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual fields
serviceSchema.virtual('isActive').get(function() {
  return this.status === 'active' && this.active;
});

serviceSchema.virtual('isAvailable').get(function() {
  return this.isActive && this.currentBookings < this.maxBookings;
});

serviceSchema.virtual('hasImages').get(function() {
  return this.images && this.images.length > 0;
});

serviceSchema.virtual('isPopular').get(function() {
  return this.analytics.views > 100 || this.ratingsQuantity > 10;
});

// Indexes
serviceSchema.index({ title: 'text', description: 'text', category: 'text', tags: 'text' });
serviceSchema.index({ price: 1 });
serviceSchema.index({ category: 1 });
serviceSchema.index({ campus: 1 });
serviceSchema.index({ provider: 1 });
serviceSchema.index({ status: 1, active: 1 });
serviceSchema.index({ 'location.coordinates': '2dsphere' });
serviceSchema.index({ ratingsAverage: -1 });
serviceSchema.index({ 'analytics.views': -1 });
serviceSchema.index({ createdAt: -1 });

// Static methods
serviceSchema.statics.getTopRated = function(limit = 10) {
  return this.find({ status: 'active', active: true })
    .sort({ ratingsAverage: -1, ratingsQuantity: -1 })
    .limit(limit);
};

serviceSchema.statics.getMostViewed = function(limit = 10) {
  return this.find({ status: 'active', active: true })
    .sort({ 'analytics.views': -1 })
    .limit(limit);
};

serviceSchema.statics.getByCategory = function(category, limit = 20) {
  return this.find({ 
    category: new RegExp(category, 'i'), 
    status: 'active', 
    active: true 
  }).limit(limit);
};

serviceSchema.statics.getByCampus = function(campusId, limit = 20) {
  return this.find({ 
    campus: campusId, 
    status: 'active', 
    active: true 
  }).limit(limit);
};

serviceSchema.statics.searchServices = function(query, filters = {}) {
  const searchQuery = {
    $text: { $search: query },
    status: 'active',
    active: true,
    ...filters
  };

  return this.find(searchQuery, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } });
};

// Instance methods
serviceSchema.methods.incrementViews = function() {
  this.analytics.views += 1;
  this.analytics.lastViewed = new Date();
  return this.save({ validateBeforeSave: false });
};

serviceSchema.methods.incrementBookings = function() {
  this.currentBookings += 1;
  this.analytics.totalBookings += 1;
  return this.save({ validateBeforeSave: false });
};

serviceSchema.methods.decrementBookings = function() {
  if (this.currentBookings > 0) {
    this.currentBookings -= 1;
  }
  return this.save({ validateBeforeSave: false });
};

serviceSchema.methods.updateStatus = function(status) {
  this.status = status;
  if (status === 'inactive' || status === 'suspended') {
    this.active = false;
  } else if (status === 'active') {
    this.active = true;
  }
  return this.save();
};

serviceSchema.methods.addRevenue = function(amount) {
  this.analytics.totalRevenue += amount;
  return this.save({ validateBeforeSave: false });
};

module.exports = mongoose.model('Service', serviceSchema);
