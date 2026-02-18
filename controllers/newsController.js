// controllers/newsController.js
const News = require('../models/newsModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Cloudinary config (expects env vars)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer memory storage (we stream buffer to Cloudinary)
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new AppError('Only image uploads are allowed for news banner', 400), false);
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

// Export middleware to use in routes
// Accept either `image` or `bannerUrl` as the multipart field name to be tolerant of client variations
exports.uploadBanner = upload.fields([{ name: 'image', maxCount: 1 }, { name: 'bannerUrl', maxCount: 1 }]);

// Helper: upload buffer to Cloudinary (returns { secure_url, public_id })
const uploadBufferToCloudinary = (buffer, folder = 'news') =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [{ quality: 'auto' }, { fetch_format: 'auto' }]
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });

// -------------------- CONTROLLERS --------------------

// Create news (admin/editor)
exports.createNews = catchAsync(async (req, res, next) => {
  // roles checked in routes (restrictTo)
  const { title, body, summary, campus, category, isPublished, publishedAt, pinned } = req.body;

  const doc = {
    title,
    body,
    summary,
    campus: campus || null,
    category: category || 'announcement',
    isPublished: typeof isPublished !== 'undefined' ? isPublished : true,
    publishedAt: publishedAt ? new Date(publishedAt) : Date.now(),
    pinned: pinned === 'true' || pinned === true,
    author: req.user._id
  };

  // handle optional image upload (support req.file from single or req.files from fields)
  const uploadedFile = req.file || (req.files && (req.files.image && req.files.image[0])) || (req.files && (req.files.bannerUrl && req.files.bannerUrl[0]));
  if (uploadedFile && uploadedFile.buffer) {
    const uploadResult = await uploadBufferToCloudinary(uploadedFile.buffer, 'news');
    doc.bannerUrl = uploadResult.secure_url;
    doc.bannerPublicId = uploadResult.public_id;
  }

  const news = await News.create(doc);

  res.status(201).json({
    status: 'success',
    data: { news }
  });
});

// Get all news with filters, search, pagination, sorting
exports.getAllNews = catchAsync(async (req, res, next) => {
  const {
    campus,
    category,
    search,
    startDate,
    endDate,
    published, // true|false
    pinned, // true|false
    sort = '-pinned,-publishedAt,createdAt',
    page = 1,
    limit = 20
  } = req.query;

  const filter = {};

  if (campus) filter.campus = campus;
  if (category) filter.category = category;
  if (typeof published !== 'undefined') filter.isPublished = published === 'true' || published === true;
  if (typeof pinned !== 'undefined') filter.pinned = pinned === 'true' || pinned === true;

  if (startDate || endDate) {
    filter.publishedAt = {};
    if (startDate) filter.publishedAt.$gte = new Date(startDate);
    if (endDate) filter.publishedAt.$lte = new Date(endDate);
  }

  if (search) {
    filter.$text = { $search: search };
  }

  const numericPage = Math.max(parseInt(page, 10), 1);
  const numericLimit = Math.min(parseInt(limit, 10) || 20, 100);
  const skip = (numericPage - 1) * numericLimit;

  const query = News.find(filter).sort(sort).skip(skip).limit(numericLimit);

  // If text search, optionally add text score sorting/fields
  if (search) {
    query.select({ score: { $meta: 'textScore' } });
    // Build a sort object that prioritizes text score. If the user supplied a sort field,
    // merge the first requested sort field after the text score.
    const sortObj = { score: { $meta: 'textScore' } };
    if (sort) {
      const firstField = sort.split(',')[0];
      const fieldName = firstField.replace(/^-/, '');
      const direction = firstField.startsWith('-') ? -1 : 1;
      sortObj[fieldName] = direction;
    }
    query.sort(sortObj);
  }

  const [news, total] = await Promise.all([query.exec(), News.countDocuments(filter)]);

  res.status(200).json({
    status: 'success',
    results: news.length,
    total,
    page: numericPage,
    pages: Math.ceil(total / numericLimit),
    data: { news }
  });
});

// Get single news by id
exports.getNews = catchAsync(async (req, res, next) => {
  const news = await News.findById(req.params.id);
  if (!news) return next(new AppError('News not found', 404));
  res.status(200).json({ status: 'success', data: { news } });
});

// Update news (admin/editor). Handles banner replacement.
exports.updateNews = catchAsync(async (req, res, next) => {
  // Only allow certain fields to be updated by body
  const allowed = ['title', 'body', 'summary', 'campus', 'category', 'isPublished', 'publishedAt', 'pinned'];
  const updates = {};
  Object.keys(req.body || {}).forEach((k) => {
    if (allowed.includes(k)) updates[k] = req.body[k];
  });

  const news = await News.findById(req.params.id);
  if (!news) return next(new AppError('News not found', 404));

  // If a new image file was uploaded, delete old one and upload new
  const uploadedReplacement = req.file || (req.files && (req.files.image && req.files.image[0])) || (req.files && (req.files.bannerUrl && req.files.bannerUrl[0]));
  if (uploadedReplacement && uploadedReplacement.buffer) {
    // delete old if exists
    if (news.bannerPublicId) {
      try {
        await cloudinary.uploader.destroy(news.bannerPublicId, { resource_type: 'image' });
      } catch (err) {
        // log but don't fail update
        console.error('Cloudinary destroy failed', err);
      }
    }
    const uploadResult = await uploadBufferToCloudinary(uploadedReplacement.buffer, 'news');
    updates.bannerUrl = uploadResult.secure_url;
    updates.bannerPublicId = uploadResult.public_id;
  }

  Object.assign(news, updates);
  await news.save();

  res.status(200).json({ status: 'success', data: { news } });
});

// Delete news (admin/editor). Deletes banner on Cloudinary.
exports.deleteNews = catchAsync(async (req, res, next) => {
  const news = await News.findById(req.params.id);
  if (!news) return next(new AppError('News not found', 404));

  if (news.bannerPublicId) {
    try {
      await cloudinary.uploader.destroy(news.bannerPublicId, { resource_type: 'image' });
    } catch (err) {
      console.error('Cloudinary destroy failed', err);
    }
  }

  await news.deleteOne();

  res.status(204).json({ status: 'success', data: null });
});

// ✅ GET TRENDING NEWS
exports.getTrendingNews = catchAsync(async (req, res, next) => {
  const { campus, limit = 10, timeframe = '7d' } = req.query;

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
    default:
      startDate.setDate(startDate.getDate() - 7);
  }

  const filter = {
    isPublished: true,
    publishedAt: { $gte: startDate }
  };

  if (campus) filter.campus = campus;

  const news = await News.find(filter)
    .sort({ pinned: -1, publishedAt: -1 })
    .limit(parseInt(limit))
    .populate('author', 'fullName email')
    .populate('campus', 'name');

  res.status(200).json({
    status: 'success',
    results: news.length,
    data: { news }
  });
});

// ✅ GET FEATURED NEWS
exports.getFeaturedNews = catchAsync(async (req, res, next) => {
  const { limit = 5 } = req.query;

  const news = await News.find({ isPublished: true, pinned: true })
    .sort({ publishedAt: -1 })
    .limit(parseInt(limit))
    .populate('author', 'fullName email')
    .populate('campus', 'name');

  res.status(200).json({
    status: 'success',
    results: news.length,
    data: { news }
  });
});

// ✅ GET NEWS BY CATEGORY
exports.getNewsByCategory = catchAsync(async (req, res, next) => {
  const { category } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const validCategories = ['announcement', 'notice', 'event', 'alert', 'other'];
  if (!validCategories.includes(category)) {
    return next(new AppError('Invalid category', 400));
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [news, total] = await Promise.all([
    News.find({ category, isPublished: true })
      .skip(skip)
      .limit(parseInt(limit))
      .sort('-publishedAt')
      .populate('author', 'fullName email')
      .populate('campus', 'name'),
    News.countDocuments({ category, isPublished: true })
  ]);

  res.status(200).json({
    status: 'success',
    results: news.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: { news }
  });
});

// ✅ INCREMENT NEWS VIEWS
exports.incrementNewsViews = catchAsync(async (req, res, next) => {
  const newsId = req.params.id;

  const news = await News.findByIdAndUpdate(
    newsId,
    { $inc: { views: 1 } },
    { new: true }
  );

  if (!news) return next(new AppError('News not found', 404));

  res.status(200).json({
    status: 'success',
    data: { views: news.views || 0 }
  });
});

// ✅ ADD NEWS TO SAVED
exports.saveNews = catchAsync(async (req, res, next) => {
  const newsId = req.params.id;
  const userId = req.user._id;

  const news = await News.findById(newsId);
  if (!news) return next(new AppError('News not found', 404));

  if (!news.savedBy) news.savedBy = [];

  const alreadySaved = news.savedBy.some(id => id.toString() === userId.toString());

  if (alreadySaved) {
    news.savedBy = news.savedBy.filter(id => id.toString() !== userId.toString());
  } else {
    news.savedBy.push(userId);
  }

  await news.save();

  res.status(200).json({
    status: 'success',
    message: alreadySaved ? 'News removed from saved' : 'News saved successfully',
    data: { saved: !alreadySaved }
  });
});

// ✅ GET SAVED NEWS
exports.getSavedNews = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20 } = req.query;
  const userId = req.user._id;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [news, total] = await Promise.all([
    News.find({ savedBy: userId })
      .skip(skip)
      .limit(parseInt(limit))
      .sort('-publishedAt')
      .populate('author', 'fullName email')
      .populate('campus', 'name'),
    News.countDocuments({ savedBy: userId })
  ]);

  res.status(200).json({
    status: 'success',
    results: news.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: { news }
  });
});

// ✅ GET NEWS ANALYTICS
exports.getNewsAnalytics = catchAsync(async (req, res, next) => {
  const newsId = req.params.id;

  const news = await News.findById(newsId);
  if (!news) return next(new AppError('News not found', 404));

  // Check ownership
  if (news.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(new AppError('Not authorized', 403));
  }

  const analytics = {
    views: news.views || 0,
    saves: (news.savedBy || []).length,
    shares: news.shares || 0,
    createdAt: news.createdAt,
    publishedAt: news.publishedAt,
    updatedAt: news.updatedAt
  };

  res.status(200).json({
    status: 'success',
    data: { analytics }
  });
});

// Provide generic CRUD aliases for consistency with other controllers/routes
exports.getAll = exports.getAllNews;
exports.get = exports.getNews;
exports.create = exports.createNews;
exports.update = exports.updateNews;
exports.delete = exports.deleteNews;
