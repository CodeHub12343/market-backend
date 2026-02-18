const mongoose = require('mongoose');
const Service = require('./serviceModel');

const serviceReviewSchema = new mongoose.Schema(
  {
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: [true, 'Review must belong to a service']
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user']
    },
    title: {
      type: String,
      required: [true, 'Review title cannot be empty!'],
      trim: true,
      maxlength: [100, 'Review title cannot exceed 100 characters'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: [true, 'Please provide a rating between 1 and 5']
    },
    review: {
      type: String,
      trim: true,
      minlength: [20, 'Review content must be at least 20 characters'],
      maxlength: [1000, 'Review cannot exceed 1000 characters'],
      required: [true, 'Review content cannot be empty!'],
    }
  },
  { timestamps: true }
);

// Prevent multiple reviews by same user on one service
serviceReviewSchema.index({ service: 1, user: 1 }, { unique: true });

// Auto populate reviewer info
serviceReviewSchema.pre(/^find/, function (next) {
  this.populate({ path: 'user', select: 'fullName role campus' });
  next();
});

// Aggregate average ratings on save/delete
serviceReviewSchema.statics.calcAverageRatings = async function (serviceId) {
  const stats = await this.aggregate([
    { $match: { service: serviceId } },
    {
      $group: {
        _id: '$service',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);

  if (stats.length > 0) {
    await Service.findByIdAndUpdate(serviceId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating
    });
  } else {
    await Service.findByIdAndUpdate(serviceId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5
    });
  }
};

// Hook for rating updates
serviceReviewSchema.post('save', function () {
  this.constructor.calcAverageRatings(this.service);
});

// Hook for rating deletion
serviceReviewSchema.post(/^findOneAnd/, async function (doc) {
  if (doc) await doc.constructor.calcAverageRatings(doc.service);
});

module.exports = mongoose.model('ServiceReview', serviceReviewSchema);
