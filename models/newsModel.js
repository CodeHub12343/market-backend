// models/newsModel.js
const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'News must have a title'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    body: {
      type: String,
      required: [true, 'News must have body content']
    },
    summary: {
      type: String,
      trim: true,
      maxlength: [500, 'Summary cannot exceed 500 characters']
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'News must have an author']
    },
    campus: {
      // null / undefined => global announcement
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campus',
      default: null
    },
    category: {
      type: String,
      enum: ['announcement', 'notice', 'event', 'alert', 'other'],
      default: 'announcement'
    },
    bannerUrl: {
      type: String,
      default: ''
    },
    bannerPublicId: {
      type: String,
      default: ''
    },
    isPublished: {
      type: Boolean,
      default: true
    },
    publishedAt: {
      type: Date,
      default: Date.now
    },
    pinned: {
      type: Boolean,
      default: false
    },
    views: {
      type: Number,
      default: 0
    },
    savedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    shares: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// index for text search
newsSchema.index({ title: 'text', body: 'text', summary: 'text', category: 'text' });

// auto-populate author and campus on queries
newsSchema.pre(/^find/, function (next) {
  this.populate({ path: 'author', select: 'fullName email role' }).populate({
    path: 'campus',
    select: 'name shortCode'
  });
  next();
});

const News = mongoose.model('News', newsSchema);
module.exports = News;
