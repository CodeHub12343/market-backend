// src/models/messageModel.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: [true, 'Message must belong to a chat']
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Message must have a sender']
    },
    text: {
      type: String,
      trim: true,
      maxlength: 5000
    },
    type: {
      type: String,
      enum: ['text', 'image', 'file', 'location', 'sticker', 'voice', 'video', 'system'],
      default: 'text'
    },
    attachments: [{
      url: {
        type: String,
        required: true
      },
      public_id: String,
      type: {
        type: String,
        enum: ['image', 'file', 'video', 'audio'],
        required: true
      },
      size: Number,
      originalName: String,
      mimeType: String,
      thumbnail: String
    }],
    // Message status
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read', 'failed'],
      default: 'sent'
    },
    // Read receipts
    readBy: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      readAt: {
        type: Date,
        default: Date.now
      }
    }],
    // Delivery receipts
    deliveredTo: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      deliveredAt: {
        type: Date,
        default: Date.now
      }
    }],
    // Message reactions
    reactions: [{
      emoji: {
        type: String,
        required: true
      },
      users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }],
      count: {
        type: Number,
        default: 0
      }
    }],
    // Reply to another message
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    // Forwarded from another message
    forwardFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    // Scheduled message
    scheduledAt: Date,
    isScheduled: {
      type: Boolean,
      default: false
    },
    // Message encryption
    encrypted: {
      type: Boolean,
      default: false
    },
    encryptionKey: String,
    // Message metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed
    },
    // Message analytics
    analytics: {
      views: {
        type: Number,
        default: 0
      },
      forwards: {
        type: Number,
        default: 0
      },
      replies: {
        type: Number,
        default: 0
      }
    },
    // Message history (for edits)
    history: [{
      text: String,
      editedAt: {
        type: Date,
        default: Date.now
      },
      editedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }],
    // Message flags
    flags: {
      edited: {
        type: Boolean,
        default: false
      },
      deleted: {
        type: Boolean,
        default: false
      },
      spam: {
        type: Boolean,
        default: false
      },
      important: {
        type: Boolean,
        default: false
      }
    },
    // Message location (for location messages)
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        index: '2dsphere'
      },
      address: String,
      name: String
    },
    // Message expiration
    expiresAt: Date,
    // Message thread (for threaded conversations)
    thread: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    // Message tags
    tags: [{
      type: String,
      trim: true,
      maxlength: 20
    }]
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ type: 1 });
messageSchema.index({ status: 1 });
messageSchema.index({ 'readBy.user': 1 });
messageSchema.index({ 'deliveredTo.user': 1 });
messageSchema.index({ replyTo: 1 });
messageSchema.index({ forwardFrom: 1 });
messageSchema.index({ scheduledAt: 1 });
messageSchema.index({ expiresAt: 1 });
messageSchema.index({ thread: 1 });
messageSchema.index({ tags: 1 });
messageSchema.index({ 'location.coordinates': '2dsphere' });
messageSchema.index({ 'flags.deleted': 1, 'flags.spam': 1 });

// Virtual for is read
messageSchema.virtual('isRead').get(function() {
  return this.readBy.length > 0;
});

// Virtual for is delivered
messageSchema.virtual('isDelivered').get(function() {
  return this.deliveredTo.length > 0;
});

// Virtual for has attachments
messageSchema.virtual('hasAttachments').get(function() {
  return this.attachments && this.attachments.length > 0;
});

// Virtual for has reactions
messageSchema.virtual('hasReactions').get(function() {
  return this.reactions && this.reactions.length > 0;
});

// Virtual for is edited
messageSchema.virtual('isEdited').get(function() {
  return this.flags.edited;
});

// Virtual for is deleted
messageSchema.virtual('isDeleted').get(function() {
  return this.flags.deleted;
});

// Virtual for is spam
messageSchema.virtual('isSpam').get(function() {
  return this.flags.spam;
});

// Virtual for is important
messageSchema.virtual('isImportant').get(function() {
  return this.flags.important;
});

// Note: isScheduled is a real schema field, not a virtual

// Virtual for is expired
messageSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Virtual for read count
messageSchema.virtual('readCount').get(function() {
  return this.readBy.length;
});

// Virtual for reaction count
messageSchema.virtual('reactionCount').get(function() {
  return this.reactions.reduce((total, reaction) => total + reaction.count, 0);
});

// Pre-save middleware
messageSchema.pre('save', function(next) {
  // Set type based on content
  if (this.attachments && this.attachments.length > 0) {
    if (!this.type || this.type === 'text') {
      this.type = this.attachments[0].type;
    }
  }
  
  // Set scheduled flag
  if (this.scheduledAt) {
    this.isScheduled = this.scheduledAt > new Date();
  }
  
  next();
});

// Static methods
messageSchema.statics.getChatMessages = function(chatId, options = {}) {
  const {
    page = 1,
    limit = 50,
    type,
    from,
    dateFrom,
    dateTo,
    hasAttachments,
    search
  } = options;

  const query = { chat: chatId, 'flags.deleted': false };
  
  if (type) query.type = type;
  if (from) query.sender = from;
  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) query.createdAt.$lte = new Date(dateTo);
  }
  if (hasAttachments !== undefined) {
    query.attachments = hasAttachments ? { $exists: true, $ne: [] } : { $exists: false };
  }
  if (search) {
    query.$or = [
      { text: { $regex: search, $options: 'i' } },
      { 'attachments.originalName': { $regex: search, $options: 'i' } }
    ];
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('sender', 'fullName email photo campus')
    .populate('replyTo', 'text sender createdAt')
    .populate('forwardFrom', 'text sender createdAt');
};

messageSchema.statics.searchMessages = function(userId, searchQuery, options = {}) {
  const {
    chatId,
    type,
    from,
    dateFrom,
    dateTo,
    hasAttachments,
    page = 1,
    limit = 20
  } = options;

  const query = { 
    'flags.deleted': false,
    $text: { $search: searchQuery }
  };
  
  if (chatId) query.chat = chatId;
  if (type) query.type = type;
  if (from) query.sender = from;
  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) query.createdAt.$lte = new Date(dateTo);
  }
  if (hasAttachments !== undefined) {
    query.attachments = hasAttachments ? { $exists: true, $ne: [] } : { $exists: false };
  }

  return this.find(query)
    .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('sender', 'fullName email photo campus')
    .populate('chat', 'name type members');
};

messageSchema.statics.getMessageAnalytics = function(chatId, period = 'month') {
  const now = new Date();
  let startDate;

  switch (period) {
    case 'day':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return this.aggregate([
    { $match: { chat: mongoose.Types.ObjectId(chatId), createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: null,
        totalMessages: { $sum: 1 },
        totalAttachments: { $sum: { $size: '$attachments' } },
        totalReactions: { $sum: { $size: '$reactions' } },
        totalForwards: { $sum: '$analytics.forwards' },
        totalReplies: { $sum: '$analytics.replies' },
        averageReadTime: { $avg: '$analytics.readTime' },
        messageTypes: {
          $push: '$type'
        }
      }
    },
    {
      $project: {
        totalMessages: 1,
        totalAttachments: 1,
        totalReactions: 1,
        totalForwards: 1,
        totalReplies: 1,
        averageReadTime: 1,
        messageTypeDistribution: {
          $reduce: {
            input: '$messageTypes',
            initialValue: {},
            in: {
              $mergeObjects: [
                '$$value',
                { $arrayToObject: [[{ k: '$$this', v: { $add: [{ $getField: { field: '$$this', input: '$$value' } }, 1] } }]] }
              ]
            }
          }
        }
      }
    }
  ]);
};

// Instance methods
messageSchema.methods.markAsRead = function(userId) {
  const existingRead = this.readBy.find(r => r.user.toString() === userId);
  if (!existingRead) {
    this.readBy.push({ user: userId, readAt: new Date() });
    this.status = 'read';
  }
  return this.save();
};

messageSchema.methods.markAsDelivered = function(userId) {
  const existingDelivery = this.deliveredTo.find(d => d.user.toString() === userId);
  if (!existingDelivery) {
    this.deliveredTo.push({ user: userId, deliveredAt: new Date() });
    if (this.status === 'sent') {
      this.status = 'delivered';
    }
  }
  return this.save();
};

messageSchema.methods.addReaction = function(userId, emoji) {
  let reaction = this.reactions.find(r => r.emoji === emoji);
  if (!reaction) {
    reaction = { emoji, users: [], count: 0 };
    this.reactions.push(reaction);
  }
  
  if (!reaction.users.includes(userId)) {
    reaction.users.push(userId);
    reaction.count += 1;
  }
  
  return this.save();
};

messageSchema.methods.removeReaction = function(userId, emoji) {
  const reaction = this.reactions.find(r => r.emoji === emoji);
  if (reaction) {
    reaction.users = reaction.users.filter(u => u.toString() !== userId);
    reaction.count = Math.max(0, reaction.count - 1);
    
    if (reaction.count === 0) {
      this.reactions = this.reactions.filter(r => r.emoji !== emoji);
    }
  }
  
  return this.save();
};

messageSchema.methods.edit = function(newText, editedBy) {
  this.history.push({
    text: this.text,
    editedAt: new Date(),
    editedBy: this.sender
  });
  
  this.text = newText;
  this.flags.edited = true;
  
  return this.save();
};

messageSchema.methods.softDelete = function() {
  this.flags.deleted = true;
  this.text = 'This message was deleted';
  this.attachments = [];
  return this.save();
};

messageSchema.methods.forward = function(chatIds, forwardedBy) {
  this.analytics.forwards += chatIds.length;
  return this.save();
};

messageSchema.methods.incrementViews = function() {
  this.analytics.views += 1;
  return this.save();
};

messageSchema.methods.schedule = function(scheduledAt) {
  this.scheduledAt = scheduledAt;
  this.isScheduled = true;
  return this.save();
};

messageSchema.methods.unschedule = function() {
  this.scheduledAt = undefined;
  this.isScheduled = false;
  return this.save();
};

messageSchema.methods.setExpiration = function(expiresAt) {
  this.expiresAt = expiresAt;
  return this.save();
};

messageSchema.methods.markAsSpam = function() {
  this.flags.spam = true;
  return this.save();
};

messageSchema.methods.markAsImportant = function() {
  this.flags.important = true;
  return this.save();
};

// populate sender by default for reads
messageSchema.pre(/^find/, function (next) {
  this.populate({ path: 'sender', select: 'fullName email photo campus role' });
  next();
});

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
