const Reaction = require('../models/reactionModel');
const Post = require('../models/postModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Add or update a reaction
exports.addReaction = catchAsync(async (req, res, next) => {
  const { postId } = req.params;
  const { emoji } = req.body;
  const userId = req.user.id;

  // Validate emoji
  const validEmojis = ['👍', '❤️', '😂', '😢', '👏', '🔥', '😍', '🤔'];
  if (!validEmojis.includes(emoji)) {
    return next(
      new AppError(
        `Invalid emoji. Must be one of: ${validEmojis.join(', ')}`,
        400
      )
    );
  }

  // Check if post exists
  const post = await Post.findById(postId);
  if (!post) {
    return next(new AppError('Post not found', 404));
  }

  // Remove any existing reaction by this user on this post
  await Reaction.deleteMany({
    post: postId,
    user: userId,
  });

  // Add new reaction
  const reaction = await Reaction.create({
    post: postId,
    user: userId,
    emoji,
  });

  res.status(201).json({
    status: 'success',
    data: {
      reaction,
    },
  });
});

// Remove a reaction
exports.removeReaction = catchAsync(async (req, res, next) => {
  const { postId } = req.params;
  const userId = req.user.id;

  const reaction = await Reaction.findOneAndDelete({
    post: postId,
    user: userId,
  });

  if (!reaction) {
    return next(new AppError('Reaction not found', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Reaction removed',
  });
});

// Get all reactions for a post
exports.getPostReactions = catchAsync(async (req, res, next) => {
  const { postId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  const skip = (page - 1) * limit;

  // Check if post exists
  const post = await Post.findById(postId);
  if (!post) {
    return next(new AppError('Post not found', 404));
  }

  // Get reactions grouped by emoji
  const reactions = await Reaction.aggregate([
    { $match: { post: new mongoose.Types.ObjectId(postId) } },
    {
      $group: {
        _id: '$emoji',
        count: { $sum: 1 },
        users: { $push: '$user' },
      },
    },
    { $sort: { count: -1 } },
  ]);

  // Get total count
  const total = await Reaction.countDocuments({ post: postId });

  res.status(200).json({
    status: 'success',
    results: reactions.length,
    total,
    data: {
      reactions,
    },
  });
});

// Get current user's reaction on a post
exports.getUserReaction = catchAsync(async (req, res, next) => {
  const { postId } = req.params;
  const userId = req.user.id;

  const reaction = await Reaction.findOne({
    post: postId,
    user: userId,
  });

  res.status(200).json({
    status: 'success',
    data: {
      reaction: reaction || null,
    },
  });
});

// Get user's all reactions
exports.getUserReactions = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { page = 1, limit = 50 } = req.query;

  const skip = (page - 1) * limit;

  const reactions = await Reaction.find({ user: userId })
    .populate('post', 'content media')
    .sort('-createdAt')
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Reaction.countDocuments({ user: userId });

  res.status(200).json({
    status: 'success',
    results: reactions.length,
    total,
    data: {
      reactions,
    },
  });
});

// Get reaction statistics for a post
exports.getReactionStats = catchAsync(async (req, res, next) => {
  const { postId } = req.params;

  const stats = await Reaction.aggregate([
    { $match: { post: new mongoose.Types.ObjectId(postId) } },
    {
      $group: {
        _id: '$emoji',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const totalReactions = stats.reduce((sum, stat) => sum + stat.count, 0);

  res.status(200).json({
    status: 'success',
    data: {
      totalReactions,
      byEmoji: stats,
    },
  });
});
