const mongoose = require('mongoose');

const roommateSearchHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    
    query: {
      type: String,
      trim: true,
      required: true
    },
    
    filters: {
      location: String,
      minPrice: Number,
      maxPrice: Number,
      roomType: String,
      genderPreference: String,
      amenities: [String]
    },
    
    resultsCount: {
      type: Number,
      default: 0
    },
    
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true,
    indexes: [
      { user: 1, timestamp: -1 },
      { query: 1, timestamp: -1 },
      { user: 1, query: 1 }
    ]
  }
);

module.exports = mongoose.model('RoommateSearchHistory', roommateSearchHistorySchema);
