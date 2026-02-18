const mongoose = require('mongoose');

const roommateListingSchema = new mongoose.Schema(
  {
    // Basic Information
    title: {
      type: String,
      required: [true, 'Listing title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters']
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    
    // Poster Information
    poster: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    
    // Room Details
    accommodation: {
      type: String,
      enum: ['hostel', 'apartment', 'house', 'lodge', 'other'],
      required: true
    },
    roomType: {
      type: String,
      enum: ['single', 'double', 'triple', 'shared', 'other'],
      default: 'shared'
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RoommateCategory',
      default: null
    },
    numberOfRooms: {
      type: Number,
      default: 1,
      min: 1
    },
    
    // Location Information
    location: {
      address: {
        type: String,
        required: true,
        trim: true,
        maxlength: [200, 'Address cannot exceed 200 characters']
      },
      city: String,
      campus: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campus',
        required: true
      },
      coordinates: {
        type: {
          type: String,
          enum: ['Point']
          // Removed default: 'Point' to avoid incomplete GeoJSON objects
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
      distanceFromCampusKm: Number
    },
    
    // Budget Information
    budget: {
      minPrice: {
        type: Number,
        required: true,
        min: 0
      },
      maxPrice: {
        type: Number,
        required: true,
        min: 0
      },
      currency: {
        type: String,
        default: 'NGN'
      },
      pricingPeriod: {
        type: String,
        enum: ['per-month', 'per-semester', 'per-year'],
        default: 'per-month'
      }
    },
    
    // Roommate Preferences
    preferences: {
      genderPreference: {
        type: String,
        enum: ['male', 'female', 'any'],
        required: true
      },
      ageRange: {
        min: { type: Number, min: 16, max: 60 },
        max: { type: Number, min: 16, max: 60 }
      },
      departments: [String], // Preferred departments/programs
      graduationYears: [Number], // Preferred graduation years
      studyHabits: {
        type: String,
        enum: ['quiet-study', 'flexible', 'casual'],
      },
      lifestyleCompatibility: [
        {
          type: String,
          enum: ['clean', 'organized', 'social', 'quiet', 'night-owl', 'early-riser', 'pet-friendly', 'non-smoker']
        }
      ],
      moveInDate: Date,
      leaseLength: {
        type: String,
        enum: ['flexible', 'per-semester', 'one-year', 'two-year'],
        default: 'flexible'
      }
    },
    
    // Required Features/Amenities
    requiredAmenities: [
      {
        type: String,
        enum: [
          'WiFi',
          'AC',
          'Fan',
          'Bathroom',
          'Kitchen',
          'Balcony',
          'Wardrobe',
          'Study Desk',
          'Parking',
          'Laundry',
          'TV',
          'Hot Water',
          '24/7 Power',
          'Generator'
        ]
      }
    ],
    
    // Contact Information
    contact: {
      phoneNumber: {
        type: String,
        required: true,
        trim: true
      },
      alternatePhoneNumber: String,
      email: String,
      whatsapp: String,
        preferredContactMethod: {
        type: String,
        enum: ['call', 'whatsapp', 'sms', 'email'],
        default: 'whatsapp'
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
    
    // Engagement
    analytics: {
      views: { type: Number, default: 0 },
      inquiries: { type: Number, default: 0 },
      favorites: { type: Number, default: 0 },
      lastViewed: Date
    },
    
    // Status
    status: {
      type: String,
      enum: ['active', 'closed', 'on-hold'],
      default: 'active'
    },
    closedAt: Date,
    closedReason: {
      type: String,
      enum: ['found-roommate', 'expired', 'no-longer-needed', 'manual-close']
    },
    
    // Tags for filtering
    tags: [String],
    
    // Audit
    createdAt: { type: Date, default: Date.now, index: -1 },
    updatedAt: { type: Date, default: Date.now },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Pre-save hook to remove incomplete coordinates
roommateListingSchema.pre('save', function(next) {
  // If coordinates exist but don't have a valid coordinates array, remove the entire coordinates object
  if (this.location.coordinates && (!this.location.coordinates.coordinates || this.location.coordinates.coordinates.length !== 2)) {
    this.location.coordinates = undefined;
  }
  next();
});

// Geospatial index (sparse - only for documents with coordinates)
roommateListingSchema.index({ 'location.coordinates': '2dsphere' }, { sparse: true });

// Text search
roommateListingSchema.index({
  title: 'text',
  description: 'text',
  'location.address': 'text',
  tags: 'text'
});

// Performance indexes
roommateListingSchema.index({ poster: 1, status: 1 });
roommateListingSchema.index({ 'location.campus': 1, status: 1 });
roommateListingSchema.index({ status: 1, expiresAt: 1 });
roommateListingSchema.index({ 'preferences.genderPreference': 1, status: 1 });
roommateListingSchema.index({ 'budget.minPrice': 1, 'budget.maxPrice': 1 });
roommateListingSchema.index({ createdAt: -1 });
roommateListingSchema.index({ expiresAt: 1 });

// Virtuals
roommateListingSchema.virtual('isExpired').get(function() {
  return this.expiresAt < new Date();
});

roommateListingSchema.virtual('daysUntilExpiry').get(function() {
  if (!this.expiresAt) return null;
  const now = new Date();
  const remaining = this.expiresAt - now;
  return remaining > 0 ? Math.ceil(remaining / (1000 * 60 * 60 * 24)) : 0;
});

roommateListingSchema.virtual('budgetRange').get(function() {
  return `${this.budget.minPrice} - ${this.budget.maxPrice} ${this.budget.currency}/${this.budget.pricingPeriod}`;
});

roommateListingSchema.virtual('hasImages').get(function() {
  return this.images && this.images.length > 0;
});

roommateListingSchema.virtual('isActive').get(function() {
  return this.status === 'active' && !this.isExpired;
});

// Pre-save middleware
roommateListingSchema.pre('save', function(next) {
  // Auto-close if expired
  if (this.expiresAt < new Date() && this.status === 'active') {
    this.status = 'closed';
    this.closedAt = new Date();
    this.closedReason = 'expired';
  }
  if (this.isModified()) {
    this.updatedAt = new Date();
  }
  next();
});

// Pre-find middleware
roommateListingSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'poster',
    select: 'fullName email avatar phoneNumber department graduationYear'
  });
  next();
});

const RoomateListing = mongoose.model('RoomateListing', roommateListingSchema);

module.exports = RoomateListing;
