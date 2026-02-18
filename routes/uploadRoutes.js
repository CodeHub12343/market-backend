// src/routes/uploadRoutes.js
const express = require('express');
const { getCloudinarySignature } = require('../controllers/uploadController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Only logged-in users can request a signature
router.get('/signature', protect, getCloudinarySignature);

module.exports = router;