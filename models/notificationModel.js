// src/models/notificationModel.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    // Recipients
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    
    // Notification content
    title: {
      type: String,
      required: [true, 'Notification must have a title'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    message: {
      type: String,
      required: [true, 'Notification must have a message'],
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters']
    },
    
    // Notification classification
    type: {
      type: String,
      enum: ['request', 'offer', 'order', 'system', 'chat', 'product', 'service', 'review', 'payment', 'security', 'accommodation'],
      default: 'system'
    },
    category: {
      type: String,
      enum: ['info', 'warning', 'error', 'success', 'urgent'],
      default: 'info'
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal'
    },
    
    // Additional data and metadata
    data: {
      type: Object,
      default: {}
    },
    metadata: {
      type: Object,
      default: {}
    },
    
    // Notification status
    read: {
      type: Boolean,
      default: false
    },
    readAt: {
      type: Date
    },
    archived: {
      type: Boolean,
      default: false
    },
    archivedAt: {
      type: Date
    },
    
    // Delivery and scheduling
    channels: {
      type: [String],
      enum: ['in_app', 'email', 'push', 'sms'],
      default: ['in_app']
    },
    scheduledAt: {
      type: Date
    },
    expiresAt: {
      type: Date
    },
    
    // Template and formatting
    template: {
      type: String,
      enum: ['welcome', 'order_confirmation', 'payment_received', 'request_created', 'offer_received', 'chat_message', 'system_alert']
    },
    templateVariables: {
      type: Object,
      default: {}
    },
    
    // Delivery tracking
    deliveryStatus: {
      in_app: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
        delivered: { type: Boolean, default: false },
        deliveredAt: Date
      },
      email: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
        delivered: { type: Boolean, default: false },
        deliveredAt: Date,
        opened: { type: Boolean, default: false },
        openedAt: Date
      },
      push: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
        delivered: { type: Boolean, default: false },
        deliveredAt: Date,
        clicked: { type: Boolean, default: false },
        clickedAt: Date
      },
      sms: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
        delivered: { type: Boolean, default: false },
        deliveredAt: Date
      }
    },
    
    // Analytics and engagement
    analytics: {
      views: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      interactions: { type: Number, default: 0 },
      lastViewedAt: Date,
      lastClickedAt: Date
    },
    
    // Retry mechanism
    retryCount: {
      type: Number,
      default: 0,
      max: 3
    },
    lastRetryAt: Date,
    
    // Source information
    source: {
      type: String,
      enum: ['system', 'user', 'api', 'webhook', 'scheduled']
    },
    sourceId: mongoose.Schema.Types.ObjectId,
    
    // Grouping and batching
    groupId: String,
    batchId: String,
    
    // History and audit trail
    history: [{
      action: String,
      timestamp: { type: Date, default: Date.now },
      details: Object,
      performedBy: mongoose.Schema.Types.ObjectId
    }]
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, read: 1 });
notificationSchema.index({ user: 1, type: 1 });
notificationSchema.index({ user: 1, priority: 1 });
notificationSchema.index({ user: 1, archived: 1 });
notificationSchema.index({ scheduledAt: 1 });
notificationSchema.index({ expiresAt: 1 });
notificationSchema.index({ groupId: 1 });
notificationSchema.index({ batchId: 1 });
notificationSchema.index({ 'deliveryStatus.in_app.sent': 1 });
notificationSchema.index({ 'deliveryStatus.email.sent': 1 });
notificationSchema.index({ 'deliveryStatus.push.sent': 1 });

// Virtual fields
notificationSchema.virtual('isRead').get(function() {
  return this.read;
});

notificationSchema.virtual('isArchived').get(function() {
  return this.archived;
});

notificationSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

notificationSchema.virtual('isScheduled').get(function() {
  return this.scheduledAt && this.scheduledAt > new Date();
});

notificationSchema.virtual('timeUntilExpiry').get(function() {
  if (!this.expiresAt) return null;
  const now = new Date();
  const diff = this.expiresAt.getTime() - now.getTime();
  return diff > 0 ? diff : 0;
});

notificationSchema.virtual('deliveryStatusSummary').get(function() {
  const status = this.deliveryStatus;
  return {
    totalChannels: this.channels.length,
    sentChannels: Object.values(status).filter(s => s.sent).length,
    deliveredChannels: Object.values(status).filter(s => s.delivered).length,
    failedChannels: Object.values(status).filter(s => s.sent && !s.delivered).length
  };
});

notificationSchema.virtual('engagementRate').get(function() {
  if (this.analytics.views === 0) return 0;
  return (this.analytics.interactions / this.analytics.views) * 100;
});

// Pre-save middleware
notificationSchema.pre('save', function(next) {
  // Set readAt when marked as read
  if (this.isModified('read') && this.read && !this.readAt) {
    this.readAt = new Date();
  }
  
  // Set archivedAt when archived
  if (this.isModified('archived') && this.archived && !this.archivedAt) {
    this.archivedAt = new Date();
  }
  
  // Add to history
  if (this.isModified()) {
    this.history.push({
      action: 'modified',
      details: this.getChanges(),
      performedBy: this.user
    });
  }
  
  next();
});

// Pre-remove middleware
notificationSchema.pre('remove', function(next) {
  this.history.push({
    action: 'deleted',
    details: { deletedAt: new Date() },
    performedBy: this.user
  });
  next();
});

// Static methods
notificationSchema.statics.getUserNotifications = function(userId, options = {}) {
  const {
    type,
    category,
    priority,
    read,
    archived = false,
    limit = 20,
    skip = 0,
    sort = { createdAt: -1 }
  } = options;
  
  const query = { user: userId, archived };
  
  if (type) query.type = type;
  if (category) query.category = category;
  if (priority) query.priority = priority;
  if (read !== undefined) query.read = read;
  
  return this.find(query)
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .populate('user', 'fullName email photo');
};

notificationSchema.statics.getNotificationAnalytics = function(userId, period = 'month') {
  const now = new Date();
  let startDate;
  
  switch (period) {
    case 'hour':
      startDate = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case 'day':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  
  return this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          type: '$type',
          category: '$category',
          priority: '$priority'
        },
        total: { $sum: 1 },
        read: { $sum: { $cond: ['$read', 1, 0] } },
        archived: { $sum: { $cond: ['$archived', 1, 0] } },
        totalViews: { $sum: '$analytics.views' },
        totalClicks: { $sum: '$analytics.clicks' },
        totalInteractions: { $sum: '$analytics.interactions' }
      }
    },
    {
      $project: {
        type: '$_id.type',
        category: '$_id.category',
        priority: '$_id.priority',
        total: 1,
        read: 1,
        archived: 1,
        totalViews: 1,
        totalClicks: 1,
        totalInteractions: 1,
        readRate: { $multiply: [{ $divide: ['$read', '$total'] }, 100] },
        engagementRate: {
          $cond: [
            { $gt: ['$totalViews', 0] },
            { $multiply: [{ $divide: ['$totalInteractions', '$totalViews'] }, 100] },
            0
          ]
        }
      }
    },
    { $sort: { total: -1 } }
  ]);
};

notificationSchema.statics.getScheduledNotifications = function() {
  return this.find({
    scheduledAt: { $lte: new Date() },
    'deliveryStatus.in_app.sent': false
  });
};

notificationSchema.statics.getExpiredNotifications = function() {
  return this.find({
    expiresAt: { $lte: new Date() },
    archived: false
  });
};

notificationSchema.statics.bulkUpdate = function(notificationIds, updateData, userId) {
  return this.updateMany(
    { _id: { $in: notificationIds }, user: userId },
    { 
      ...updateData,
      $push: {
        history: {
          action: 'bulk_update',
          details: updateData,
          performedBy: userId
        }
      }
    }
  );
};

// Instance methods
notificationSchema.methods.markAsRead = function() {
  this.read = true;
  this.readAt = new Date();
  this.analytics.views += 1;
  this.analytics.lastViewedAt = new Date();
  
  this.history.push({
    action: 'marked_read',
    details: { readAt: this.readAt },
    performedBy: this.user
  });
  
  return this.save();
};

notificationSchema.methods.markAsUnread = function() {
  this.read = false;
  this.readAt = undefined;
  
  this.history.push({
    action: 'marked_unread',
    details: { unreadAt: new Date() },
    performedBy: this.user
  });
  
  return this.save();
};

notificationSchema.methods.archive = function() {
  this.archived = true;
  this.archivedAt = new Date();
  
  this.history.push({
    action: 'archived',
    details: { archivedAt: this.archivedAt },
    performedBy: this.user
  });
  
  return this.save();
};

notificationSchema.methods.unarchive = function() {
  this.archived = false;
  this.archivedAt = undefined;
  
  this.history.push({
    action: 'unarchived',
    details: { unarchivedAt: new Date() },
    performedBy: this.user
  });
  
  return this.save();
};

notificationSchema.methods.trackInteraction = function(interactionType = 'click') {
  this.analytics.interactions += 1;
  this.analytics.clicks += 1;
  this.analytics.lastClickedAt = new Date();
  
  this.history.push({
    action: 'interaction',
    details: { type: interactionType, timestamp: new Date() },
    performedBy: this.user
  });
  
  return this.save();
};

notificationSchema.methods.updateDeliveryStatus = function(channel, status) {
  if (!this.deliveryStatus[channel]) {
    this.deliveryStatus[channel] = {};
  }
  
  Object.assign(this.deliveryStatus[channel], status);
  
  this.history.push({
    action: 'delivery_status_update',
    details: { channel, status },
    performedBy: this.user
  });
  
  return this.save();
};

notificationSchema.methods.retry = function() {
  if (this.retryCount >= 3) {
    throw new Error('Maximum retry attempts reached');
  }
  
  this.retryCount += 1;
  this.lastRetryAt = new Date();
  
  this.history.push({
    action: 'retry',
    details: { retryCount: this.retryCount, retryAt: this.lastRetryAt },
    performedBy: this.user
  });
  
  return this.save();
};

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
