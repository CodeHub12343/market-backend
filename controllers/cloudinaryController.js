const crypto = require('crypto');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const fileHandler = require('../utils/fileHandler');

// Handle single file upload
exports.uploadFile = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('No file uploaded', 400));
  }

  try {
    const result = await fileHandler.uploadFile(req.file, {
      folder: req.body.folder || 'uploads',
      allowedTypes: req.body.fileTypes || ['image'],
      generateThumbnail: req.body.generateThumbnail === 'true',
      optimizationLevel: req.body.optimizationLevel || 'medium',
      tags: req.body.tags ? req.body.tags.split(',') : []
    });

    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (err) {
    next(new AppError(err.message, err.statusCode || 500));
  }
});

// Handle multiple file upload
exports.uploadFiles = catchAsync(async (req, res, next) => {
  if (!req.files?.length) {
    return next(new AppError('No files uploaded', 400));
  }

  try {
    const results = await fileHandler.uploadMultipleFiles(req.files, {
      folder: req.body.folder || 'uploads',
      allowedTypes: req.body.fileTypes || ['image'],
      generateThumbnail: req.body.generateThumbnail === 'true',
      optimizationLevel: req.body.optimizationLevel || 'medium',
      tags: req.body.tags ? req.body.tags.split(',') : []
    });

    res.status(200).json({
      status: 'success',
      results: results.length,
      data: results
    });
  } catch (err) {
    next(new AppError(err.message, err.statusCode || 500));
  }
});

// Delete file
exports.deleteFile = catchAsync(async (req, res, next) => {
  const { publicId } = req.params;

  if (!publicId) {
    return next(new AppError('No public_id provided', 400));
  }

  try {
    await fileHandler.deleteFile(publicId);

    res.status(200).json({
      status: 'success',
      message: 'File deleted successfully'
    });
  } catch (err) {
    next(new AppError(err.message, err.statusCode || 500));
  }
});

// Manual cleanup of orphaned files
exports.cleanupOrphanedFiles = catchAsync(async (req, res, next) => {
  if (!req.user.role === 'admin') {
    return next(new AppError('Not authorized', 403));
  }

  try {
    const cleanedCount = await fileHandler.cleanupOrphanedFiles('uploads', []);

    res.status(200).json({
      status: 'success',
      message: `Cleaned up ${cleanedCount} orphaned files`
    });
  } catch (err) {
    next(new AppError(err.message, err.statusCode || 500));
  }
});
