const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Activity must have a title'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    location: {
      type: String,
    },
    campus: {
      type: mongoose.Schema.ObjectId,
      ref: 'Campus',
      required: [true, 'Activity must belong to a campus'],
    },
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Activity must have a creator'],
    },
  },
  { timestamps: true }
);

const Activity = mongoose.model('Activity', activitySchema);
module.exports = Activity;
