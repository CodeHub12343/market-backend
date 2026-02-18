const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AppError = require('../utils/appError');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create subdirectory based on entity type (shops, products, users, etc.)
    const entityType = req.baseUrl.split('/').pop() || 'uploads';
    const dest = path.join(uploadDir, entityType);
    
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// File filter - only allow images
const fileFilter = (req, file, cb) => {
  // Allowed MIME types
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.', 400), false);
  }
};

// Create upload middleware for single file
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  }
});

// Helper middleware to convert file to URL
const fileToUrl = (req, res, next) => {
  console.log('fileToUrl middleware - req.file:', req.file ? { name: req.file.filename, size: req.file.size } : 'undefined');
  console.log('fileToUrl middleware - req.baseUrl:', req.baseUrl);
  
  if (req.file) {
    // Store relative path in req.body for easier access
    const entityType = req.baseUrl.split('/').pop() || 'uploads';
    req.body.fileUrl = `/public/uploads/${entityType}/${req.file.filename}`;
    req.body.fileName = req.file.filename;
    req.body.fileOriginalName = req.file.originalname;
    console.log('fileToUrl middleware - fileUrl set to:', req.body.fileUrl);
  }
  next();
};

module.exports = {
  upload,
  fileToUrl,
  uploadDir
};
