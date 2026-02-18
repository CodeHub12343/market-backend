const express = require('express');
const authController = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const authValidation = require('../validators/authValidation');
const { validate } = require('../middlewares/validationMiddleware');
const { authLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

// Authentication routes
router.post('/signup', authValidation.signup, validate, authController.signup);
router.post('/login', authLimiter, authValidation.login, validate, authController.login);

// Google Sign-In (two-step flow)
// Step 1: Verify Google ID token
router.post('/google-verify', authController.googleVerify);
// Step 2: Select campus and complete signup
router.post('/google-complete', authController.googleComplete);

// Email verification routes
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authValidation.forgotPassword, validate, authController.resendVerification);

// Password management routes
router.post('/forgot-password', authValidation.forgotPassword, validate, authController.forgotPassword);
router.patch('/reset-password', authValidation.resetPassword, validate, authController.resetPassword);
router.patch('/update-password', protect, authValidation.updatePassword, validate, authController.updatePassword);

// User info routes
router.get('/me', protect, authController.getMe);
router.post('/logout', protect, authController.logout);

module.exports = router;