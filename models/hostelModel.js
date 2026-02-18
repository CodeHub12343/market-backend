const mongoose = require('mongoose');

const hostelSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: [true, 'Hostel name is required'],
      trim: true,
      maxlength: [100, 'Hostel name cannot exceed 100 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    
    // Owner/Agent Information
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Hostel must belong to an owner'],
      index: true
    },
    ownerType: {
      type: String,
      enum: ['individual', 'agent', 'agency'],
      default: 'individual'
    },
    
    // Location & Address
    location: {
      address: {
        type: String,
        required: [true, 'Hostel address is required'],
        trim: true,
        maxlength: [200, 'Address cannot exceed 200 characters']
      },
      city: {
        type: String,
        trim: true
      },
      state: {
        type: String,
        trim: true
      },
      campus: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campus',
        required: true
      },
      coordinates: {
        type: {
          type: String,
          enum: ['Point']
          // Removed default: 'Point' to prevent incomplete objects
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          validate: {
            validator: function(v) {
              return !v || (v.length === 2 && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90);
            },
            message: 'Invalid coordinates'
          }
        }
      },
      distanceFromCampusKm: {
        type: Number,
        min: 0
      }
    },
    
    // Hostel Type & Details
    type: {
      type: String,
      enum: ['boys', 'girls', 'mixed', 'family'],
      required: [true, 'Hostel type is required']
    },
    hostelClass: {
      type: String,
      enum: ['budget', 'standard', 'premium', 'luxury'],
      default: 'standard'
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HostelCategory',
      default: null
    },
    
    // Facilities & Amenities
    amenities: [
      {
        type: String,
        trim: true,
        minlength: [2, 'Amenity must be at least 2 characters'],
        maxlength: [50, 'Amenity must not exceed 50 characters']
      }
    ],
    
    // Room Information
    roomTypes: [
      {
        type: {
          type: String,
          enum: ['single', 'double', 'triple', 'quad', 'dorm', 'dormitory'],
          required: true
        },
        price: {
          type: Number,
          required: [true, 'Room price is required'],
          min: [0, 'Price must be positive']
        },
        currency: {
          type: String,
          default: 'NGN'
        },
        pricingPeriod: {
          type: String,
          enum: ['per-month', 'per-semester', 'per-year', 'per-night'],
          default: 'per-month'
        },
        availableRooms: {
          type: Number,
          default: 0,
          min: 0
        },
        occupancy: {
          type: Number,
          required: true,
          min: 1
        },
        description: String,
        amenitiesIncluded: [String],
        deposit: {
          type: Number,
          min: 0
        },
        serviceCharge: {
          type: Number,
          min: 0,
          default: 0
        }
      }
    ],
    
    // Contact Information
    contact: {
      phoneNumber: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true
      },
      alternatePhoneNumber: String,
      email: String,
      whatsapp: String,
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
      }
    },
    
    // Images
    images: [String],
    images_meta: [
      {
        url: String,
        public_id: String,
        uploadedAt: { type: Date, default: Date.now }
      }
    ],
    thumbnail: String, // Featured image
    
    // Policies & Rules
    policies: {
      visitorPolicy: {
        type: String,
        enum: ['restricted', 'limited', 'allowed'],
        default: 'restricted'
      },
      visitorHours: String, // e.g., "9AM-6PM"
      guestAllowed: {
        type: Boolean,
        default: false
      },
      noisePolicy: String,
      petPolicy: {
        type: String,
        enum: ['not-allowed', 'allowed-with-fee', 'allowed'],
        default: 'not-allowed'
      },
      cookingPolicy: String,
      alcoholPolicy: {
        type: Boolean,
        default: false
      },
      smokingPolicy: {
        type: Boolean,
        default: false
      },
      curfewTime: String, // e.g., "10PM"
      lockoutTime: String // e.g., "Midnight"
    },
    
    // Booking & Availability
    availabilityStatus: {
      type: String,
      enum: ['available', 'fully-booked', 'limited', 'maintenance'],
      default: 'available'
    },
    minimumStayDays: {
      type: Number,
      default: 30
    },
    bookingAdvanceDays: {
      type: Number,
      default: 0
    },
    
    // Verification & Status
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending-verification', 'suspended'],
      default: 'pending-verification'
    },
    
    // Analytics & Performance
    analytics: {
      views: { type: Number, default: 0 },
      favorites: { type: Number, default: 0 },
      inquiries: { type: Number, default: 0 },
      bookings: { type: Number, default: 0 },
      lastViewed: Date
    },
    
    // Ratings & Reviews
    ratings: [
      {
        rating: {
          type: Number,
          min: 1,
          max: 5,
          required: true
        },
        review: String,
        reviewer: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    ratingsAverage: {
      type: Number,
      default: 0,
      min: [0, 'Rating must be at least 0'],
      max: [5, 'Rating cannot exceed 5'],
      set: (val) => Math.round(val * 10) / 10
    },
    ratingsQuantity: {
      type: Number,
      default: 0
    },
    
    // Media & Social
    video: {
      url: String,
      public_id: String
    },
    tags: [String],
    
    // Documents
    documents: [
      {
        type: {
          type: String,
          enum: ['license', 'certificate', 'inspection', 'other'],
          required: true
        },
        url: String,
        public_id: String,
        uploadedAt: { type: Date, default: Date.now }
      }
    ],
    
    // Audit Trail
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Geospatial index for location-based queries
hostelSchema.index({ 'location.coordinates': '2dsphere' });

// Text search indexes
hostelSchema.index({
  name: 'text',
  description: 'text',
  'location.address': 'text',
  tags: 'text'
});

// Performance indexes
hostelSchema.index({ owner: 1, status: 1 });
hostelSchema.index({ 'location.campus': 1, status: 1 });
hostelSchema.index({ type: 1, status: 1 });
hostelSchema.index({ 'roomTypes.price': 1 });
hostelSchema.index({ ratingsAverage: -1 });
hostelSchema.index({ 'analytics.views': -1 });
hostelSchema.index({ isVerified: 1, status: 1 });
hostelSchema.index({ createdAt: -1 });

// Virtuals
hostelSchema.virtual('minPrice').get(function() {
  if (!this.roomTypes || this.roomTypes.length === 0) return null;
  return Math.min(...this.roomTypes.map(r => r.price));
});

hostelSchema.virtual('maxPrice').get(function() {
  if (!this.roomTypes || this.roomTypes.length === 0) return null;
  return Math.max(...this.roomTypes.map(r => r.price));
});

hostelSchema.virtual('averageRating').get(function() {
  return this.ratingsAverage;
});

hostelSchema.virtual('totalAmenities').get(function() {
  return this.amenities.length;
});

hostelSchema.virtual('totalRoomTypes').get(function() {
  return this.roomTypes.length;
});

hostelSchema.virtual('availableRoomsCount').get(function() {
  if (!this.roomTypes) return 0;
  return this.roomTypes.reduce((total, room) => total + (room.availableRooms || 0), 0);
});

hostelSchema.virtual('hasImages').get(function() {
  return this.images && this.images.length > 0;
});

hostelSchema.virtual('isFull').get(function() {
  return this.availabilityStatus === 'fully-booked';
});

// Pre-save middleware
hostelSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.updatedAt = new Date();
  }
  next();
});

// Pre-find middleware to auto-populate
hostelSchema.pre(/^find/, function(next) {
  // Only populate owner, not the entire user object
  this.populate({
    path: 'owner',
    select: 'fullName email avatar phoneNumber'
  });
  next();
});

const Hostel = mongoose.model('Hostel', hostelSchema);

module.exports = Hostel;
