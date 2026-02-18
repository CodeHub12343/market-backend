const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.ObjectId,
      ref: 'Post',
      required: true,
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    emoji: {
      type: String,
      enum: ['👍', '❤️', '😂', '😢', '👏', '🔥', '😍', '🤔'],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure unique reaction per user per post per emoji
reactionSchema.index({ post: 1, user: 1, emoji: 1 }, { unique: true });
reactionSchema.index({ post: 1 });
reactionSchema.index({ user: 1 });

module.exports = mongoose.model('Reaction', reactionSchema);
