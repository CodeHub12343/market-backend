const Notification = require('../models/notificationModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Admin: get all notifications
exports.getAll = catchAsync(async (req, res, next) => {
  // only admins allowed
  if (!req.user || req.user.role !== 'admin') return next(new AppError('Not authorized', 403));

  const notifications = await Notification.find().populate('user', 'fullName email').sort({ createdAt: -1 });
  res.status(200).json({ status: 'success', results: notifications.length, data: notifications });
});

// Create notification
// If req.body.user is not provided, default to the current user (sender creates notification for themselves)
exports.createNotification = catchAsync(async (req, res, next) => {
  const payload = { ...req.body };
  if (!payload.user && req.user) payload.user = req.user._id;

  if (!payload.user || !payload.title || !payload.message) {
    return next(new AppError('user, title and message are required', 400));
  }

  const notification = await Notification.create(payload);
  res.status(201).json({ status: 'success', data: notification });
});

// Get all notifications for logged-in user
exports.getMyNotifications = catchAsync(async (req, res, next) => {
  const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.status(200).json({ status: 'success', results: notifications.length, data: notifications });
});

// Mark notification as read (only owner or admin)
exports.markAsRead = catchAsync(async (req, res, next) => {
  const notification = await Notification.findById(req.params.id);
  if (!notification) return next(new AppError('Notification not found', 404));

  // ownership check
  if (String(notification.user) !== String(req.user._id) && req.user.role !== 'admin') {
    return next(new AppError('Not authorized to modify this notification', 403));
  }

  notification.read = true;
  await notification.save();
  res.status(200).json({ status: 'success', data: notification });
});

// Delete a notification (owner or admin)
exports.deleteNotification = catchAsync(async (req, res, next) => {
  const notification = await Notification.findById(req.params.id);
  if (!notification) return next(new AppError('Notification not found', 404));

  if (String(notification.user) !== String(req.user._id) && req.user.role !== 'admin') {
    return next(new AppError('Not authorized to delete this notification', 403));
  }

  await notification.remove();
  res.status(204).json({ status: 'success', data: null });
});
