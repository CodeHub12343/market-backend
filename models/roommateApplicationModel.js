const mongoose = require('mongoose')

const roommateApplicationSchema = new mongoose.Schema(
  {
    roommate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RoomateListing',
      required: [true, 'Roommate listing is required'],
      index: true
    },
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Applicant is required'],
      index: true
    },
    landlord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'withdrawn'],
      default: 'pending',
      index: true
    },
    message: {
      type: String,
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters']
    },
    budget: {
      type: Number,
      required: [true, 'Budget is required'],
      min: 0
    },
    moveInDate: {
      type: Date,
      required: [true, 'Move-in date is required']
    },
    leaseDuration: {
      type: String,
      enum: ['flexible', '6-months', '12-months'],
      required: true
    },
    rating: {
      cleanliness: {
        type: Number,
        min: 1,
        max: 5
      },
      communication: {
        type: Number,
        min: 1,
        max: 5
      },
      respectful: {
        type: Number,
        min: 1,
        max: 5
      },
      overall: {
        type: Number,
        min: 1,
        max: 5
      }
    },
    responseMessage: {
      type: String,
      trim: true,
      maxlength: [500, 'Response cannot exceed 500 characters']
    },
    responseDate: Date,
    appliedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
)

// Indexes for queries
roommateApplicationSchema.index({ roommate: 1, status: 1 })
roommateApplicationSchema.index({ applicant: 1, status: 1 })
roommateApplicationSchema.index({ landlord: 1, status: 1 })
roommateApplicationSchema.index({ createdAt: -1 })

// Populate user and listing
roommateApplicationSchema.pre(/^find/, function () {
  if (this.options._recursed) {
    return
  }
  this.populate({
    path: 'applicant',
    select: 'firstName lastName email avatar'
  }).populate({
    path: 'landlord',
    select: 'firstName lastName email'
  }).populate({
    path: 'roommate',
    select: 'title location images budget'
  })
})

module.exports = mongoose.model('RoommateApplication', roommateApplicationSchema)
