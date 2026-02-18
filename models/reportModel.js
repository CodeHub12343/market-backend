const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Report must have a reporter']
    },
    targetType: {
      type: String,
      enum: ['post', 'user', 'comment', 'product', 'service'],
      required: [true, 'Report must specify what is being reported']
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Report must reference a target item']
    },
    reason: {
      type: String,
      enum: [
        'spam',
        'inappropriate_content',
        'harassment',
        'hate_speech',
        'violence',
        'illegal_content',
        'intellectual_property',
        'impersonation',
        'other'
      ],
      required: [true, 'Report must specify a reason']
    },
    details: {
      type: String,
      trim: true,
      maxlength: [500, 'Report details cannot exceed 500 characters']
    },
    status: {
      type: String,
      enum: ['pending', 'investigating', 'resolved', 'dismissed'],
      default: 'pending'
    },
    adminNotes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Admin notes cannot exceed 1000 characters']
    },
    adminAction: {
      type: String,
      enum: ['none', 'warning', 'content_removed', 'account_suspended', 'account_banned'],
      default: 'none'
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: Date
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for common queries
reportSchema.index({ status: 1, createdAt: -1 }); // For finding pending reports by date
reportSchema.index({ targetType: 1, targetId: 1 }); // For finding all reports for a specific item
reportSchema.index({ reporter: 1, targetId: 1 }); // Prevent duplicate reports

// Populate reporter basic info
reportSchema.pre(/^find/, function(next) {
  this.populate({ 
    path: 'reporter',
    select: 'fullName email role'
  });
  next();
});

// Virtual populate the target based on targetType
reportSchema.virtual('target', {
  ref: function() {
    switch(this.targetType) {
      case 'post': return 'Post';
      case 'user': return 'User';
      case 'comment': return 'Comment';
      case 'product': return 'Product';
      case 'service': return 'Service';
      default: return null;
    }
  },
  localField: 'targetId',
  foreignField: '_id',
  justOne: true
});

const Report = mongoose.model('Report', reportSchema);
module.exports = Report;
