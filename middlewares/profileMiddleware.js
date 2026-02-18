const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Configure multer for memory storage
const multerStorage = multer.memoryStorage();

// Filter files to ensure only images are uploaded
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

// Multer upload configuration
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Middleware to handle single avatar upload
exports.uploadAvatar = upload.single('avatar');

// Middleware to process and upload avatar to Cloudinary
exports.processAvatar = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

  try {
    // Upload to Cloudinary with transformation
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'student-marketplace/avatars',
      transformation: [
        { width: 500, height: 500, crop: 'fill' },
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ],
      resource_type: 'image'
    });

    // If user already has an avatar, delete the old one
    if (req.user.avatar && req.user.avatar.publicId) {
      await cloudinary.uploader.destroy(req.user.avatar.publicId);
    }

    // Add avatar info to request body
    req.body.avatar = {
      url: result.secure_url,
      publicId: result.public_id
    };

    next();
  } catch (error) {
    return next(new AppError('Error uploading avatar. Please try again.', 400));
  }
});

// Delete avatar from Cloudinary
exports.deleteAvatar = catchAsync(async (publicId) => {
  if (!publicId) return;
  
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting avatar from Cloudinary:', error);
  }
});