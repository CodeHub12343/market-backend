/* // controllers/postController.js
const Post = require('../models/postModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Configure Cloudinary (expects env vars)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer in-memory storage
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  if (!file.mimetype) return cb(new AppError('Invalid file', 400), false);
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) cb(null, true);
  else cb(new AppError('Only image/video uploads are allowed', 400), false);
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB

// middleware to accept multiple files (field name: media)
exports.uploadPostMedia = upload.array('media', 6);

// helper: stream buffer to Cloudinary with resource_type auto
const uploadBufferToCloudinary = (buffer, folder = 'posts', resource_type = 'auto') =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type, quality: 'auto', fetch_format: 'auto' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });

// -------------------- CONTROLLERS --------------------

// Create a post (supports direct-from-client too)
// If client already uploaded to Cloudinary, it can pass media array [{ url, publicId, resourceType }]
// Otherwise, if files present (req.files), server will upload them to Cloudinary.
exports.createPost = catchAsync(async (req, res, next) => {
  const { content, campus, visibility, tags } = req.body;
  if (!content && (!req.files || req.files.length === 0)) {
    return next(new AppError('Post must have content or media', 400));
  }
  // Build media array
  const media = [];

  // 1) Accept client-provided media array (direct uploads)
  if (req.body.media && typeof req.body.media === 'string') {
    // If sent as JSON string
    try {
      const parsed = JSON.parse(req.body.media);
      if (Array.isArray(parsed)) {
        parsed.forEach((m) => {
          if (m.url) media.push({ url: m.url, publicId: m.publicId || '', resourceType: m.resourceType || 'image' });
        });
      }
    } catch (err) {
      // ignore parse error
    }
  } else if (Array.isArray(req.body.media)) {
    req.body.media.forEach((m) => {
      if (m && m.url) media.push({ url: m.url, publicId: m.publicId || '', resourceType: m.resourceType || 'image' });
    });
  }

  // 2) If files uploaded via multipart to server, upload buffers to Cloudinary
  if (req.files && req.files.length) {
    for (const file of req.files) {
      const mime = file.mimetype || '';
      const resource_type = mime.startsWith('video/') ? 'video' : 'image';
      const uploadRes = await uploadBufferToCloudinary(file.buffer, 'posts', resource_type);
      media.push({
        url: uploadRes.secure_url,
        publicId: uploadRes.public_id,
        resourceType: resource_type === 'auto' ? (uploadRes.resource_type || 'image') : resource_type
      });
    }
  }

  const post = await Post.create({
    author: req.user._id,
    campus,
    content,
    visibility: visibility || 'campus',
    tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim())) : [],
    media
  });

  res.status(201).json({ status: 'success', data: { post } });
});

// Get posts (filters: campus, author, search, visibility, tags) + pagination + sort
exports.getAllPosts = catchAsync(async (req, res, next) => {
  const { campus, author, search, tags, visibility, page = 1, limit = 20, sort = '-createdAt' } = req.query;

  const filter = {};
  // Campus filter (default: if user requested campus filtered by their campus)
  if (campus) filter.campus = campus;
  // Author
  if (author) filter.author = author;
  // Visibility: if provided, allow filter. Otherwise by default show campus/public posts
  if (visibility) filter.visibility = visibility;
  // Tags (comma separated)
  if (tags) {
    const tagArr = tags.split(',').map((t) => t.trim());
    filter.tags = { $in: tagArr };
  }
  // Search
  if (search) {
    filter.$text = { $search: search };
  }

  const numericPage = Math.max(parseInt(page, 10), 1);
  const numericLimit = Math.min(parseInt(limit, 10), 100);
  const skip = (numericPage - 1) * numericLimit;

  const [posts, total] = await Promise.all([
    Post.find(filter).sort(sort).skip(skip).limit(numericLimit),
    Post.countDocuments(filter)
  ]);

  res.status(200).json({
    status: 'success',
    results: posts.length,
    total,
    page: numericPage,
    pages: Math.ceil(total / numericLimit),
    data: { posts }
  });
});

// Get single post
exports.getPost = catchAsync(async (req, res, next) => {
  const post = await Post.findById(req.params.id);
  if (!post) return next(new AppError('Post not found', 404));
  res.status(200).json({ status: 'success', data: { post } });
});

// Update post (only author)
exports.updatePost = catchAsync(async (req, res, next) => {
  const post = await Post.findOne({ _id: req.params.id, author: req.user._id });
  if (!post) return next(new AppError('Post not found or unauthorized', 404));

  // If new media uploaded through server, upload and append
  if (req.files && req.files.length) {
    for (const file of req.files) {
      const resource_type = file.mimetype.startsWith('video/') ? 'video' : 'image';
      const uploadRes = await uploadBufferToCloudinary(file.buffer, 'posts', resource_type);
      post.media.push({
        url: uploadRes.secure_url,
        publicId: uploadRes.public_id,
        resourceType: resource_type
      });
    }
  }

  // If client wants to replace media entirely, they can send media (json) and a flag replaceMedia=true
  if (req.body.replaceMedia === 'true' && req.body.media) {
    // delete old media from cloudinary
    for (const m of post.media) {
      if (m.publicId) {
        try {
          await cloudinary.uploader.destroy(m.publicId, { resource_type: m.resourceType === 'video' ? 'video' : 'image' });
        } catch (err) {
          console.error('Cloudinary destroy failed', err);
        }
      }
    }
    // set new media from client (expects parsed array in req.body.media)
    let newMedia = [];
    try {
      newMedia = typeof req.body.media === 'string' ? JSON.parse(req.body.media) : req.body.media;
      newMedia = (Array.isArray(newMedia) ? newMedia : []).map((m) => ({ url: m.url, publicId: m.publicId || '', resourceType: m.resourceType || 'image' }));
    } catch (err) {
      newMedia = [];
    }
    post.media = newMedia;
  }

  if (req.body.content) post.content = req.body.content;
  if (req.body.visibility) post.visibility = req.body.visibility;
  if (req.body.tags) post.tags = Array.isArray(req.body.tags) ? req.body.tags : req.body.tags.split(',').map((t) => t.trim());
  if (typeof req.body.pinned !== 'undefined') post.pinned = req.body.pinned === 'true' || req.body.pinned === true;

  await post.save();
  res.status(200).json({ status: 'success', data: { post } });
});

// Delete post (only author or admin)
exports.deletePost = catchAsync(async (req, res, next) => {
  // allow admins to delete (check req.user.role)
  const filter = { _id: req.params.id };
  if (req.user.role !== 'admin') filter.author = req.user._id;

  const post = await Post.findOne(filter);
  if (!post) return next(new AppError('Post not found or unauthorized', 404));

  // delete media from cloudinary
  for (const m of post.media) {
    if (m.publicId) {
      try {
        await cloudinary.uploader.destroy(m.publicId, { resource_type: m.resourceType === 'video' ? 'video' : 'image' });
      } catch (err) {
        console.error('Cloudinary destroy failed', err);
      }
    }
  }

  await post.deleteOne();
  res.status(204).json({ status: 'success', data: null });
});

// Like a post
exports.likePost = catchAsync(async (req, res, next) => {
  const postId = req.params.id;
  // We assume there's a separate Likes collection if you need to track per-user likes.
  // For simplicity, we increment likesCount and rely on a separate Favorite/Like model if you need per-user state.
  const post = await Post.findById(postId);
  if (!post) return next(new AppError('Post not found', 404));

  // If you want to prevent double-likes per user, implement a Like model or track likedBy array (not included by default)
  post.likesCount = (post.likesCount || 0) + 1;
  await post.save();
  res.status(200).json({ status: 'success', data: { post } });
});

// Unlike a post
exports.unlikePost = catchAsync(async (req, res, next) => {
  const post = await Post.findById(req.params.id);
  if (!post) return next(new AppError('Post not found', 404));

  post.likesCount = Math.max(0, (post.likesCount || 0) - 1);
  await post.save();
  res.status(200).json({ status: 'success', data: { post } });
});

// Increment comments count helper (call from comment controller on create/delete)
exports.incrementCommentsCount = catchAsync(async (postId, delta = 1) => {
  await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: delta } });
});

// Report post (mark as reported)
exports.reportPost = catchAsync(async (req, res, next) => {
  const post = await Post.findById(req.params.id);
  if (!post) return next(new AppError('Post not found', 404));
  post.isReported = true;
  await post.save();
  res.status(200).json({ status: 'success', message: 'Post reported' });
}); */

const Post = require('../models/postModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer setup: in-memory
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  if (!file.mimetype)
    return cb(new AppError('Invalid file', 400), false);
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/'))
    cb(null, true);
  else cb(new AppError('Only image/video uploads are allowed', 400), false);
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 20 * 1024 * 1024 } });
exports.uploadPostMedia = upload.array('media', 6);

// Helper to stream buffer to Cloudinary
const uploadBufferToCloudinary = (buffer, folder = 'posts', resource_type = 'auto') =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type, quality: 'auto', fetch_format: 'auto' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });

// ------------------------------------------------------
// CREATE POST
// ------------------------------------------------------
exports.createPost = catchAsync(async (req, res, next) => {
  const { content, campus, visibility, tags } = req.body;

  if (!content && (!req.files || req.files.length === 0))
    return next(new AppError('Post must have content or media', 400));

  const media = [];

  // Accept direct client-uploaded media
  if (req.body.media) {
    try {
      const parsed = typeof req.body.media === 'string' ? JSON.parse(req.body.media) : req.body.media;
      if (Array.isArray(parsed)) {
        parsed.forEach(m => {
          if (m.url) media.push({
            url: m.url,
            publicId: m.publicId || '',
            resourceType: m.resourceType || 'image',
          });
        });
      }
    } catch (err) { /* ignore */ }
  }

  // Upload files from multipart
  if (req.files && req.files.length) {
    for (const file of req.files) {
      const resource_type = file.mimetype.startsWith('video/') ? 'video' : 'image';
      const uploadRes = await uploadBufferToCloudinary(file.buffer, 'posts', resource_type);
      media.push({
        url: uploadRes.secure_url,
        publicId: uploadRes.public_id,
        resourceType: uploadRes.resource_type || 'image',
      });
    }
  }

  const post = await Post.create({
    author: req.user._id,
    campus,
    content,
    visibility: visibility || 'campus',
    tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [],
    media,
  });

  res.status(201).json({ status: 'success', data: { post } });
});

// ------------------------------------------------------
// GET ALL POSTS (filter + pagination)
// ------------------------------------------------------
exports.getAllPosts = catchAsync(async (req, res, next) => {
  const { campus, author, search, tags, visibility, page = 1, limit = 20, sort = '-createdAt' } = req.query;

  const filter = {};
  if (campus) filter.campus = campus;
  if (author) filter.author = author;
  if (visibility) filter.visibility = visibility;
  if (tags) filter.tags = { $in: tags.split(',').map(t => t.trim()) };
  if (search) filter.$text = { $search: search };

  const numericPage = Math.max(parseInt(page, 10), 1);
  const numericLimit = Math.min(parseInt(limit, 10), 100);
  const skip = (numericPage - 1) * numericLimit;

  const [posts, total] = await Promise.all([
    Post.find(filter).sort(sort).skip(skip).limit(numericLimit),
    Post.countDocuments(filter),
  ]);

  res.status(200).json({
    status: 'success',
    results: posts.length,
    total,
    page: numericPage,
    pages: Math.ceil(total / numericLimit),
    data: { posts },
  });
});

// ------------------------------------------------------
// GET SINGLE POST
// ------------------------------------------------------
exports.getPost = catchAsync(async (req, res, next) => {
  const post = await Post.findById(req.params.id);
  if (!post) return next(new AppError('Post not found', 404));
  res.status(200).json({ status: 'success', data: { post } });
});

// ------------------------------------------------------
// UPDATE POST (only author)
// ------------------------------------------------------
exports.updatePost = catchAsync(async (req, res, next) => {
  const post = await Post.findOne({ _id: req.params.id, author: req.user._id });
  if (!post) return next(new AppError('Post not found or unauthorized', 404));

  if (req.files && req.files.length) {
    for (const file of req.files) {
      const resource_type = file.mimetype.startsWith('video/') ? 'video' : 'image';
      const uploadRes = await uploadBufferToCloudinary(file.buffer, 'posts', resource_type);
      post.media.push({
        url: uploadRes.secure_url,
        publicId: uploadRes.public_id,
        resourceType: resource_type,
      });
    }
  }

  if (req.body.replaceMedia === 'true' && req.body.media) {
    for (const m of post.media) {
      if (m.publicId) {
        try {
          await cloudinary.uploader.destroy(m.publicId, { resource_type: m.resourceType });
        } catch (err) { console.error('Cloudinary destroy failed', err); }
      }
    }
    const newMedia = typeof req.body.media === 'string' ? JSON.parse(req.body.media) : req.body.media;
    post.media = (Array.isArray(newMedia) ? newMedia : []).map(m => ({
      url: m.url,
      publicId: m.publicId || '',
      resourceType: m.resourceType || 'image',
    }));
  }

  if (req.body.content) post.content = req.body.content;
  if (req.body.visibility) post.visibility = req.body.visibility;
  if (req.body.tags) post.tags = Array.isArray(req.body.tags)
    ? req.body.tags
    : req.body.tags.split(',').map(t => t.trim());
  if (typeof req.body.pinned !== 'undefined')
    post.pinned = req.body.pinned === 'true' || req.body.pinned === true;

  await post.save();
  res.status(200).json({ status: 'success', data: { post } });
});

// ------------------------------------------------------
// DELETE POST
// ------------------------------------------------------
exports.deletePost = catchAsync(async (req, res, next) => {
  const filter = { _id: req.params.id };
  if (req.user.role !== 'admin') filter.author = req.user._id;

  const post = await Post.findOne(filter);
  if (!post) return next(new AppError('Post not found or unauthorized', 404));

  for (const m of post.media) {
    if (m.publicId) {
      try {
        await cloudinary.uploader.destroy(m.publicId, { resource_type: m.resourceType });
      } catch (err) { console.error('Cloudinary destroy failed', err); }
    }
  }

  await post.deleteOne();
  res.status(204).json({ status: 'success', data: null });
});

// ------------------------------------------------------
// LIKE / UNLIKE TOGGLE
// ------------------------------------------------------
exports.toggleLike = catchAsync(async (req, res, next) => {
  const postId = req.params.id;
  const userId = req.user._id;

  // Use atomic update to avoid race conditions and double-likes.
  // If user already liked -> pull them, else push them.
  const post = await Post.findById(postId);
  if (!post) return next(new AppError('Post not found', 404));

  const alreadyLiked = post.likedBy?.some(id => id.toString() === userId.toString());

  let updated;
  if (alreadyLiked) {
    updated = await Post.findByIdAndUpdate(
      postId,
      { $pull: { likedBy: userId }, $inc: { likesCount: -1 } },
      { new: true }
    );
  } else {
    updated = await Post.findByIdAndUpdate(
      postId,
      { $addToSet: { likedBy: userId }, $inc: { likesCount: 1 } },
      { new: true }
    );
  }

  res.status(200).json({
    status: 'success',
    message: alreadyLiked ? 'Post unliked successfully' : 'Post liked successfully',
    data: { likesCount: updated.likesCount, liked: !alreadyLiked },
  });
});

// ✅ GET TRENDING POSTS
exports.getTrendingPosts = catchAsync(async (req, res, next) => {
  const { campus, limit = 10, timeframe = '7d' } = req.query;

  // Calculate date based on timeframe
  let startDate = new Date();
  switch (timeframe) {
    case '24h':
      startDate.setHours(startDate.getHours() - 24);
      break;
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case 'all':
      startDate = new Date(0);
      break;
    default:
      startDate.setDate(startDate.getDate() - 7);
  }

  const filter = {
    createdAt: { $gte: startDate },
    visibility: { $in: ['public', 'campus'] }
  };

  if (campus) filter.campus = campus;

  const posts = await Post.find(filter)
    .sort({ likesCount: -1, commentsCount: -1, createdAt: -1 })
    .limit(parseInt(limit))
    .populate('author', 'fullName photo email')
    .populate('campus', 'name');

  res.status(200).json({
    status: 'success',
    results: posts.length,
    data: { posts }
  });
});

// ✅ GET POPULAR POSTS
exports.getPopularPosts = catchAsync(async (req, res, next) => {
  const { limit = 10 } = req.query;

  const posts = await Post.find({ visibility: { $in: ['public', 'campus'] } })
    .sort({ likesCount: -1, commentsCount: -1 })
    .limit(parseInt(limit))
    .populate('author', 'fullName photo email')
    .populate('campus', 'name');

  res.status(200).json({
    status: 'success',
    results: posts.length,
    data: { posts }
  });
});

// ✅ BOOKMARK POST (Save/Bookmark functionality)
exports.bookmarkPost = catchAsync(async (req, res, next) => {
  const postId = req.params.id;
  const userId = req.user._id;

  const post = await Post.findById(postId);
  if (!post) return next(new AppError('Post not found', 404));

  // Initialize bookmarks array if not exists
  if (!post.bookmarkedBy) post.bookmarkedBy = [];

  const alreadyBookmarked = post.bookmarkedBy.some(id => id.toString() === userId.toString());

  if (alreadyBookmarked) {
    post.bookmarkedBy = post.bookmarkedBy.filter(id => id.toString() !== userId.toString());
  } else {
    post.bookmarkedBy.push(userId);
  }

  await post.save();

  res.status(200).json({
    status: 'success',
    message: alreadyBookmarked ? 'Post removed from bookmarks' : 'Post bookmarked successfully',
    data: { bookmarked: !alreadyBookmarked }
  });
});

// ✅ GET BOOKMARKED POSTS
exports.getBookmarkedPosts = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20 } = req.query;
  const userId = req.user._id;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const posts = await Post.find({ bookmarkedBy: userId })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('author', 'fullName photo email')
    .populate('campus', 'name')
    .sort('-createdAt');

  const total = await Post.countDocuments({ bookmarkedBy: userId });

  res.status(200).json({
    status: 'success',
    results: posts.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: { posts }
  });
});

// ✅ SHARE POST
exports.sharePost = catchAsync(async (req, res, next) => {
  const { platform } = req.body;
  const postId = req.params.id;

  const post = await Post.findById(postId);
  if (!post) return next(new AppError('Post not found', 404));

  // Track shares by platform
  if (!post.shares) post.shares = { facebook: 0, twitter: 0, whatsapp: 0, link: 0 };
  
  if (platform && ['facebook', 'twitter', 'whatsapp', 'link'].includes(platform)) {
    post.shares[platform]++;
  }

  await post.save();

  const shareUrls = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${process.env.APP_BASE_URL}/posts/${postId}`,
    twitter: `https://twitter.com/intent/tweet?url=${process.env.APP_BASE_URL}/posts/${postId}&text=${encodeURIComponent(post.content.substring(0, 100))}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(post.content.substring(0, 100))} ${process.env.APP_BASE_URL}/posts/${postId}`,
    link: `${process.env.APP_BASE_URL}/posts/${postId}`
  };

  res.status(200).json({
    status: 'success',
    message: 'Share link generated',
    data: { shareUrl: shareUrls[platform] || shareUrls.link }
  });
});

// ✅ INCREMENT POST VIEWS
exports.incrementPostViews = catchAsync(async (req, res, next) => {
  const postId = req.params.id;

  const post = await Post.findByIdAndUpdate(
    postId,
    { $inc: { views: 1 } },
    { new: true }
  );

  if (!post) return next(new AppError('Post not found', 404));

  res.status(200).json({
    status: 'success',
    data: { views: post.views }
  });
});

// ✅ GET POST ANALYTICS
exports.getPostAnalytics = catchAsync(async (req, res, next) => {
  const postId = req.params.id;

  const post = await Post.findById(postId);
  if (!post) return next(new AppError('Post not found', 404));

  // Check ownership
  if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(new AppError('Not authorized', 403));
  }

  const analytics = {
    views: post.views || 0,
    likes: post.likesCount || 0,
    comments: post.commentsCount || 0,
    bookmarks: (post.bookmarkedBy || []).length,
    shares: post.shares || { facebook: 0, twitter: 0, whatsapp: 0, link: 0 },
    engagementRate: ((((post.likesCount || 0) + (post.commentsCount || 0) + ((post.bookmarkedBy || []).length)) / Math.max((post.views || 1), 1)) * 100).toFixed(2),
    createdAt: post.createdAt,
    updatedAt: post.updatedAt
  };

  res.status(200).json({
    status: 'success',
    data: { analytics }
  });
});

// ✅ REPORT POST
// -------------------------------------------------------
// REPORT POST
// -------------------------------------------------------
exports.reportPost = catchAsync(async (req, res, next) => {
  const post = await Post.findById(req.params.id);
  if (!post) return next(new AppError('Post not found', 404));
  post.isReported = true;
  await post.save();
  res.status(200).json({ status: 'success', message: 'Post reported' });
});

