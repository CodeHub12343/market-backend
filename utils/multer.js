const multer = require('multer');
const AppError = require('./appError');

// Memory storage so we can upload buffer directly to Cloudinary
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Allow only pdfs, docs, and images
  if (
    file.mimetype.startsWith('image/') ||
    file.mimetype === 'application/pdf' ||
    file.mimetype ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.mimetype === 'application/msword'
  ) {
    cb(null, true);
  } else {
    cb(new AppError('Unsupported file type. Upload an image or PDF/DOC.', 400), false);
  }
};

module.exports = multer({ storage, fileFilter });
