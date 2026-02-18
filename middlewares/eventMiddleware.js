const Event = require('../models/eventModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const multer = require('multer');

// ✅ Multer configuration for event banners
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per image
    files: 1 // Only 1 banner image
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new AppError('Only image files are allowed', 400), false);
    }
    cb(null, true);
  }
});

// Upload event banner - accept any fields (text + file)
exports.uploadEventBanner = upload.any();

// Process and upload event banner to Cloudinary
exports.processEventBanner = catchAsync(async (req, res, next) => {
  // Handle files from .any() - they'll be in req.files array
  if (!req.files || req.files.length === 0) {
    return next();
  }

  try {
    const { uploadBuffer } = require('../utils/cloudinaryUpload');
    
    const folder = process.env.CLOUDINARY_EVENT_FOLDER || 'events';
    const publicId = `${folder}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Process only image files (skip any text fields that somehow got in req.files)
    const imageFile = req.files.find(f => f.mimetype.startsWith('image/'));
    
    if (imageFile) {
      const result = await uploadBuffer(imageFile.buffer, folder, publicId);

      // Set values in req.body so controller can access them
      req.body.bannerUrl = result.secure_url;
      req.body.bannerPublicId = result.public_id;
    }
  } catch (error) {
    console.error('Banner upload error:', error);
    return next(new AppError('Failed to upload banner image', 500));
  }

  next();
});

// Ensure the authenticated user owns the event (creator)
exports.checkEventOwnership = catchAsync(async (req, res, next) => {
  const event = await Event.findById(req.params.id);
  if (!event) return next(new AppError('Event not found', 404));
  if (event.createdBy.toString() !== req.user._id.toString()) {
    return next(new AppError('You do not have permission to modify this event', 403));
  }
  req.event = event;
  next();
});

// Allow management by owner or admin roles
exports.checkEventManagement = catchAsync(async (req, res, next) => {
  const event = await Event.findById(req.params.id);
  if (!event) return next(new AppError('Event not found', 404));
  const isOwner = event.createdBy.toString() === req.user._id.toString();
  const isAdmin = req.user.role && ['admin', 'moderator'].includes(req.user.role);
  if (!isOwner && !isAdmin) {
    return next(new AppError('You do not have permission to perform this action', 403));
  }
  req.event = event;
  next();
});

// Validate capacity before joining
exports.ensureCapacityBeforeJoin = catchAsync(async (req, res, next) => {
  const event = await Event.findById(req.params.id);
  if (!event) return next(new AppError('Event not found', 404));
  if (event.capacity && event.attendees.length >= event.capacity) {
    return next(new AppError('Event is at capacity', 400));
  }
  req.event = event;
  next();
});

// Prevent registering after deadline
exports.ensureRegistrationOpen = catchAsync(async (req, res, next) => {
  const event = req.event || (await Event.findById(req.params.id));
  if (!event) return next(new AppError('Event not found', 404));
  if (event.registrationRequired && event.registrationDeadline && event.registrationDeadline < new Date()) {
    return next(new AppError('Registration for this event is closed', 400));
  }
  next();
});

// Restrict publishing/cancelling privileges
exports.ensureStatusTransitionAllowed = (allowedStatuses = []) => (req, res, next) => {
  const { status } = req.body;
  if (!status) return next();
  if (allowedStatuses.length && !allowedStatuses.includes(status)) {
    return next(new AppError('Invalid status transition', 400));
  }
  next();
};

// Bulk operation guard
exports.validateBulkPermissions = catchAsync(async (req, res, next) => {
  const { eventIds } = req.body;
  if (!Array.isArray(eventIds) || eventIds.length === 0) {
    return next(new AppError('eventIds must be a non-empty array', 400));
  }
  const events = await Event.find({ _id: { $in: eventIds } }, 'createdBy');
  const isAdmin = req.user.role && ['admin', 'moderator'].includes(req.user.role);
  if (!isAdmin) {
    const allOwned = events.every(e => e.createdBy.toString() === req.user._id.toString());
    if (!allOwned) return next(new AppError('You can only bulk operate on your own events', 403));
  }
  next();
});

// Validate saved search permissions
exports.validateSavedSearchPermissions = catchAsync(async (req, res, next) => {
  const { searchId } = req.params;
  const search = await Event.db.collection('savedSearches').findOne({
    _id: Event.db.cast(searchId)
  });
  
  if (!search) return next(new AppError('Saved search not found', 404));
  
  const isOwner = search.createdBy.toString() === req.user._id.toString();
  const isPublic = search.isPublic;
  
  if (!isOwner && !isPublic) {
    return next(new AppError('You do not have permission to access this search', 403));
  }
  
  req.savedSearch = search;
  next();
});

// Validate template permissions
exports.validateTemplatePermissions = catchAsync(async (req, res, next) => {
  const { templateId } = req.params;
  const template = await Event.db.collection('eventTemplates').findOne({
    _id: Event.db.cast(templateId)
  });
  
  if (!template) return next(new AppError('Event template not found', 404));
  
  const isOwner = template.createdBy.toString() === req.user._id.toString();
  const isPublic = template.isPublic;
  
  if (!isOwner && !isPublic) {
    return next(new AppError('You do not have permission to access this template', 403));
  }
  
  req.eventTemplate = template;
  next();
});

// Validate export permissions
exports.validateExportPermissions = catchAsync(async (req, res, next) => {
  const { eventIds } = req.query;
  
  if (eventIds) {
    const ids = eventIds.split(',');
    const events = await Event.find({ _id: { $in: ids } });
    
    // Check if user has access to all requested events
    const hasAccess = events.every(event => 
      event.visibility === 'public' || 
      event.campus.toString() === req.user.campus?.toString() ||
      event.createdBy.toString() === req.user._id.toString()
    );
    
    if (!hasAccess) {
      return next(new AppError('You do not have permission to export some of the requested events', 403));
    }
  }
  
  next();
});

// Validate moderation permissions
exports.validateModerationPermissions = catchAsync(async (req, res, next) => {
  if (!['admin', 'moderator'].includes(req.user.role)) {
    return next(new AppError('Insufficient permissions for moderation', 403));
  }
  next();
});

// Validate calendar access
exports.validateCalendarAccess = catchAsync(async (req, res, next) => {
  const { eventId } = req.params;
  
  if (eventId) {
    const event = await Event.findById(eventId);
    if (!event) return next(new AppError('Event not found', 404));
    
    const hasAccess = event.visibility === 'public' || 
      event.campus.toString() === req.user.campus?.toString() ||
      event.createdBy.toString() === req.user._id.toString();
    
    if (!hasAccess) {
      return next(new AppError('You do not have permission to access this event calendar', 403));
    }
    
    req.event = event;
  }
  
  next();
});

// Validate social sharing permissions
exports.validateSharingPermissions = catchAsync(async (req, res, next) => {
  const { platform } = req.params;
  const validPlatforms = ['facebook', 'twitter', 'linkedin', 'whatsapp'];
  
  if (!validPlatforms.includes(platform)) {
    return next(new AppError('Invalid sharing platform', 400));
  }
  
  next();
});

