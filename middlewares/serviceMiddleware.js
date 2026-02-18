const Service = require('../models/serviceModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const cloudinary = require('../config/cloudinary');
const multer = require('multer');

// Multer configuration for service images
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 5 // Max 5 images
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new AppError('Only image files are allowed', 400), false);
    }
  }
});

exports.uploadServiceImages = upload.array('images', 5);

// Process and upload service images to Cloudinary
exports.processServiceImages = catchAsync(async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next();
  }

  const images = [];
  const CLOUD_FOLDER = process.env.CLOUDINARY_SERVICE_FOLDER || 'services';

  for (let i = 0; i < req.files.length; i++) {
    const file = req.files[i];
    // Sanitize title for use as public_id (remove special characters, only allow alphanumeric, hyphens, underscores)
    const sanitizedTitle = (req.body.title || 'service')
      .replace(/[^a-zA-Z0-9_\-]/g, '_') // Replace special chars with underscores
      .replace(/_+/g, '_') // Replace multiple underscores with single underscore
      .substring(0, 50); // Limit length
    
    const result = await cloudinary.uploader.upload(
      `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
      {
        folder: CLOUD_FOLDER,
        public_id: `${sanitizedTitle}_${Date.now()}_${i}`,
        transformation: [
          { width: 800, height: 600, crop: 'fill', quality: 'auto' },
          { format: 'auto' }
        ]
      }
    );

    images.push({
      url: result.secure_url,
      public_id: result.public_id
    });
  }

  req.serviceImages = images;
  next();
});

// Middleware to check if user owns the service
exports.checkServiceOwnership = catchAsync(async (req, res, next) => {
  const service = await Service.findById(req.params.id);
  
  if (!service) {
    return next(new AppError('Service not found', 404));
  }
  
  if (service.provider.toString() !== req.user.id) {
    return next(new AppError('You are not authorized to perform this action', 403));
  }
  
  req.service = service;
  next();
});

// Middleware to check if service is active
exports.checkServiceStatus = (req, res, next) => {
  if (!req.service) {
    return next(new AppError('Service not loaded before status check', 400));
  }

  if (req.service.status === 'inactive') {
    return next(new AppError('This service is currently inactive', 403));
  }

  if (req.service.status === 'suspended') {
    return next(new AppError('This service is currently suspended', 403));
  }

  if (req.service.status === 'completed') {
    return next(new AppError('This service has been completed', 403));
  }

  next();
};

// Middleware to check if service is available for booking
exports.checkServiceAvailability = (req, res, next) => {
  if (!req.service) {
    return next(new AppError('Service not loaded before availability check', 400));
  }

  if (!req.service.active) {
    return next(new AppError('This service is not available for booking', 403));
  }

  // Check if service has reached max bookings
  if (req.service.maxBookings && req.service.currentBookings >= req.service.maxBookings) {
    return next(new AppError('This service has reached maximum bookings', 403));
  }

  next();
};

// Middleware to increment service views
exports.incrementServiceViews = catchAsync(async (req, res, next) => {
  const service = await Service.findById(req.params.id);
  if (service && typeof service.incrementViews === 'function') {
    await service.incrementViews();
  }
  next();
});

// Middleware to parse nested FormData fields
exports.parseServiceFormData = (req, res, next) => {
  // Handle nested availability object
  if (req.body['availability.days'] || req.body['availability.startTime'] || req.body['availability.endTime']) {
    // availability.days can be a string (single value) or array (multiple values)
    const days = req.body['availability.days'];
    let daysArray = [];
    if (days) {
      daysArray = Array.isArray(days) ? days : [days];
    }
    
    req.body.availability = {
      days: daysArray,
      startTime: req.body['availability.startTime'] || '09:00',
      endTime: req.body['availability.endTime'] || '17:00'
    };
    
    // Remove the dot-notation fields
    delete req.body['availability.days'];
    delete req.body['availability.startTime'];
    delete req.body['availability.endTime'];
  }
  
  // Handle nested settings object
  if (req.body['settings.allowInstantBooking'] || req.body['settings.requireApproval'] || req.body['settings.cancellationPolicy']) {
    req.body.settings = {
      allowInstantBooking: req.body['settings.allowInstantBooking'] === 'true' || req.body['settings.allowInstantBooking'] === true,
      requireApproval: req.body['settings.requireApproval'] === 'true' || req.body['settings.requireApproval'] === true,
      cancellationPolicy: req.body['settings.cancellationPolicy'] || 'flexible'
    };
    
    // Remove the dot-notation fields
    delete req.body['settings.allowInstantBooking'];
    delete req.body['settings.requireApproval'];
    delete req.body['settings.cancellationPolicy'];
  }
  
  // Parse tags if it's a JSON string
  if (typeof req.body.tags === 'string') {
    try {
      req.body.tags = JSON.parse(req.body.tags);
    } catch (e) {
      req.body.tags = [];
    }
  }
  
  next();
};

// Middleware to validate service data
exports.validateServiceData = (req, res, next) => {
  const { title, description, price, category } = req.body;

  // Ensure required fields for creation
  if (req.method === 'POST') {
    if (!title || !description || !price) {
      return next(new AppError('Title, description, and price are required', 400));
    }
  }

  // Validate price is positive
  if (price !== undefined && price < 0) {
    return next(new AppError('Price must be positive', 400));
  }

  // Validate duration is positive
  if (req.body.duration !== undefined && req.body.duration < 0) {
    return next(new AppError('Duration must be positive', 400));
  }

  // Validate maxBookings is positive
  if (req.body.maxBookings !== undefined && req.body.maxBookings < 0) {
    return next(new AppError('Max bookings must be positive', 400));
  }

  next();
};

// Middleware to handle service image cleanup
exports.cleanupServiceImages = catchAsync(async (req, res, next) => {
  if (req.service?.images_meta?.length > 0) {
    const deletePromises = req.service.images_meta.map(img =>
      cloudinary.uploader.destroy(img.public_id).catch(() => null)
    );
    await Promise.all(deletePromises);
  }
  next();
});

// Middleware to check if user can view service (for analytics)
exports.checkServiceViewPermission = (req, res, next) => {
  if (!req.service) {
    return next(new AppError('Service not loaded before permission check', 400));
  }

  const isOwner = req.service.provider?.toString() === req.user.id;
  const isAdmin = req.user.role === 'admin';
  const isActive = req.service.status === 'active' && req.service.active;

  if (!isActive && !isOwner && !isAdmin) {
    return next(new AppError('Service not available', 404));
  }

  next();
};

// Middleware to check service booking permissions
exports.checkServiceBookingPermission = (req, res, next) => {
  if (!req.service) {
    return next(new AppError('Service not loaded before booking check', 400));
  }

  // Can't book your own service
  if (req.service.provider.toString() === req.user.id) {
    return next(new AppError('You cannot book your own service', 400));
  }

  // Check if service is available
  if (!req.service.active || req.service.status !== 'active') {
    return next(new AppError('This service is not available for booking', 403));
  }

  next();
};

// Middleware to populate service with provider info
exports.populateServiceProvider = catchAsync(async (req, res, next) => {
  if (req.service) {
    await req.service.populate('provider', 'fullName email role campus');
  }
  next();
});

// Middleware to check service analytics permissions
exports.checkServiceAnalyticsPermission = (req, res, next) => {
  if (!req.service) {
    return next(new AppError('Service not loaded before analytics check', 400));
  }

  const isOwner = req.service.provider?.toString() === req.user.id;
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    return next(new AppError('You are not authorized to view service analytics', 403));
  }

  next();
};
