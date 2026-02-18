const mongoose = require('mongoose');

const favoriteCollectionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    items: [
      {
        itemType: {
          type: String,
          enum: ['Post', 'Product', 'Service', 'Event', 'Document'],
          required: true,
        },
        itemId: {
          type: mongoose.Schema.ObjectId,
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isPublic: {
      type: Boolean,
      default: false,
    },
    sharedWith: [
      {
        userId: {
          type: mongoose.Schema.ObjectId,
          ref: 'User',
        },
        permission: {
          type: String,
          enum: ['view', 'edit'],
          default: 'view',
        },
      },
    ],
    tags: [String],
    itemCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast queries
favoriteCollectionSchema.index({ user: 1, name: 1 }, { unique: true });
favoriteCollectionSchema.index({ user: 1, isPublic: 1 });
favoriteCollectionSchema.index({ 'sharedWith.userId': 1 });
favoriteCollectionSchema.index({ tags: 1 });

// Pre-save hook to update item count
favoriteCollectionSchema.pre('save', function (next) {
  this.itemCount = this.items.length;
  next();
});

module.exports = mongoose.model('FavoriteCollection', favoriteCollectionSchema);
