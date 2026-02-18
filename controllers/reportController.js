const Report = require('../models/reportModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const mongoose = require('mongoose');

// Helper to check if target exists
const validateTarget = async (targetType, targetId) => {
  if (!mongoose.Types.ObjectId.isValid(targetId)) {
    throw new AppError('Invalid target ID', 400);
  }

  let Model;
  switch(targetType) {
    case 'post': Model = require('../models/postModel'); break;
    case 'user': Model = require('../models/userModel'); break;
    case 'comment': Model = require('../models/commentModel'); break;
    case 'product': Model = require('../models/productModel'); break;
    case 'service': Model = require('../models/serviceModel'); break;
    default: throw new AppError('Invalid target type', 400);
  }

  const target = await Model.findById(targetId);
  if (!target) throw new AppError('Target not found', 404);
  return target;
};

// Create a new report
exports.createReport = catchAsync(async (req, res, next) => {
  const { targetType, targetId, reason, details } = req.body;

  // 1) Check if target exists
  await validateTarget(targetType, targetId);

  // 2) Check if user already reported this target
  const existingReport = await Report.findOne({
    reporter: req.user._id,
    targetType,
    targetId,
    status: { $nin: ['resolved', 'dismissed'] }
  });

  if (existingReport) {
    return next(new AppError('You have already reported this item', 400));
  }

  // 3) Create report
  const report = await Report.create({
    reporter: req.user._id,
    targetType,
    targetId,
    reason,
    details
  });

  // 4) If it's a post, mark it as reported
  if (targetType === 'post') {
    const Post = require('../models/postModel');
    await Post.findByIdAndUpdate(targetId, { isReported: true });
  }

  res.status(201).json({
    status: 'success',
    data: { report }
  });
});

// Get all reports (admin only)
exports.getAllReports = catchAsync(async (req, res, next) => {
  const {
    status,
    targetType,
    reason,
    sort = '-createdAt',
    page = 1,
    limit = 20
  } = req.query;

  // Build filter
  const filter = {};
  if (status) filter.status = status;
  if (targetType) filter.targetType = targetType;
  if (reason) filter.reason = reason;

  // Add target virtual population
  const query = Report.find(filter)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(+limit)
    .populate('target');

  const [reports, total] = await Promise.all([
    query,
    Report.countDocuments(filter)
  ]);

  res.status(200).json({
    status: 'success',
    results: reports.length,
    total,
    page: +page,
    pages: Math.ceil(total / limit),
    data: { reports }
  });
});

// Get a single report (admin or reporter only)
exports.getReport = catchAsync(async (req, res, next) => {
  const report = await Report.findById(req.params.id).populate('target');

  if (!report) {
    return next(new AppError('Report not found', 404));
  }

  // Check if user is admin or the reporter
  if (req.user.role !== 'admin' && report.reporter._id.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to view this report', 403));
  }

  res.status(200).json({
    status: 'success',
    data: { report }
  });
});

// Update report status (admin only)
exports.updateReport = catchAsync(async (req, res, next) => {
  const { status, adminNotes, adminAction } = req.body;
  
  const report = await Report.findById(req.params.id);
  if (!report) {
    return next(new AppError('Report not found', 404));
  }

  // Update report
  report.status = status || report.status;
  report.adminNotes = adminNotes || report.adminNotes;
  report.adminAction = adminAction || report.adminAction;
  
  // If status is being set to resolved/dismissed, add resolution details
  if (['resolved', 'dismissed'].includes(status)) {
    report.resolvedBy = req.user._id;
    report.resolvedAt = Date.now();
  }

  await report.save();

  // If report is resolved and action taken, handle the action
  if (status === 'resolved' && adminAction && adminAction !== 'none') {
    const target = await validateTarget(report.targetType, report.targetId);
    
    switch(adminAction) {
      case 'content_removed':
        if (report.targetType === 'post') {
          await target.deleteOne();
        } else if (report.targetType === 'comment') {
          await target.deleteOne();
        }
        break;
      
      case 'account_suspended':
      case 'account_banned':
        if (report.targetType === 'user') {
          target.status = adminAction === 'account_suspended' ? 'suspended' : 'banned';
          target.statusReason = `Action taken based on report #${report._id}`;
          await target.save();
        }
        break;
    }
  }

  res.status(200).json({
    status: 'success',
    data: { report }
  });
});

// Delete a report (admin only)
exports.deleteReport = catchAsync(async (req, res, next) => {
  const report = await Report.findById(req.params.id);
  
  if (!report) {
    return next(new AppError('Report not found', 404));
  }

  await report.deleteOne();

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Get reports for a specific target
exports.getReportsForTarget = catchAsync(async (req, res, next) => {
  const { targetType, targetId } = req.params;

  // Validate target exists
  await validateTarget(targetType, targetId);

  const reports = await Report.find({
    targetType,
    targetId
  }).sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: reports.length,
    data: { reports }
  });
});

// Get my reports (reports created by current user)
exports.getMyReports = catchAsync(async (req, res, next) => {
  const { status, page = 1, limit = 20 } = req.query;

  const filter = { reporter: req.user._id };
  if (status) filter.status = status;

  const [reports, total] = await Promise.all([
    Report.find(filter)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(+limit)
      .populate('target'),
    Report.countDocuments(filter)
  ]);

  res.status(200).json({
    status: 'success',
    results: reports.length,
    total,
    page: +page,
    pages: Math.ceil(total / limit),
    data: { reports }
  });
});