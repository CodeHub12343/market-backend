const mongoose = require('mongoose')

const roommateReviewSchema = new mongoose.Schema(
  {
    roommate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RoommateListing',
      required: [true, 'Roommate listing is required'],
      index: true
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reviewer is required'],
      index: true
    },
    landlord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: 1,
      max: 5
    },
    categories: {
      cleanliness: {
        type: Number,
        min: 1,
        max: 5,
        required: true
      },
      communication: {
        type: Number,
        min: 1,
        max: 5,
        required: true
      },
      respectful: {
        type: Number,
        min: 1,
        max: 5,
        required: true
      }
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [2000, 'Comment cannot exceed 2000 characters']
    },
    images: [
      {
        url: String,
        public_id: String
      }
    ],
    isVerified: {
      type: Boolean,
      default: false
    },
    helpfulCount: {
      type: Number,
      default: 0
    },
    unhelpfulCount: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  },
  { timestamps: true }
)

// Indexes for queries
roommateReviewSchema.index({ roommate: 1, rating: 1 })
roommateReviewSchema.index({ reviewer: 1 })
roommateReviewSchema.index({ createdAt: -1 })

// Unique review per user per roommate
roommateReviewSchema.index({ roommate: 1, reviewer: 1 }, { unique: true })

// Populate reviewer info
roommateReviewSchema.pre(/^find/, function () {
  if (this.options._recursed) {
    return
  }
  this.populate({
    path: 'reviewer',
    select: 'firstName lastName avatar'
  })
})

// Calculate average ratings for roommate
roommateReviewSchema.statics.calcAverageRating = async function (roommateId) {
  const stats = await this.aggregate([
    { $match: { roommate: mongoose.Types.ObjectId(roommateId), status: 'approved' } },
    {
      $group: {
        _id: '$roommate',
        avgRating: { $avg: '$rating' },
        avgCleanliness: { $avg: '$categories.cleanliness' },
        avgCommunication: { $avg: '$categories.communication' },
        avgRespectful: { $avg: '$categories.respectful' },
        reviewCount: { $sum: 1 }
      }
    }
  ])

  if (stats.length > 0) {
    await mongoose.model('RoommateListing').findByIdAndUpdate(roommateId, {
      'ratings.average': stats[0].avgRating,
      'ratings.cleanliness': stats[0].avgCleanliness,
      'ratings.communication': stats[0].avgCommunication,
      'ratings.respectful': stats[0].avgRespectful,
      'ratings.count': stats[0].reviewCount
    })
  }
}

roommateReviewSchema.post('save', function () {
  this.constructor.calcAverageRating(this.roommate)
})

roommateReviewSchema.pre(/^findByIdAndUpdate/, async function (next) {
  this.r = await this.findOne()
  next()
})

roommateReviewSchema.post(/^findByIdAndUpdate/, async function () {
  await this.r.constructor.calcAverageRating(this.r.roommate)
})

module.exports = mongoose.model('RoommateReview', roommateReviewSchema)
