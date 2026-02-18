const jwt = require('jsonwebtoken');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const User = require('../models/userModel');

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return next(new AppError('Not logged in', 401));

  console.log('🔐 PROTECT MIDDLEWARE - NEW REQUEST');
  console.log('   Token received:', token.substring(0, 30) + '...');
  console.log('   TOKEN FULL ID PORTION:', token.substring(0, 50) + '...');
  
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log('   ✅ Decoded token:', { id: decoded.id, iat: decoded.iat, exp: decoded.exp });
  
  if (!decoded) return next(new AppError('Invalid token', 401));

  console.log('   🔍 Now querying User.findById(' + decoded.id + ')');
  const currentUser = await User.findById(decoded.id)
    .select('+password')
    .populate('campus', '_id name shortCode');
  console.log('   ✅ Found user in DB:', { id: currentUser?._id, email: currentUser?.email, fullName: currentUser?.fullName, campus: currentUser?.campus });
  
  if (!currentUser) return next(new AppError('The user belonging to this token no longer exists', 401));

  // check if user changed password after token was issued
  if (currentUser.changedPasswordAfter && currentUser.changedPasswordAfter(decoded.iat)) {
    return next(new AppError('User recently changed password. Please login again.', 401));
  }

  // Expose the full user document (without password) on req.user so downstream
  // controllers can access _id, campus, role, etc. Remove sensitive fields.
  currentUser.password = undefined;
  req.user = currentUser;
  console.log('   ✅ Setting req.user to:', { id: req.user._id, email: req.user.email });
  console.log('   ✅ VERIFY req.user._id === decoded.id:', req.user._id.toString() === decoded.id);
  next();
});

// Optional protect middleware - does not error if token is absent or invalid.
// If a valid token is present, it attaches `req.user` (populated with campus).
exports.optionalProtect = catchAsync(async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) return next(); // No token - continue as anonymous

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) return next();

    const currentUser = await User.findById(decoded.id)
      .select('+password')
      .populate('campus', '_id name shortCode');

    if (currentUser) {
      currentUser.password = undefined;
      req.user = currentUser;
      console.log('   ✅ optionalProtect set req.user to:', { id: req.user._id, email: req.user.email });
    }
  } catch (err) {
    console.warn('optionalProtect: token invalid or user not found - continuing anonymously');
  }

  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};