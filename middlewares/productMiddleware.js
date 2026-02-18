/* const Product = require('../models/productModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Middleware to check if user owns the product (through shop ownership)
exports.checkProductOwnership = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id).populate('shop');
  
  if (!product) {
    return next(new AppError('Product not found', 404));
  }
  
  if (product.shop.owner.toString() !== req.user.id) {
    return next(new AppError('You are not authorized to perform this action', 403));
  }
  
  req.product = product;
  next();
});

// Middleware to check if product is active
exports.checkProductStatus = (req, res, next) => {
  if (req.product && req.product.status === 'inactive') {
    return next(new AppError('This product is currently inactive', 403));
  }
  
  if (req.product && req.product.status === 'sold') {
    return next(new AppError('This product has been sold', 403));
  }
  
  next();
});

// Middleware to check if product is in stock
exports.checkProductStock = (req, res, next) => {
  if (req.product && req.product.stock === 0) {
    return next(new AppError('This product is out of stock', 403));
  }
  
  next();
};

// Middleware to increment product views
exports.incrementProductViews = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (product) {
    await product.incrementViews();
  }
  next();
});

// Middleware to validate product data
exports.validateProductData = (req, res, next) => {
  // Ensure required fields are present for creation
  if (req.method === 'POST') {
    const { name, price, shop } = req.body;
    if (!name || !price || !shop) {
      return next(new AppError('Name, price, and shop are required', 400));
    }
  }
  
  // Validate price is positive
  if (req.body.price && req.body.price < 0) {
    return next(new AppError('Price must be positive', 400));
  }
  
  // Validate stock is non-negative
  if (req.body.stock && req.body.stock < 0) {
    return next(new AppError('Stock must be non-negative', 400));
  }
  
  next();
});

// Middleware to handle product image cleanup
exports.cleanupProductImages = catchAsync(async (req, res, next) => {
  if (req.product && req.product.images_meta && req.product.images_meta.length > 0) {
    const cloudinary = require('../config/cloudinary');
    const deletePromises = req.product.images_meta.map(img =>
      cloudinary.uploader.destroy(img.public_id).catch(() => null)
    );
    await Promise.all(deletePromises);
  }
  next();
});

// Middleware to check if user can view product (for analytics)
exports.checkProductViewPermission = (req, res, next) => {
  // Allow viewing if:
  // 1. Product is active
  // 2. User is the owner
  // 3. User is admin
  if (req.product) {
    const isOwner = req.product.shop.owner.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    const isActive = req.product.status === 'active';
    
    if (!isActive && !isOwner && !isAdmin) {
      return next(new AppError('Product not available', 404));
    }
  }
  
  next();
}; */

// productMiddleware.js

const Product = require('../models/productModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const cloudinary = require('../config/cloudinary');

// ✅ Middleware to check if user owns the product (via shop ownership)
exports.checkProductOwnership = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id).populate({
    path: 'shop',
    populate: { path: 'owner' },
  });

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  if (!product.shop || !product.shop.owner) {
    return next(new AppError('Invalid shop or owner reference', 400));
  }

  if (product.shop.owner._id.toString() !== req.user.id) {
    return next(new AppError('You are not authorized to perform this action', 403));
  }

  req.product = product;
  next();
});

// ✅ Middleware to check if product is active
exports.checkProductStatus = (req, res, next) => {
  if (!req.product) {
    return next(new AppError('Product not loaded before status check', 400));
  }

  if (req.product.status === 'inactive') {
    return next(new AppError('This product is currently inactive', 403));
  }

  if (req.product.status === 'sold') {
    return next(new AppError('This product has been sold', 403));
  }

  next();
};

// ✅ Middleware to check if product is in stock
exports.checkProductStock = (req, res, next) => {
  if (!req.product) {
    return next(new AppError('Product not loaded before stock check', 400));
  }

  if (req.product.stock === 0) {
    return next(new AppError('This product is out of stock', 403));
  }

  next();
};

// ✅ Middleware to increment product views (if method exists)
exports.incrementProductViews = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (product && typeof product.incrementViews === 'function') {
    await product.incrementViews();
  }
  next();
});

// ✅ Middleware to validate product data on create/update
exports.validateProductData = (req, res, next) => {
  const { name, price, shop, stock } = req.body;

  // Ensure required fields for creation
  if (req.method === 'POST') {
    if (!name || !price || !shop) {
      return next(new AppError('Name, price, and shop are required', 400));
    }
  }

  // Validate price is positive
  if (price !== undefined && price < 0) {
    return next(new AppError('Price must be positive', 400));
  }

  // Validate stock is non-negative
  if (stock !== undefined && stock < 0) {
    return next(new AppError('Stock must be non-negative', 400));
  }

  next();
};

// ✅ Middleware to handle product image cleanup
exports.cleanupProductImages = catchAsync(async (req, res, next) => {
  if (req.product?.images_meta?.length > 0) {
    const deletePromises = req.product.images_meta.map(img =>
      cloudinary.uploader.destroy(img.public_id).catch(() => null)
    );
    await Promise.all(deletePromises);
  }
  next();
});

// ✅ Middleware to check if user can view product (for analytics or restricted listings)
exports.checkProductViewPermission = (req, res, next) => {
  if (!req.product) {
    return next(new AppError('Product not loaded before permission check', 400));
  }

  const isOwner = req.product.shop?.owner?._id?.toString() === req.user.id;
  const isAdmin = req.user.role === 'admin';
  const isActive = req.product.status === 'active';

  if (!isActive && !isOwner && !isAdmin) {
    return next(new AppError('Product not available', 404));
  }

  next();
};

