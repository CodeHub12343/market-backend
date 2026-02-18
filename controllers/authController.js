/**
 * @fileoverview Authentication Controller
 * Handles all authentication-related operations including user signup, login,
 * password management, and email verification.
 * @module controllers/authController
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult } = require('express-validator');

// Google ID token verifier
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { sendEmail, emailTemplates } = require('../utils/sendEmail');

/**
 * Creates a JWT token for a user
 * @param {string} id - The user's ID
 * @returns {string} JWT token
 * @private
 */
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

/**
 * Creates and sends a JWT token in the response
 * @param {Object} user - User document
 * @param {number} statusCode - HTTP status code
 * @param {Object} res - Express response object
 * @private
 */
const createSendToken = (user, statusCode, res) => {
  console.log('🔐 createSendToken called with user:', { id: user._id, email: user.email });
  const token = signToken(user._id);
  console.log('🔐 Token created, signing user ID:', user._id);
  user.password = undefined;
  const response = {
    status: 'success',
    token,
    data: { user }
  };
  console.log('🔐 Sending response with token and user:', { id: user._id, email: user.email, tokenFirst20: token.substring(0, 20) });
  res.status(statusCode).json(response);
};

/**
 * Sign up a new user
 * @route POST /api/v1/auth/signup
 * @param {Object} req.body.fullName - User's full name
 * @param {Object} req.body.email - User's email
 * @param {Object} req.body.password - User's password
 * @param {Object} req.body.passwordConfirm - Password confirmation
 * @param {Object} req.body.campus - User's campus ID
 * @throws {AppError} 400 - Missing fields, password mismatch, or email already registered
 * @throws {AppError} 500 - Error sending verification email
 */
exports.signup = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new AppError(errors.array()[0].msg, 400));

  const { fullName, email, password, passwordConfirm, campus } = req.body;
  if (!fullName || !email || !password || !passwordConfirm || !campus) {
    return next(new AppError('Missing required fields', 400));
  }
  if (password !== passwordConfirm) return next(new AppError('Passwords do not match', 400));

  const existing = await User.findOne({ email });
  if (existing) return next(new AppError('Email already registered', 400));

  // Create user without email verification
  const user = await User.create({
    fullName,
    email,
    password,
    campus,
    isVerified: true // Set as verified by default
  });

  // Create and send token immediately
  createSendToken(user, 201, res);
});

/**
 * Verify user's email address
 * @route POST /api/v1/auth/verify-email
 * @param {string} req.body.token - Email verification token
 * @throws {AppError} 400 - Missing token or invalid/expired token
 */
exports.verifyEmail = catchAsync(async (req, res, next) => {
  const { token } = req.body;
  if (!token) return next(new AppError('Please provide verification token', 400));

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    verificationToken: hashedToken,
    verificationExpires: { $gt: Date.now() }
  });

  if (!user) return next(new AppError('Invalid or expired verification token', 400));

  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  createSendToken(user, 200, res);
});

/**
 * Step 1: Verify Google ID Token and store temp session
 * User must then call /google-complete with campus ID
 * @route POST /api/v1/auth/google-verify
 * @param {string} req.body.idToken - Google ID Token from frontend
 * @returns {object} tempToken (to pass to /google-complete) + user data preview
 */
exports.googleVerify = catchAsync(async (req, res, next) => {
  const { idToken } = req.body;
  if (!idToken) return next(new AppError('Please provide Google idToken', 400));

  // Verify ID token with Google
  let ticket;
  try {
    ticket = await googleClient.verifyIdToken({ 
      idToken, 
      audience: process.env.GOOGLE_CLIENT_ID 
    });
  } catch (err) {
    console.error('Google token verification error:', err.message);
    console.error('Error details:', {
      code: err.code,
      message: err.message,
      clientId: process.env.GOOGLE_CLIENT_ID,
      receivedToken: idToken.substring(0, 50) + '...'
    });
    return next(new AppError(`Invalid or expired Google idToken: ${err.message}`, 401));
  }

  const payload = ticket.getPayload();
  const { sub: googleId, email, name, picture } = payload;
  if (!email) return next(new AppError('Google account has no email', 400));

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser && existingUser.googleId) {
    // User already has a Google account linked, just issue JWT
    return createSendToken(existingUser, 200, res);
  }

  if (existingUser && !existingUser.googleId) {
    // User exists with local account, can link Google
    existingUser.googleId = googleId;
    existingUser.provider = 'google';
    if (picture && (!existingUser.avatar || existingUser.avatar.url.includes('default'))) {
      existingUser.avatar = { url: picture };
    }
    await existingUser.save({ validateBeforeSave: false });
    return createSendToken(existingUser, 200, res);
  }

  // New user: create temp auth token, user will select campus in next step
  const TempGoogleAuth = require('../models/tempGoogleAuthModel');
  
  // Delete any existing temp tokens for this googleId
  await TempGoogleAuth.deleteMany({ googleId });

  // Generate temp token
  const tempToken = crypto.randomBytes(32).toString('hex');
  await TempGoogleAuth.create({
    googleId,
    email,
    fullName: name || email.split('@')[0],
    picture,
    tempToken
  });

  res.status(200).json({
    status: 'success',
    message: 'Please select your campus to complete signup',
    data: {
      tempToken,
      email,
      fullName: name || email.split('@')[0],
      picture
    }
  });
});

/**
 * Step 2: Complete Google signup by selecting campus
 * @route POST /api/v1/auth/google-complete
 * @param {string} req.body.tempToken - Temp token from /google-verify
 * @param {string} req.body.campusId - Campus ID selected by user
 * @returns {object} JWT and user data
 */
exports.googleComplete = catchAsync(async (req, res, next) => {
  const { tempToken, campusId } = req.body;
  
  if (!tempToken) return next(new AppError('Please provide temp token', 400));
  if (!campusId) return next(new AppError('Please select a campus', 400));

  const TempGoogleAuth = require('../models/tempGoogleAuthModel');
  const Campus = require('../models/campusModel');

  // Find and validate temp auth
  const tempAuth = await TempGoogleAuth.findOne({ tempToken });
  if (!tempAuth) return next(new AppError('Invalid or expired temp token', 400));

  // Validate campus exists
  const campus = await Campus.findById(campusId);
  if (!campus) return next(new AppError('Campus not found', 404));

  // Check email not already in use
  const existingUser = await User.findOne({ email: tempAuth.email });
  if (existingUser) return next(new AppError('Email already registered', 400));

  // Create user with selected campus
  const randomPassword = crypto.randomBytes(16).toString('hex');
  const user = await User.create({
    fullName: tempAuth.fullName,
    email: tempAuth.email,
    password: randomPassword,
    campus: campusId,
    isVerified: true,
    avatar: tempAuth.picture ? { url: tempAuth.picture } : undefined,
    googleId: tempAuth.googleId,
    provider: 'google'
  });

  // Delete temp auth token
  await TempGoogleAuth.deleteOne({ _id: tempAuth._id });

  // Issue JWT
  createSendToken(user, 201, res);
});

/**
 * Resend email verification token
 * @route POST /api/v1/auth/resend-verification
 * @param {string} req.body.email - User's email address
 * @throws {AppError} 400 - Missing email
 * @throws {AppError} 404 - No unverified user found
 * @throws {AppError} 500 - Error sending verification email
 */
exports.resendVerification = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  if (!email) return next(new AppError('Please provide your email', 400));

  const user = await User.findOne({ email, isVerified: false });
  if (!user) return next(new AppError('No unverified user found with that email', 404));

  const verifyToken = user.createVerificationToken();
  await user.save({ validateBeforeSave: false });

  try {
    const verifyEmail = emailTemplates.verifyEmail(user.fullName, verifyToken);
    await sendEmail({
      email: user.email,
      ...verifyEmail
    });

    res.status(200).json({
      status: 'success',
      message: 'Verification email resent. Please check your inbox.'
    });
  } catch (err) {
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError('Error sending verification email. Please try again.', 500));
  }
});

/**
 * Log in a user
 * @route POST /api/v1/auth/login
 * @param {string} req.body.email - User's email
 * @param {string} req.body.password - User's password
 * @throws {AppError} 400 - Missing email or password
 * @throws {AppError} 401 - Incorrect email or password
 * @throws {AppError} 403 - Email not verified
 */
exports.login = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new AppError(errors.array()[0].msg, 400));

  const { email, password } = req.body;
  if (!email || !password) return next(new AppError('Please provide email and password', 400));

  console.log('🔐 LOGIN - Email provided:', email);
  
  const user = await User.findOne({ email }).select('+password');
  console.log('🔐 LOGIN - User found in DB:', { id: user?._id, email: user?.email });
  
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // Check if user is verified
  if (!user.isVerified) {
    return next(new AppError('Please verify your email address first', 403));
  }

  console.log('🔐 LOGIN - Creating token for user:', { id: user._id, email: user.email });
  createSendToken(user, 200, res);
});

/**
 * Request password reset
 * @route POST /api/v1/auth/forgot-password
 * @param {string} req.body.email - User's email
 * @throws {AppError} 400 - Missing email
 * @throws {AppError} 404 - No user found with that email
 * @throws {AppError} 500 - Error sending reset email
 */
exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  if (!email) return next(new AppError('Please provide your email', 400));

  const user = await User.findOne({ email });
  if (!user) return next(new AppError('No user found with that email', 404));

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  try {
    const resetEmail = emailTemplates.resetPassword(user.fullName, resetToken);
    await sendEmail({
      email: user.email,
      ...resetEmail
    });

    res.status(200).json({
      status: 'success',
      message: 'Password reset instructions sent to your email'
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError('Error sending password reset email. Please try again.', 500));
  }
});

/**
 * Reset user's password
 * @route PATCH /api/v1/auth/reset-password
 * @param {string} req.body.token - Password reset token
 * @param {string} req.body.password - New password
 * @param {string} req.body.passwordConfirm - Password confirmation
 * @throws {AppError} 400 - Missing fields, passwords don't match, or invalid/expired token
 */
exports.resetPassword = catchAsync(async (req, res, next) => {
  const { token, password, passwordConfirm } = req.body;
  if (!token) return next(new AppError('Token is required', 400));
  if (!password || !passwordConfirm) return next(new AppError('Please provide new password & confirm', 400));
  if (password !== passwordConfirm) return next(new AppError('Passwords do not match', 400));

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  if (!user) return next(new AppError('Token is invalid or has expired', 400));

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.passwordChangedAt = Date.now();
  await user.save();

  // Send password changed notification
  try {
    const changedEmail = emailTemplates.passwordChanged(user.fullName);
    await sendEmail({
      email: user.email,
      ...changedEmail
    });
  } catch (err) {
    console.error('Error sending password changed notification:', err);
  }

  createSendToken(user, 200, res);
});

/**
 * Update user's password
 * @route PATCH /api/v1/auth/update-password
 * @param {string} req.body.currentPassword - Current password
 * @param {string} req.body.newPassword - New password
 * @param {string} req.body.newPasswordConfirm - New password confirmation
 * @throws {AppError} 400 - Missing fields or passwords don't match
 * @throws {AppError} 401 - Current password incorrect
 * @throws {AppError} 404 - User not found
 */
exports.updatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword, newPasswordConfirm } = req.body;
  
  if (!currentPassword || !newPassword || !newPasswordConfirm) {
    return next(new AppError('Please provide all password fields', 400));
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!user) return next(new AppError('User not found', 404));

  if (!(await user.correctPassword(currentPassword, user.password))) {
    return next(new AppError('Current password is incorrect', 401));
  }

  if (newPassword !== newPasswordConfirm) {
    return next(new AppError('New passwords do not match', 400));
  }

  user.password = newPassword;
  user.passwordChangedAt = Date.now();
  await user.save();

  // Send password changed notification
  try {
    const changedEmail = emailTemplates.passwordChanged(user.fullName);
    await sendEmail({
      email: user.email,
      ...changedEmail
    });
  } catch (err) {
    console.error('Error sending password changed notification:', err);
  }

  createSendToken(user, 200, res);
});

/**
 * Get current user's profile
 * @route GET /api/v1/auth/me
 * @throws {AppError} 404 - User not found
 */
exports.getMe = catchAsync(async (req, res, next) => {
  console.log('🔐 getMe called');
  console.log('   ✅ req.user._id:', req.user._id);
  console.log('   ✅ req.user.email:', req.user.email);
  console.log('   ✅ req.user.fullName:', req.user.fullName);
  
  console.log('   🔍 Querying User.findById with ID:', req.user._id.toString());
  const user = await User.findById(req.user._id).populate('campus', 'name shortCode').lean();
  
  console.log('   ✅ User from fresh DB query:');
  console.log('     _id:', user?._id);
  console.log('     email:', user?.email);
  console.log('     fullName:', user?.fullName);
  console.log('   ✅ VERIFY returned user matches req.user:', user?._id.toString() === req.user._id.toString());
  
  if (!user) return next(new AppError('User not found', 404));
  
  // Prevent caching of sensitive user info - force fresh response
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  
  console.log('   ✅ Sending response for user:', user.email);
  res.status(200).json({ status: 'success', data: { user } });
}); 
/* exports.getMe = catchAsync(async (req, res, next) => {
  console.log('🔐 getMe called');
  console.log('   req.user._id:', req.user._id);
  
  // Force fresh read from DB, bypass any caches
  const user = await User.findById(req.user._id)
    .populate('campus', 'name shortCode')
  // If using cache middleware
  
  console.log('   Found user from DB:', { _id: user?._id, email: user?.email });
  
  if (!user) return next(new AppError('User not found', 404));
  
  // Prevent caching
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  
  res.status(200).json({ status: 'success', data: { user } });
}); */
/**
 * Log out current user
 * @route POST /api/v1/auth/logout
 */
exports.logout = catchAsync(async (req, res) => {
  res.status(200).json({ status: 'success', message: 'Logged out successfully' });
});