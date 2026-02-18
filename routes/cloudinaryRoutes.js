const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const uploadMiddleware = require('../middlewares/uploadMiddleware');
const cloudinaryController = require('../controllers/cloudinaryController');

const router = express.Router();

// Protect all routes
router.use(authMiddleware.protect);

// Single file upload route
router.post(
  '/upload',
  uploadMiddleware.uploadSingle('file'),
  uploadMiddleware.cleanupOnError,
  cloudinaryController.uploadFile
);

// Multiple files upload route
router.post(
  '/upload-multiple',
  uploadMiddleware.uploadMultiple('files', 10),
  uploadMiddleware.cleanupOnError,
  cloudinaryController.uploadFiles
);

// Delete file route
router.delete(
  '/files/:publicId',
  cloudinaryController.deleteFile
);

// Manual cleanup route (admin only)
router.post(
  '/cleanup-orphaned',
  authMiddleware.restrictTo('admin'),
  cloudinaryController.cleanupOrphanedFiles
);

module.exports = router;
