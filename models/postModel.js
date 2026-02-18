// models/postModel.js
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Post must have an author']
    },
    campus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campus',
      required: [true, 'Post must belong to a campus']
    },
    content: {
      type: String,
      trim: true,
      maxlength: [2000, 'Post content is too long']
    },
    media: [
      {
        url: { type: String },
        publicId: { type: String },
        resourceType: { type: String, enum: ['image', 'video', 'raw'], default: 'image' }
      }
    ],
    visibility: {
      type: String,
      enum: ['public', 'campus', 'private'],
      default: 'campus'
    },
    tags: [String],
    pinned: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
    isReported: { type: Boolean, default: false },
    // users who liked this post (store ObjectIds so we can prevent double-likes)
    likedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    bookmarkedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    views: {
      type: Number,
      default: 0
    },
    shares: {
      facebook: { type: Number, default: 0 },
      twitter: { type: Number, default: 0 },
      whatsapp: { type: Number, default: 0 },
      link: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

// text index for search
postSchema.index({ content: 'text', tags: 'text' });

// autopopulate author basic info
postSchema.pre(/^find/, function (next) {
  this.populate({ path: 'author', select: 'fullName role campus' });
  next();
});

const Post = mongoose.model('Post', postSchema);
module.exports = Post;
