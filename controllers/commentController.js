const Comment = require('../models/commentModel');
const Post = require('../models/postModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Create Comment
exports.createComment = catchAsync(async (req, res, next) => {
  const post = await Post.findById(req.params.postId);
  if (!post) return next(new AppError('Post not found', 404));

  const comment = await Comment.create({
    post: req.params.postId,
    user: req.user.id,
    text: req.body.text,
  });

  post.commentsCount += 1;
  await post.save({ validateBeforeSave: false });

  res.status(201).json({
    status: 'success',
    data: comment,
  });
});

// Get Comments for Post
exports.getCommentsByPost = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, sort = 'createdAt' } = req.query;
  const numericPage = Math.max(parseInt(page, 10), 1);
  const numericLimit = Math.min(parseInt(limit, 10), 100);
  const skip = (numericPage - 1) * numericLimit;

  const filter = { post: req.params.postId };
  const [comments, total] = await Promise.all([
    Comment.find(filter).sort(sort).skip(skip).limit(numericLimit),
    Comment.countDocuments(filter),
  ]);

  res.status(200).json({
    status: 'success',
    results: comments.length,
    total,
    page: numericPage,
    pages: Math.ceil(total / numericLimit),
    data: comments,
  });
});

// Delete Comment
exports.deleteComment = catchAsync(async (req, res, next) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) return next(new AppError('Comment not found', 404));

  if (comment.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission', 403));
  }

  await comment.deleteOne();
  await Post.findByIdAndUpdate(comment.post, { $inc: { commentsCount: -1 } });

  res.status(204).json({ status: 'success', data: null });
});

// Edit Comment
exports.updateComment = catchAsync(async (req, res, next) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) return next(new AppError('Comment not found', 404));

  if (comment.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission', 403));
  }

  comment.text = req.body.text;
  await comment.save();

  res.status(200).json({ status: 'success', data: comment });
});

// Toggle like on comment
exports.toggleCommentLike = catchAsync(async (req, res, next) => {
  const commentId = req.params.id;
  const userId = req.user._id;

  const comment = await Comment.findById(commentId);
  if (!comment) return next(new AppError('Comment not found', 404));

  const alreadyLiked = comment.likedBy?.some(id => id.toString() === userId.toString());
  let updated;
  if (alreadyLiked) {
    updated = await Comment.findByIdAndUpdate(
      commentId,
      { $pull: { likedBy: userId }, $inc: { likesCount: -1 } },
      { new: true }
    );
  } else {
    updated = await Comment.findByIdAndUpdate(
      commentId,
      { $addToSet: { likedBy: userId }, $inc: { likesCount: 1 } },
      { new: true }
    );
  }

  res.status(200).json({
    status: 'success',
    message: alreadyLiked ? 'Comment unliked successfully' : 'Comment liked successfully',
    data: { likesCount: updated.likesCount, liked: !alreadyLiked },
  });
});
