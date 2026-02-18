// src/controllers/uploadController.js
const crypto = require('crypto');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getCloudinarySignature = catchAsync(async (req, res, next) => {
  if (!process.env.CLOUDINARY_API_SECRET)
    return next(new AppError('Cloudinary API Secret missing', 500));

  const timestamp = Math.round(new Date().getTime() / 1000);
  const folder = process.env.CLOUDINARY_PRODUCT_FOLDER || 'products';
  const paramsToSign = {
    timestamp,
    folder
  };

  // Generate signature
  const signature = crypto
    .createHash('sha1')
    .update(
      Object.keys(paramsToSign)
        .map(k => `${k}=${paramsToSign[k]}`)
        .join('&') + process.env.CLOUDINARY_API_SECRET
    )
    .digest('hex');

  res.status(200).json({
    status: 'success',
    data: {
      signature,
      timestamp,
      folder,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY
    }
  });
});