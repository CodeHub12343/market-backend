const mongoose = require('mongoose');

const requestSearchHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    query: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    searchCount: {
      type: Number,
      default: 1
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index for user and query to easily find duplicates
requestSearchHistorySchema.index({ user: 1, query: 1 }, { unique: true });

// Index for sorting by recent searches
requestSearchHistorySchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('RequestSearchHistory', requestSearchHistorySchema);
