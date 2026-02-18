const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// GET /api/v1/users
exports.getAll = catchAsync(async (req, res, next) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find().select('-password').skip(skip).limit(limit),
    User.countDocuments()
  ]);

  res.status(200).json({ status: 'success', results: users.length, total, page, data: users });
});

// GET /api/v1/users/:id
exports.get = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) return next(new AppError('User not found', 404));
  res.status(200).json({ status: 'success', data: user });
});

// POST /api/v1/users
exports.create = catchAsync(async (req, res, next) => {
  const { fullName, email, password, campus, role } = req.body;
  if (!fullName || !email || !password || !campus) {
    return next(new AppError('fullName, email, password and campus are required', 400));
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return next(new AppError('Email already in use', 400));

  const user = await User.create({ fullName, email, password, campus, role });
  user.password = undefined;
  res.status(201).json({ status: 'success', data: user });
});

// PATCH /api/v1/users/:id
exports.update = catchAsync(async (req, res, next) => {
  // Prevent password updates through this route
  if (req.body.password) return next(new AppError('This route is not for password updates', 400));

  // Only allow admins or the user themselves
  if (req.user.role !== 'admin' && req.user.id !== req.params.id)
    return next(new AppError('Not authorized to update this user', 403));

  // Disallow role changes by non-admins
  if (req.body.role && req.user.role !== 'admin') delete req.body.role;

  const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).select('-password');
  if (!user) return next(new AppError('User not found', 404));
  res.status(200).json({ status: 'success', data: user });
});

// DELETE /api/v1/users/:id
exports.delete = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return next(new AppError('User not found', 404));
  res.status(204).json({ status: 'success', data: null });
});
