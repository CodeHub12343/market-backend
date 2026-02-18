const Document = require('../models/documentModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const rateLimit = require('express-rate-limit');

// Rate limiting for document uploads
exports.uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 uploads per windowMs
  message: {
    status: 'error',
    message: 'Too many uploads, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for document downloads
exports.downloadRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 downloads per minute
  message: {
    status: 'error',
    message: 'Too many downloads, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Check if user owns the document or is admin
exports.checkDocumentOwnership = catchAsync(async (req, res, next) => {
  const document = await Document.findById(req.params.id);
  if (!document) {
    return next(new AppError('Document not found', 404));
  }

  // Allow if user is admin or owns the document
  if (req.user.role === 'admin' || document.uploadedBy.toString() === req.user._id.toString()) {
    req.document = document;
    return next();
  }

  return next(new AppError('You do not have permission to perform this action', 403));
});

// Check document permissions based on visibility
exports.checkDocumentPermissions = catchAsync(async (req, res, next) => {
  const document = await Document.findById(req.params.id);
  if (!document) {
    return next(new AppError('Document not found', 404));
  }

  // Owner and admin can always access
  if (req.user.role === 'admin' || document.uploadedBy.toString() === req.user._id.toString()) {
    req.document = document;
    return next();
  }

  // Check visibility permissions
  switch (document.visibility) {
    case 'public':
      req.document = document;
      return next();
    case 'campus':
      if (document.campus.toString() === req.user.campus.toString()) {
        req.document = document;
        return next();
      }
      break;
    case 'private':
      // Only owner can access private documents
      break;
  }

  return next(new AppError('You do not have permission to access this document', 403));
});

// Validate document access for download
exports.validateDocumentAccess = catchAsync(async (req, res, next) => {
  const document = await Document.findById(req.params.id);
  if (!document) {
    return next(new AppError('Document not found', 404));
  }

  // Check if document is archived
  if (document.archived) {
    return next(new AppError('Document is archived and cannot be accessed', 410));
  }

  // Check permissions
  if (req.user.role === 'admin' || document.uploadedBy.toString() === req.user._id.toString()) {
    req.document = document;
    return next();
  }

  switch (document.visibility) {
    case 'public':
      req.document = document;
      return next();
    case 'campus':
      if (document.campus.toString() === req.user.campus.toString()) {
        req.document = document;
        return next();
      }
      break;
    case 'private':
      break;
  }

  return next(new AppError('You do not have permission to download this document', 403));
});

// Check if user can rate/review documents
exports.checkRatingPermissions = catchAsync(async (req, res, next) => {
  const document = await Document.findById(req.params.id);
  if (!document) {
    return next(new AppError('Document not found', 404));
  }

  // Cannot rate your own documents
  if (document.uploadedBy.toString() === req.user._id.toString()) {
    return next(new AppError('You cannot rate your own documents', 400));
  }

  // Check if user has access to the document
  if (req.user.role === 'admin' || document.visibility === 'public') {
    req.document = document;
    return next();
  }

  if (document.visibility === 'campus' && document.campus.toString() === req.user.campus.toString()) {
    req.document = document;
    return next();
  }

  return next(new AppError('You do not have permission to rate this document', 403));
});

// Check if user can comment on documents
exports.checkCommentPermissions = catchAsync(async (req, res, next) => {
  const document = await Document.findById(req.params.id);
  if (!document) {
    return next(new AppError('Document not found', 404));
  }

  // Check if comments are enabled
  if (!document.allowComments) {
    return next(new AppError('Comments are disabled for this document', 400));
  }

  // Check document access permissions
  if (req.user.role === 'admin' || document.visibility === 'public') {
    req.document = document;
    return next();
  }

  if (document.visibility === 'campus' && document.campus.toString() === req.user.campus.toString()) {
    req.document = document;
    return next();
  }

  return next(new AppError('You do not have permission to comment on this document', 403));
});

// Validate bulk operation permissions
exports.validateBulkPermissions = catchAsync(async (req, res, next) => {
  const { documentIds, action } = req.body;

  // Check if user owns all documents or is admin
  const documents = await Document.find({ _id: { $in: documentIds } });
  
  if (documents.length !== documentIds.length) {
    return next(new AppError('Some documents not found', 404));
  }

  // For delete and update actions, user must own all documents or be admin
  if (['delete', 'update'].includes(action) && req.user.role !== 'admin') {
    const notOwned = documents.filter(doc => doc.uploadedBy.toString() !== req.user._id.toString());
    if (notOwned.length > 0) {
      return next(new AppError('You can only perform bulk operations on your own documents', 403));
    }
  }

  req.documents = documents;
  next();
});

// Track document analytics
exports.trackDocumentView = catchAsync(async (req, res, next) => {
  if (req.document) {
    // Increment view count
    await Document.findByIdAndUpdate(req.document._id, { $inc: { views: 1 } });
    
    // Track user view (for analytics)
    if (!req.document.viewedBy) {
      req.document.viewedBy = [];
    }
    
    // Add user to viewedBy if not already there
    if (!req.document.viewedBy.includes(req.user._id)) {
      await Document.findByIdAndUpdate(req.document._id, { 
        $addToSet: { viewedBy: req.user._id } 
      });
    }
  }
  next();
});

// Track document download
exports.trackDocumentDownload = catchAsync(async (req, res, next) => {
  if (req.document) {
    // Increment download count
    await Document.findByIdAndUpdate(req.document._id, { $inc: { downloads: 1 } });
    
    // Track user download
    if (!req.document.downloadedBy) {
      req.document.downloadedBy = [];
    }
    
    // Add user to downloadedBy if not already there
    if (!req.document.downloadedBy.includes(req.user._id)) {
      await Document.findByIdAndUpdate(req.document._id, { 
        $addToSet: { downloadedBy: req.user._id } 
      });
    }
  }
  next();
});

module.exports = exports;