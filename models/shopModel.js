// src/models/shopModel.js
const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A shop must have a name'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'A shop must belong to a user']
    },
    campus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campus',
      required: [true, 'A shop must belong to a campus']
    },
    logo: String,
    isVerified: {
      type: Boolean,
      default: false
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      set: (val) => Math.round(val * 10) / 10
    },
    ratingsQuantity: {
      type: Number,
      default: 0
    },
    views: {
      type: Number,
      default: 0
    },
    whatsappNumber: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

// Method to increment view count
shopSchema.methods.incrementViews = async function() {
  this.views = (this.views || 0) + 1;
  return await this.save();
};

const Shop = mongoose.model('Shop', shopSchema);
module.exports = Shop;