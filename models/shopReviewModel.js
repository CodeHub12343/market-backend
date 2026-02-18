const mongoose = require('mongoose');
const Shop = require('./shopModel');

const shopReviewSchema = new mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: [true, 'Review must belong to a shop.']
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user.']
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: [true, 'Please provide a rating between 1 and 5.']
    },
    review: {
      type: String,
      trim: true,
      maxlength: [500, 'Review cannot exceed 500 characters.']
    }
  },
  { timestamps: true }
);

// Prevent multiple reviews by the same user on one shop
shopReviewSchema.index({ shop: 1, user: 1 }, { unique: true });

// Auto-populate reviewer info
shopReviewSchema.pre(/^find/, function (next) {
  this.populate({ path: 'user', select: 'fullName role campus' });
  next();
});

// Static method to calculate average ratings for a shop
shopReviewSchema.statics.calcAverageRatings = async function (shopId) {
  const stats = await this.aggregate([
    { $match: { shop: shopId } },
    {
      $group: {
        _id: '$shop',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);

  if (stats.length > 0) {
    await Shop.findByIdAndUpdate(shopId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating
    });
  } else {
    // If no reviews, reset to default values
    await Shop.findByIdAndUpdate(shopId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5
    });
  }
};

// Hook to update ratings when a review is saved
shopReviewSchema.post('save', function () {
  this.constructor.calcAverageRatings(this.shop);
});

// Hook to update ratings when a review is updated or deleted
shopReviewSchema.post(/^findOneAnd/, async function (doc) {
  if (doc) {
    await doc.constructor.calcAverageRatings(doc.shop);
  }
});

const ShopReview = mongoose.model('ShopReview', shopReviewSchema);

module.exports = ShopReview;
