// src/models/reviewModel.js
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Review title cannot be empty!'],
      trim: true,
      maxlength: [100, 'Review title cannot exceed 100 characters'],
    },
    review: {
      type: String,
      required: [true, 'Review content cannot be empty!'],
      trim: true,
      minlength: [20, 'Review content must be at least 20 characters'],
      maxlength: [1000, 'Review content cannot exceed 1000 characters'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: [true, 'Rating is required'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Review must belong to a product.'],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user.'],
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate reviews (1 review per product per user)
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

// Populate user info automatically
reviewSchema.pre(/^find/, function (next) {
  this.populate({ path: 'user', select: 'fullName campus' });
  next();
});

// Static method to calculate average rating
reviewSchema.statics.calcAverageRatings = async function (productId) {
  const stats = await this.aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id: '$product',
        nRatings: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  const Product = mongoose.model('Product');
  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      ratingsQuantity: stats[0].nRatings,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Product.findByIdAndUpdate(productId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

// Recalculate when review is saved
reviewSchema.post('save', function () {
  this.constructor.calcAverageRatings(this.product);
});

// Recalculate when review is updated or deleted
reviewSchema.post(/^findOneAnd/, async function (doc) {
  if (doc) await doc.constructor.calcAverageRatings(doc.product);
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
