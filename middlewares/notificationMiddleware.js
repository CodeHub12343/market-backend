/* // src/middlewares/notificationMiddleware.js
const Notification = require('../models/notificationModel');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// ✅ Check notification ownership
exports.checkNotificationOwnership = catchAsync(async (req, res, next) => {
  const notification = await Notification.findById(req.params.id);
  
  if (!notification) {
    return next(new AppError('Notification not found', 404));
  }
  
  // Check if user owns the notification or is admin
  const isOwner = notification.user.toString() === req.user.id;
  const isAdmin = req.user.role === 'admin';
  
  if (!isOwner && !isAdmin) {
    return next(new AppError('You are not authorized to access this notification', 403));
  }
  
  req.notification = notification;
  next();
});

// ✅ Check notification management permissions
exports.checkNotificationManagement = catchAsync(async (req, res, next) => {
  if (!req.notification) {
    return next(new AppError('Notification not loaded before management check', 400));
  }
  
  // Only owner or admin can manage notifications
  const isOwner = req.notification.user.toString() === req.user.id;
  const isAdmin = req.user.role === 'admin';
  
  if (!isOwner && !isAdmin) {
    return next(new AppError('You are not authorized to manage this notification', 403));
  }
  
  next();
});

// ✅ Validate notification data
exports.validateNotificationData = (req, res, next) => {
  const { title, message, type, category, priority, recipients } = req.body;
  
  // Basic validation
  if (!title || !message) {
    return next(new AppError('Title and message are required', 400));
  }
  
  // Validate recipients if provided
  if (recipients && (!Array.isArray(recipients) || recipients.length === 0)) {
    return next(new AppError('Recipients must be a non-empty array', 400));
  }
  
  // Validate scheduling
  if (req.body.scheduledAt && new Date(req.body.scheduledAt) <= new Date()) {
    return next(new AppError('Scheduled date must be in the future', 400));
  }
  
  // Validate expiration
  if (req.body.expiresAt && new Date(req.body.expiresAt) <= new Date()) {
    return next(new AppError('Expiration date must be in the future', 400));
  }
  
  next();
};

// ✅ Rate limiting for notification creation
exports.rateLimitNotifications = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  // Check notification creation rate limit (max 50 notifications per hour per user)
  const recentNotifications = await Notification.countDocuments({
    user: userId,
    createdAt: { $gte: oneHourAgo }
  });
  
  if (recentNotifications >= 50) {
    return next(new AppError('Notification creation rate limit exceeded. Please slow down.', 429));
  }
  
  next();
});

// ✅ Check bulk operation permissions
exports.checkBulkOperationPermission = (req, res, next) => {
  const { notificationIds, action } = req.body;
  
  if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
    return next(new AppError('Notification IDs array is required', 400));
  }
  
  if (notificationIds.length > 100) {
    return next(new AppError('Cannot process more than 100 notifications at once', 400));
  }
  
  if (!action || !['mark_read', 'mark_unread', 'delete', 'archive', 'unarchive'].includes(action)) {
    return next(new AppError('Invalid bulk action', 400));
  }
  
  next();
};

// ✅ Validate bulk operation data
exports.validateBulkOperation = catchAsync(async (req, res, next) => {
  const { notificationIds } = req.body;
  
  // Check if all notifications exist and belong to user
  const notifications = await Notification.find({
    _id: { $in: notificationIds },
    user: req.user.id
  });
  
  if (notifications.length !== notificationIds.length) {
    return next(new AppError('One or more notifications not found or not owned by you', 404));
  }
  
  req.notifications = notifications;
  next();
});

// ✅ Check notification analytics permissions
exports.checkAnalyticsPermission = (req, res, next) => {
  // Only allow users to view their own analytics or admins to view all
  if (req.params.userId && req.params.userId !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You are not authorized to view these analytics', 403));
  }
  
  next();
};

// ✅ Populate notification data
exports.populateNotificationData = catchAsync(async (req, res, next) => {
  if (req.notification) {
    await req.notification.populate('user', 'fullName email photo campus role');
  }
  next();
});

// ✅ Check notification preferences
exports.checkNotificationPreferences = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  // Check if user has disabled notifications
  if (!user.preferences?.emailNotifications && !user.preferences?.pushNotifications) {
    return next(new AppError('All notification channels are disabled', 400));
  }
  
  req.userPreferences = user.preferences;
  next();
});

// ✅ Validate notification template
exports.validateNotificationTemplate = (req, res, next) => {
  const { template, templateVariables } = req.body;
  
  if (template && !templateVariables) {
    return next(new AppError('Template variables are required when using a template', 400));
  }
  
  // Validate template variables format
  if (templateVariables && typeof templateVariables !== 'object') {
    return next(new AppError('Template variables must be an object', 400));
  }
  
  next();
});

// ✅ Check notification channels
exports.validateNotificationChannels = (req, res, next) => {
  const { channels } = req.body;
  
  if (channels) {
    const validChannels = ['in_app', 'email', 'push', 'sms'];
    const invalidChannels = channels.filter(channel => !validChannels.includes(channel));
    
    if (invalidChannels.length > 0) {
      return next(new AppError(`Invalid channels: ${invalidChannels.join(', ')}`, 400));
    }
  }
  
  next();
});

// ✅ Check notification priority
exports.validateNotificationPriority = (req, res, next) => {
  const { priority } = req.body;
  
  if (priority && !['low', 'normal', 'high', 'urgent'].includes(priority)) {
    return next(new AppError('Invalid priority level', 400));
  }
  
  next();
});

// ✅ Check notification category
exports.validateNotificationCategory = (req, res, next) => {
  const { category } = req.body;
  
  if (category && !['info', 'warning', 'error', 'success', 'urgent'].includes(category)) {
    return next(new AppError('Invalid notification category', 400));
  }
  
  next();
});

// ✅ Check notification type
exports.validateNotificationType = (req, res, next) => {
  const { type } = req.body;
  
  if (type && !['request', 'offer', 'order', 'system', 'chat', 'product', 'service', 'review', 'payment', 'security'].includes(type)) {
    return next(new AppError('Invalid notification type', 400));
  }
  
  next();
});

// ✅ Check notification expiration
exports.checkNotificationExpiration = (req, res, next) => {
  if (req.notification && req.notification.isExpired) {
    return next(new AppError('This notification has expired', 410));
  }
  
  next();
});

// ✅ Check notification scheduling
exports.checkNotificationScheduling = (req, res, next) => {
  if (req.notification && req.notification.isScheduled) {
    return next(new AppError('This notification is scheduled for future delivery', 400));
  }
  
  next();
});

// ✅ Track notification interaction
exports.trackNotificationInteraction = catchAsync(async (req, res, next) => {
  if (req.notification && req.method === 'GET') {
    // Track view
    await req.notification.trackInteraction('view');
  }
  
  next();
});

// ✅ Check notification retry limit
exports.checkRetryLimit = (req, res, next) => {
  if (req.notification && req.notification.retryCount >= 3) {
    return next(new AppError('Maximum retry attempts reached for this notification', 400));
  }
  
  next();
});

// ✅ Validate notification search parameters
exports.validateSearchParameters = (req, res, next) => {
  const { dateFrom, dateTo, sort, order } = req.query;
  
  // Validate date range
  if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
    return next(new AppError('Start date cannot be after end date', 400));
  }
  
  // Validate sort parameters
  const validSortFields = ['createdAt', 'priority', 'read', 'type', 'category'];
  if (sort && !validSortFields.includes(sort)) {
    return next(new AppError('Invalid sort field', 400));
  }
  
  if (order && !['asc', 'desc'].includes(order)) {
    return next(new AppError('Order must be asc or desc', 400));
  }
  
  next();
};

// ✅ Check notification delivery status
exports.checkDeliveryStatus = (req, res, next) => {
  if (req.notification) {
    const deliveryStatus = req.notification.deliveryStatusSummary;
    
    // Add delivery status to response
    req.deliveryStatus = deliveryStatus;
  }
  
  next();
});

// ✅ Validate notification metadata
exports.validateNotificationMetadata = (req, res, next) => {
  const { metadata } = req.body;
  
  if (metadata && typeof metadata !== 'object') {
    return next(new AppError('Metadata must be an object', 400));
  }
  
  // Check metadata size limit
  if (metadata && JSON.stringify(metadata).length > 1000) {
    return next(new AppError('Metadata size exceeds limit', 400));
  }
  
  next();
};

// ✅ Check notification group permissions
exports.checkGroupPermissions = catchAsync(async (req, res, next) => {
  const { groupId } = req.body;
  
  if (groupId) {
    // Check if user has permission to send to this group
    // This would typically check against user groups or roles
    const hasGroupPermission = true; // Implement group permission logic
    
    if (!hasGroupPermission) {
      return next(new AppError('You are not authorized to send notifications to this group', 403));
    }
  }
  
  next();
});

// ✅ Validate notification batch
exports.validateNotificationBatch = (req, res, next) => {
  const { batchId, notifications } = req.body;
  
  if (batchId && notifications) {
    if (!Array.isArray(notifications) || notifications.length === 0) {
      return next(new AppError('Notifications must be a non-empty array', 400));
    }
    
    if (notifications.length > 1000) {
      return next(new AppError('Batch size cannot exceed 1000 notifications', 400));
    }
  }
  
  next();
});

module.exports = exports; */


// src/middlewares/notificationMiddleware.js
const Notification = require('../models/notificationModel');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// ✅ Check notification ownership
exports.checkNotificationOwnership = catchAsync(async (req, res, next) => {
  const notification = await Notification.findById(req.params.id);
  if (!notification) return next(new AppError('Notification not found', 404));

  const isOwner = notification.user.toString() === req.user.id;
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin)
    return next(new AppError('You are not authorized to access this notification', 403));

  req.notification = notification;
  next();
});

// ✅ Check notification management permissions
exports.checkNotificationManagement = catchAsync(async (req, res, next) => {
  if (!req.notification)
    return next(new AppError('Notification not loaded before management check', 400));

  const isOwner = req.notification.user.toString() === req.user.id;
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin)
    return next(new AppError('You are not authorized to manage this notification', 403));

  next();
});

// ✅ Validate notification data
exports.validateNotificationData = (req, res, next) => {
  const { title, message, recipients } = req.body;
  if (!title || !message)
    return next(new AppError('Title and message are required', 400));

  if (recipients && (!Array.isArray(recipients) || recipients.length === 0))
    return next(new AppError('Recipients must be a non-empty array', 400));

  if (req.body.scheduledAt && new Date(req.body.scheduledAt) <= new Date())
    return next(new AppError('Scheduled date must be in the future', 400));

  if (req.body.expiresAt && new Date(req.body.expiresAt) <= new Date())
    return next(new AppError('Expiration date must be in the future', 400));

  next();
};

// ✅ Rate limiting for notification creation
exports.rateLimitNotifications = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const recentNotifications = await Notification.countDocuments({
    user: userId,
    createdAt: { $gte: oneHourAgo },
  });

  if (recentNotifications >= 50)
    return next(new AppError('Notification creation rate limit exceeded. Please slow down.', 429));

  next();
});

// ✅ Check bulk operation permissions
exports.checkBulkOperationPermission = (req, res, next) => {
  const { notificationIds, action } = req.body;

  if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0)
    return next(new AppError('Notification IDs array is required', 400));

  if (notificationIds.length > 100)
    return next(new AppError('Cannot process more than 100 notifications at once', 400));

  if (!action || !['mark_read', 'mark_unread', 'delete', 'archive', 'unarchive'].includes(action))
    return next(new AppError('Invalid bulk action', 400));

  next();
};

// ✅ Validate bulk operation data
exports.validateBulkOperation = catchAsync(async (req, res, next) => {
  const { notificationIds } = req.body;
  const notifications = await Notification.find({
    _id: { $in: notificationIds },
    user: req.user.id,
  });

  if (notifications.length !== notificationIds.length)
    return next(new AppError('One or more notifications not found or not owned by you', 404));

  req.notifications = notifications;
  next();
});

// ✅ Check notification analytics permissions
exports.checkAnalyticsPermission = (req, res, next) => {
  if (req.params.userId && req.params.userId !== req.user.id && req.user.role !== 'admin')
    return next(new AppError('You are not authorized to view these analytics', 403));

  next();
};

// ✅ Populate notification data
exports.populateNotificationData = catchAsync(async (req, res, next) => {
  if (req.notification)
    await req.notification.populate('user', 'fullName email photo campus role');
  next();
});

// ✅ Check notification preferences
exports.checkNotificationPreferences = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) return next(new AppError('User not found', 404));

  if (!user.preferences?.emailNotifications && !user.preferences?.pushNotifications)
    return next(new AppError('All notification channels are disabled', 400));

  req.userPreferences = user.preferences;
  next();
});

// ✅ Validate notification template
exports.validateNotificationTemplate = (req, res, next) => {
  const { template, templateVariables } = req.body;

  if (template && !templateVariables)
    return next(new AppError('Template variables are required when using a template', 400));

  if (templateVariables && typeof templateVariables !== 'object')
    return next(new AppError('Template variables must be an object', 400));

  next();
};

// ✅ Check notification channels
exports.validateNotificationChannels = (req, res, next) => {
  const { channels } = req.body;
  if (channels) {
    const validChannels = ['in_app', 'email', 'push', 'sms'];
    const invalid = channels.filter((c) => !validChannels.includes(c));
    if (invalid.length)
      return next(new AppError(`Invalid channels: ${invalid.join(', ')}`, 400));
  }
  next();
};

// ✅ Validate notification priority, category, type, etc.
exports.validateNotificationPriority = (req, res, next) => {
  const { priority } = req.body;
  if (priority && !['low', 'normal', 'high', 'urgent'].includes(priority))
    return next(new AppError('Invalid priority level', 400));
  next();
};

exports.validateNotificationCategory = (req, res, next) => {
  const { category } = req.body;
  if (category && !['info', 'warning', 'error', 'success', 'urgent'].includes(category))
    return next(new AppError('Invalid notification category', 400));
  next();
};

exports.validateNotificationType = (req, res, next) => {
  const { type } = req.body;
  if (type && !['request', 'offer', 'order', 'system', 'chat', 'product', 'service', 'review', 'payment', 'security'].includes(type))
    return next(new AppError('Invalid notification type', 400));
  next();
};

// ✅ Check expiration, scheduling, retry limit, etc.
exports.checkNotificationExpiration = (req, res, next) => {
  if (req.notification && req.notification.isExpired)
    return next(new AppError('This notification has expired', 410));
  next();
};

exports.checkNotificationScheduling = (req, res, next) => {
  if (req.notification && req.notification.isScheduled)
    return next(new AppError('This notification is scheduled for future delivery', 400));
  next();
};

exports.trackNotificationInteraction = catchAsync(async (req, res, next) => {
  if (req.notification && req.method === 'GET')
    await req.notification.trackInteraction('view');
  next();
});

exports.checkRetryLimit = (req, res, next) => {
  if (req.notification && req.notification.retryCount >= 3)
    return next(new AppError('Maximum retry attempts reached for this notification', 400));
  next();
};

// ✅ Validate search, metadata, group, and batch
exports.validateSearchParameters = (req, res, next) => {
  const { dateFrom, dateTo, sort, order } = req.query;

  if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo))
    return next(new AppError('Start date cannot be after end date', 400));

  const validSortFields = ['createdAt', 'priority', 'read', 'type', 'category'];
  if (sort && !validSortFields.includes(sort))
    return next(new AppError('Invalid sort field', 400));

  if (order && !['asc', 'desc'].includes(order))
    return next(new AppError('Order must be asc or desc', 400));

  next();
};

exports.checkDeliveryStatus = (req, res, next) => {
  if (req.notification)
    req.deliveryStatus = req.notification.deliveryStatusSummary;
  next();
};

exports.validateNotificationMetadata = (req, res, next) => {
  const { metadata } = req.body;

  if (metadata && typeof metadata !== 'object')
    return next(new AppError('Metadata must be an object', 400));

  if (metadata && JSON.stringify(metadata).length > 1000)
    return next(new AppError('Metadata size exceeds limit', 400));

  next();
};

exports.checkGroupPermissions = catchAsync(async (req, res, next) => {
  const { groupId } = req.body;
  if (groupId) {
    const hasGroupPermission = true; // implement later
    if (!hasGroupPermission)
      return next(new AppError('You are not authorized to send notifications to this group', 403));
  }
  next();
});

exports.validateNotificationBatch = (req, res, next) => {
  const { batchId, notifications } = req.body;
  if (batchId && notifications) {
    if (!Array.isArray(notifications) || notifications.length === 0)
      return next(new AppError('Notifications must be a non-empty array', 400));
    if (notifications.length > 1000)
      return next(new AppError('Batch size cannot exceed 1000 notifications', 400));
  }
  next();
};

module.exports = exports;
