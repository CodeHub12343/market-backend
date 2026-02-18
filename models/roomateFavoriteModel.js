const mongoose = require('mongoose')

const roomateFavoriteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true
    },
    roommate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RoommateListing',
      required: [true, 'Roommate listing is required'],
      index: true
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters']
    },
    savedAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  { timestamps: true }
)

// Unique favorite per user per roommate
roomateFavoriteSchema.index({ user: 1, roommate: 1 }, { unique: true })
roomateFavoriteSchema.index({ user: 1, savedAt: -1 })

// Populate roommate info
roomateFavoriteSchema.pre(/^find/, function () {
  if (this.options._recursed) {
    return
  }
  this.populate({
    path: 'roommate',
    select: 'title location images budget accommodation roomType ratings'
  })
})

module.exports = mongoose.model('RoomateFavorite', roomateFavoriteSchema)
