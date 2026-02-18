const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { deleteAvatar } = require('../middlewares/profileMiddleware');

// Filter allowed fields for update
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(key => {
    if (allowedFields.includes(key)) newObj[key] = obj[key];
  });
  return newObj;
};

/**
 * Get current user's profile
 * @route GET /api/v1/profile/me
 */
exports.getMyProfile = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id)
    .populate('campus', 'name shortCode')
    .lean();

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { user }
  });
});

/**
 * Get user profile by ID (respecting privacy settings)
 * @route GET /api/v1/profile/users/:id
 */
exports.getUserProfile = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id)
    .populate('campus', 'name shortCode')
    .lean();

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  // Check privacy settings
  if (user.preferences?.profileVisibility === 'private') {
    // Allow only if viewing own profile
    if (req.user && req.user._id.toString() !== req.params.id) {
      return next(new AppError('This profile is private', 403));
    }
  }

  if (user.preferences?.profileVisibility === 'campus-only' && 
      (!req.user || req.user.campus?.toString() !== user.campus?.toString())) {
    return next(new AppError('This profile is only visible to campus members', 403));
  }

  res.status(200).json({
    status: 'success',
    data: { user }
  });
});

/**
 * Update current user's profile
 * @route PATCH /api/v1/profile/me
 */
exports.updateProfile = catchAsync(async (req, res, next) => {
  // 1) Prevent password updates via this route
  if (req.body.password || req.body.passwordConfirm) {
    return next(new AppError('This route is not for password updates. Please use /updatePassword.', 400));
  }

  // 2) Filter allowed fields
  const filteredBody = filterObj(
    req.body,
    'fullName',
    'phoneNumber',
    'bio',
    'department',
    'graduationYear',
    'socialLinks',
    'preferences'
  );

  // 3) Add avatar if provided
  if (req.body.avatar) {
    filteredBody.avatar = req.body.avatar;
  }

  // 4) Update user
  const updatedUser = await User.findByIdAndUpdate(req.user._id, filteredBody, {
    new: true,
    runValidators: true
  }).populate('campus', 'name shortCode');

  res.status(200).json({
    status: 'success',
    data: { user: updatedUser }
  });
});

/**
 * Upload/update user avatar
 * @route POST /api/v1/profile/me/avatar
 */
exports.uploadAvatar = catchAsync(async (req, res, next) => {
  if (!req.body.avatar) {
    return next(new AppError('Please provide an avatar', 400));
  }

  const user = await User.findById(req.user._id);

  // Delete old avatar if exists
  if (user.avatar?.publicId) {
    await deleteAvatar(user.avatar.publicId);
  }

  user.avatar = req.body.avatar;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'Avatar updated successfully',
    data: { user }
  });
});

/**
 * Delete user avatar (revert to default)
 * @route DELETE /api/v1/profile/me/avatar
 */
exports.deleteProfilePicture = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  if (user.avatar?.publicId) {
    await deleteAvatar(user.avatar.publicId);
  }

  user.avatar = {
    url: 'https://via.placeholder.com/150?text=Avatar',
    publicId: null
  };

  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'Profile picture deleted successfully',
    data: { user }
  });
});

/**
 * Update user preferences
 * @route PATCH /api/v1/profile/me/preferences
 */
exports.updatePreferences = catchAsync(async (req, res, next) => {
  const allowedPreferences = [
    'emailNotifications',
    'pushNotifications',
    'profileVisibility',
    'language',
    'currency'
  ];

  const filteredPreferences = filterObj(req.body, ...allowedPreferences);

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { preferences: { ...req.user.preferences, ...filteredPreferences } },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    status: 'success',
    data: { user: updatedUser }
  });
});

/**
 * Get user profile statistics
 * @route GET /api/v1/profile/me/stats
 */
exports.getProfileStats = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  const stats = {
    totalPosts: user.posts?.length || 0,
    totalFollowers: user.followers?.length || 0,
    totalFollowing: user.following?.length || 0,
    totalReviews: user.reviews?.length || 0,
    accountAge: Math.floor((Date.now() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24)) + ' days',
    lastLogin: user.lastLogin,
    profileCompletion: calculateProfileCompletion(user)
  };

  res.status(200).json({
    status: 'success',
    data: { stats }
  });
});

/**
 * Follow a user
 * @route POST /api/v1/profile/users/:id/follow
 */
exports.followUser = catchAsync(async (req, res, next) => {
  const userToFollow = await User.findById(req.params.id);

  if (!userToFollow) {
    return next(new AppError('User not found', 404));
  }

  if (req.user._id.toString() === req.params.id) {
    return next(new AppError('You cannot follow yourself', 400));
  }

  const currentUser = await User.findById(req.user._id);

  // Check if already following
  if (currentUser.following?.includes(req.params.id)) {
    return next(new AppError('You are already following this user', 400));
  }

  // Add to following list
  currentUser.following = currentUser.following || [];
  currentUser.following.push(req.params.id);
  await currentUser.save({ validateBeforeSave: false });

  // Add to followers list
  userToFollow.followers = userToFollow.followers || [];
  userToFollow.followers.push(req.user._id);
  await userToFollow.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'User followed successfully'
  });
});

/**
 * Unfollow a user
 * @route DELETE /api/v1/profile/users/:id/follow
 */
exports.unfollowUser = catchAsync(async (req, res, next) => {
  const userToUnfollow = await User.findById(req.params.id);

  if (!userToUnfollow) {
    return next(new AppError('User not found', 404));
  }

  const currentUser = await User.findById(req.user._id);

  // Check if following
  if (!currentUser.following?.includes(req.params.id)) {
    return next(new AppError('You are not following this user', 400));
  }

  // Remove from following list
  currentUser.following = currentUser.following.filter(id => id.toString() !== req.params.id);
  await currentUser.save({ validateBeforeSave: false });

  // Remove from followers list
  userToUnfollow.followers = userToUnfollow.followers.filter(id => id.toString() !== req.user._id);
  await userToUnfollow.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'User unfollowed successfully'
  });
});

/**
 * Block a user
 * @route POST /api/v1/profile/users/:id/block
 */
exports.blockUser = catchAsync(async (req, res, next) => {
  const userToBlock = await User.findById(req.params.id);

  if (!userToBlock) {
    return next(new AppError('User not found', 404));
  }

  if (req.user._id.toString() === req.params.id) {
    return next(new AppError('You cannot block yourself', 400));
  }

  const currentUser = await User.findById(req.user._id);

  // Check if already blocked
  if (currentUser.blockedUsers?.includes(req.params.id)) {
    return next(new AppError('You have already blocked this user', 400));
  }

  currentUser.blockedUsers = currentUser.blockedUsers || [];
  currentUser.blockedUsers.push(req.params.id);
  await currentUser.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'User blocked successfully'
  });
});

/**
 * Unblock a user
 * @route DELETE /api/v1/profile/users/:id/block
 */
exports.unblockUser = catchAsync(async (req, res, next) => {
  const userToUnblock = await User.findById(req.params.id);

  if (!userToUnblock) {
    return next(new AppError('User not found', 404));
  }

  const currentUser = await User.findById(req.user._id);

  if (!currentUser.blockedUsers?.includes(req.params.id)) {
    return next(new AppError('You have not blocked this user', 400));
  }

  currentUser.blockedUsers = currentUser.blockedUsers.filter(id => id.toString() !== req.params.id);
  await currentUser.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'User unblocked successfully'
  });
});

/**
 * Delete user account (soft delete)
 * @route DELETE /api/v1/profile/me
 */
exports.deleteAccount = catchAsync(async (req, res, next) => {
  const { password } = req.body;

  if (!password) {
    return next(new AppError('Please provide your password to confirm account deletion', 400));
  }

  const user = await User.findById(req.user._id).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect password. Account deletion cancelled.', 401));
  }

  // Soft delete: mark as inactive
  user.isActive = false;
  user.deactivatedAt = Date.now();
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'Account deactivated successfully. You can reactivate within 30 days.'
  });
});

/**
 * Get user's followers
 * @route GET /api/v1/profile/users/:id/followers
 */
exports.getFollowers = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id).populate('followers', '_id fullName avatar campus');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    status: 'success',
    results: user.followers?.length || 0,
    data: { followers: user.followers || [] }
  });
});

/**
 * Get user's following list
 * @route GET /api/v1/profile/users/:id/following
 */
exports.getFollowing = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id).populate('following', '_id fullName avatar campus');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    status: 'success',
    results: user.following?.length || 0,
    data: { following: user.following || [] }
  });
});

/**
 * Update last login time (internal use)
 * @route PATCH /api/v1/profile/me/last-login
 */
exports.updateLastLogin = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user._id, { lastLogin: Date.now() });
  next();
});

/**
 * Helper: Calculate profile completion percentage
 */
const calculateProfileCompletion = (user) => {
  const requiredFields = [
    user.fullName,
    user.email,
    user.phoneNumber,
    user.bio,
    user.avatar?.url,
    user.socialLinks?.length > 0
  ];

  const completedFields = requiredFields.filter(field => field).length;
  return Math.round((completedFields / requiredFields.length) * 100);
};