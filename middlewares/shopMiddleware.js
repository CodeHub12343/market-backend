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

// Middleware to handle single logo upload
exports.uploadShopLogo = upload.single('logo');

// Middleware to process and upload logo to Cloudinary
exports.processShopLogo = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

  try {
    // Upload to Cloudinary with transformation
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'student-marketplace/shop-logos',
      transformation: [
        { width: 300, height: 300, crop: 'fill' },
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ],
      resource_type: 'image'
    });

    // If shop already has a logo, delete the old one
    if (req.shop && req.shop.logo && req.shop.logo.publicId) {
      await cloudinary.uploader.destroy(req.shop.logo.publicId);
    }

    // Add logo info to request body
    req.body.logo = {
      url: result.secure_url,
      publicId: result.public_id
    };

    next();
  } catch (error) {
    return next(new AppError('Error uploading logo. Please try again.', 400));
  }
});

// Delete logo from Cloudinary
exports.deleteShopLogo = catchAsync(async (publicId) => {
  if (!publicId) return;
  
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting logo from Cloudinary:', error);
  }
});

// Middleware to check if user owns the shop
exports.checkShopOwnership = catchAsync(async (req, res, next) => {
  const Shop = require('../models/shopModel');
  const shop = await Shop.findById(req.params.id);
  
  if (!shop) {
    return next(new AppError('Shop not found', 404));
  }
  
  if (shop.owner.toString() !== req.user.id) {
    return next(new AppError('You are not authorized to perform this action', 403));
  }
  
  req.shop = shop;
  next();
});

// Middleware to check shop status
exports.checkShopStatus = (req, res, next) => {
  if (req.shop && req.shop.status === 'suspended') {
    return next(new AppError('This shop is currently suspended', 403));
  }
  
  if (req.shop && req.shop.status === 'closed') {
    return next(new AppError('This shop is closed', 403));
  }
  
  next();
};