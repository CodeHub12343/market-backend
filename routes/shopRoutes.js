// routes/shopRoutes.js
const express = require('express');
const authController = require('../middlewares/authMiddleware');
const shopController = require('../controllers/shopController');
const { upload, fileToUrl } = require('../config/multer');

const shopReviewRouter = require('./shopReviewRoutes');

const router = express.Router();

// ============================================
// PUBLIC ROUTES (NO AUTHENTICATION REQUIRED)
// ============================================

router.get('/', shopController.getAllShops);

// ============================================
// PROTECTED ROUTES (AUTHENTICATION REQUIRED)
// ============================================

// Apply authentication middleware to all routes below
router.use(authController.protect);

// ⭐ IMPORTANT: Specific routes BEFORE generic routes with parameters
// Get current user's shops (must come BEFORE /:id route)
router.get('/me', shopController.getMyShops);

// Shop review routes
router.use('/:shopId/reviews', shopReviewRouter);

// Get single shop by ID (generic route - comes LAST)
router.get('/:id', shopController.getShop);

// ============================================
// CRUD OPERATIONS (PROTECTED)
// ============================================

// Create a new shop with optional logo upload
router.post('/', upload.single('logo'), fileToUrl, shopController.createShop);

// Update shop (only owner)
router.patch('/:id', shopController.updateShop);

// Delete shop (only owner)
router.delete('/:id', shopController.deleteShop);

module.exports = router;
