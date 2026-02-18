const mongoose = require('mongoose');
const Hostel = require('./hostelModel');

const hostelReviewSchema = new mongoose.Schema(
  {
    hostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hostel',
      required: [true, 'Review must belong to a hostel']
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user']
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: [true, 'Please provide a rating between 1 and 5']
    },
    title: {
      type: String,
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters']
    },
    content: {
      type: String,
      trim: true,
      maxlength: [500, 'Review cannot exceed 500 characters']
    },
    helpfulCount: {
      type: Number,
      default: 0
    },
    helpfulUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  { timestamps: true }
);

// Prevent multiple reviews by same user on one hostel
hostelReviewSchema.index({ hostel: 1, user: 1 }, { unique: true });

// Auto populate reviewer info
hostelReviewSchema.pre(/^find/, function (next) {
  this.populate({ path: 'user', select: 'fullName role campus' });
  next();
});

// Aggregate average ratings on save/delete
hostelReviewSchema.statics.calcAverageRatings = async function (hostelId) {
  const stats = await this.aggregate([
    { $match: { hostel: new mongoose.Types.ObjectId(hostelId) } },
    {
      $group: {
        _id: '$hostel',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);

  if (stats.length > 0) {
    await Hostel.findByIdAndUpdate(hostelId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating
    });
  } else {
    await Hostel.findByIdAndUpdate(hostelId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5
    });
  }
};

// Hook for rating updates
hostelReviewSchema.post('save', function () {
  this.constructor.calcAverageRatings(this.hostel);
});

// Hook for rating deletion
hostelReviewSchema.post(/^findOneAnd/, async function (doc) {
  if (doc) await doc.constructor.calcAverageRatings(doc.hostel);
});

module.exports = mongoose.model('HostelReview', hostelReviewSchema);
