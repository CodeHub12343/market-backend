const mongoose = require('mongoose');

const shopOfferSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Offer title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: [true, 'Shop is required']
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    enum: ['food', 'technology', 'fashion', 'beauty', 'general', 'other'],
    default: 'general'
  },
  discount: {
    type: {
      type: String,
      enum: ['percentage', 'flat'],
      required: true
    },
    value: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: [0, 'Discount value must be positive']
    }
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
    default: Date.now
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(value) {
        return value > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  location: {
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true
    },
    campus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campus',
      required: [true, 'Campus is required']
    }
  },
  image: {
    type: String,
    default: null
  },
  termsConditions: {
    type: String,
    trim: true,
    maxlength: [1000, 'Terms and conditions cannot exceed 1000 characters']
  },
  visibility: {
    type: String,
    enum: ['public', 'campus', 'private'],
    default: 'public'
  },
  maxClaims: {
    type: Number,
    default: null,
    min: [1, 'Max claims must be at least 1']
  },
  claims: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      claimedAt: {
        type: Date,
        default: Date.now
      },
      status: {
        type: String,
        enum: ['claimed', 'used', 'expired'],
        default: 'claimed'
      }
    }
  ],
  claimCount: {
    type: Number,
    default: 0,
    min: 0
  },
  favorites: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
shopOfferSchema.index({ shop: 1, seller: 1 });
shopOfferSchema.index({ 'location.campus': 1 });
shopOfferSchema.index({ category: 1 });
shopOfferSchema.index({ startDate: 1, endDate: 1 });
shopOfferSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ShopOffer', shopOfferSchema);
