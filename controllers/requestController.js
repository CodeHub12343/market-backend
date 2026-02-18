// src/controllers/requestController.js
const Request = require('../models/requestModel');
const RequestCategory = require('../models/requestCategoryModel');
const Offer = require('../models/offerModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const User = require('../models/userModel');
const Notification = require('../models/notificationModel');
const { sendToUser } = require('../socketManager');
const mongoose = require('mongoose');
const RequestSearchHistory = require('../models/requestSearchHistoryModel');

// Create a new buyer request
exports.createRequest = catchAsync(async (req, res, next) => {
  const { title, description, category, campus, desiredPrice, whatsappNumber } = req.body;
  if (!title) return next(new AppError('Title is required', 400));

  // Get image URLs if files were uploaded
  const images = req.uploadedFiles ? req.uploadedFiles.map(file => file.url) : [];

  const request = await Request.create({
    title,
    description,
    category,
    campus,
    desiredPrice,
    requester: req.user.id,
    images,
    ...(whatsappNumber && { whatsappNumber })
  });

  // Notify nearby sellers about the new request (best-effort; failures shouldn't block response)
  (async () => {
    try {
      const sellers = await User.find({ campus: campus || req.user.campus, role: 'seller' });
      if (sellers && sellers.length) {
        const notificationData = sellers.map(seller => ({
          user: seller._id,
          title: 'New Buyer Request',
          message: `${req.user.name || req.user.fullName || 'A user'} posted a new request: ${title}`,
          type: 'request',
          data: { requestId: request._id }
        }));

        // Insert notifications (non-blocking if it fails)
        try {
          await Notification.insertMany(notificationData);
        } catch (err) {
          console.error('Failed to insert notifications:', err && err.message ? err.message : err);
        }

        // Send real-time socket notifications to each seller (if online)
        sellers.forEach(seller => {
          try {
            sendToUser(String(seller._id), 'newRequest', {
              requestId: request._id,
              title: 'New Buyer Request',
              message: `${req.user.name || req.user.fullName || 'A user'} posted a new request: ${title}`
            });
          } catch (err) {
            // continue on error
            console.error('sendToUser error:', err && err.message ? err.message : err);
          }
        });
      }
    } catch (err) {
      console.error('Notification workflow error:', err && err.message ? err.message : err);
    }
  })();

  // Record creation in history
  try {
    request.history = request.history || [];
    request.history.push({ action: 'created', timestamp: new Date(), user: req.user.id, details: 'Request created' });
    await request.save();
  } catch (err) {
    // non-fatal
    console.error('Failed to record request creation history:', err && err.message ? err.message : err);
  }

  res.status(201).json({ status: 'success', data: { request } });
});

// Record creation in history (post-create)
exports._recordRequestCreation = catchAsync(async (req, res, next) => {
  try {
    const request = await Request.findById(res?.locals?.createdRequestId || req.body.requestId || req.params.id);
    if (request) {
      request.history = request.history || [];
      request.history.push({
        action: 'created',
        timestamp: new Date(),
        user: req.user.id,
        details: `Request created by ${req.user.id}`
      });
      await request.save();
    }
  } catch (err) {
    console.error('Failed to record request creation history', err);
  }
  // noop; this helper is optional in middleware chains
  if (next) next();
});

// Advanced filter and sort requests with comprehensive options
exports.advancedSearchRequests = catchAsync(async (req, res, next) => {
  const {
    search,
    category,
    requester,
    campus,
    status = 'open',
    minPrice,
    maxPrice,
    minResponseTime,
    maxResponseTime,
    minViews,
    maxViews,
    minOffers,
    maxOffers,
    priority,
    hasImages,
    sortBy = 'createdAt',
    order = 'desc',
    page = 1,
    limit = 20,
    tags,
    expiringIn,
    fulfilled,
    popularity
  } = req.query;

  // Build advanced filter
  const filter = buildAdvancedRequestFilter({
    search, category, requester, campus, status, minPrice, maxPrice,
    minResponseTime, maxResponseTime, minViews, maxViews, minOffers, maxOffers,
    priority, hasImages, tags, expiringIn, fulfilled, popularity
  });

  // Build sort object
  const sortObj = buildAdvancedRequestSort(sortBy, order);

  // Pagination
  const pageNum = Math.max(1, parseInt(page, 10)) || 1;
  const limitNum = Math.min(100, parseInt(limit, 10)) || 20;
  const skip = (pageNum - 1) * limitNum;

  // Execute query with sorting and pagination
  const [requests, total] = await Promise.all([
    Request.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .populate('category', 'name slug')
      .populate('requester', 'fullName email')
      .populate('campus', 'name shortCode'),
    Request.countDocuments(filter)
  ]);

  // Calculate pagination info
  const pages = Math.ceil(total / limitNum);
  const hasNextPage = pageNum < pages;
  const hasPrevPage = pageNum > 1;

  res.status(200).json({
    status: 'success',
    results: requests.length,
    pagination: {
      total,
      page: pageNum,
      pages,
      limit: limitNum,
      hasNextPage,
      hasPrevPage
    },
    data: { requests }
  });
});

// Get all requests (with optional filters)
exports.getAllRequests = catchAsync(async (req, res, next) => {
  const conditions = [];

  // Filter by campus: DEFAULT to user's campus, UNLESS they explicitly request allCampuses
  if (req.query.allCampuses === 'true') {
    // User explicitly requested all campuses
    if (req.query.campus) {
      conditions.push({ campus: req.query.campus });
    }
  } else {
    // DEFAULT: Show only user's campus
    if (req.query.campus) {
      conditions.push({ campus: req.query.campus });
    } else if (req.user?.campus) {
      conditions.push({ campus: req.user.campus });
    }
  }

  // Other filters
  if (req.query.category) {
    conditions.push({ category: req.query.category });
  }
  if (req.query.requester && /^[0-9a-fA-F]{24}$/.test(req.query.requester)) {
    conditions.push({ requester: req.query.requester });
  }
  if (req.query.status) {
    conditions.push({ status: req.query.status });
  }

  // Handle search filter - search in title and description
  if (req.query.search && req.query.search.trim()) {
    const searchRegex = { $regex: req.query.search, $options: 'i' };
    conditions.push({
      $or: [
        { title: searchRegex },
        { description: searchRegex }
      ]
    });
  }

  // Build final filter using $and to combine all conditions
  let filter = {};
  if (conditions.length === 1) {
    filter = conditions[0];
  } else if (conditions.length > 1) {
    filter = { $and: conditions };
  }

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  try {
    const [requests, total] = await Promise.all([
      Request.find(filter)
        .skip(skip)
        .limit(limit)
        .sort('-createdAt')
        .populate('category', 'name slug')
        .select('title description category requester campus status priority desiredPrice createdAt analytics.views analytics.offersCount')
        .lean(), // ⚡ Returns plain JS objects (much faster for read-only queries)
      Request.countDocuments(filter)
    ]);

    res.status(200).json({
      status: 'success',
      results: requests.length,
      total,
      page,
      data: { requests }
    });
  } catch (error) {
    console.error('Error in getAllRequests:', error);
    throw error;
  }
});

// Get single request and its offers
exports.getRequest = catchAsync(async (req, res, next) => {
  let query = Request.findById(req.params.id).populate('category', 'name slug');
  
  // Handle additional population
  if (req.query.populate) {
    const fields = req.query.populate.split(',');
    fields.forEach(field => {
      if (field !== 'category') {
        query = query.populate(field);
      }
    });
  }
  
  const request = await query;
  if (!request) return next(new AppError('Request not found', 404));

  // Increment view count
  try {
    await Request.findByIdAndUpdate(
      request._id,
      { 
        $inc: { 'analytics.views': 1 },
        $set: { 'analytics.lastViewed': new Date() }
      },
      { new: false } // Don't return the old document
    );
  } catch (err) {
    console.error('Failed to increment view count:', err);
  }

  // fetch offers for this request
  const offers = await Offer.find({ request: request._id })
    .populate('seller')
    .sort('-createdAt');

  res.status(200).json({ status: 'success', data: { request, offers } });
});

// Update a request (only owner)
exports.updateRequest = catchAsync(async (req, res, next) => {
  const request = await Request.findOne({ _id: req.params.id, requester: req.user.id });
  if (!request) return next(new AppError('Request not found or not authorized', 404));

  const allowed = ['title', 'description', 'category', 'campus', 'desiredPrice', 'priority', 'tags', 'location', 'settings', 'expiresAt', 'whatsappNumber'];
  const changes = {};
  allowed.forEach(field => {
    if (req.body[field] !== undefined) {
      changes[field] = { old: request[field], new: req.body[field] };
      request[field] = req.body[field];
    }
  });

  request.history = request.history || [];
  request.history.push({ action: 'updated', timestamp: new Date(), user: req.user.id, details: 'Request updated', oldValue: Object.fromEntries(Object.entries(changes).map(([k,v]) => [k, v.old])), newValue: Object.fromEntries(Object.entries(changes).map(([k,v]) => [k, v.new])) });

  await request.save();
  res.status(200).json({ status: 'success', data: { request } });
});

// Delete a request (only owner) — soft-delete (mark closed) and cancel associated offers
exports.deleteRequest = catchAsync(async (req, res, next) => {
  const request = await Request.findOne({ _id: req.params.id, requester: req.user.id });
  if (!request) return next(new AppError('Request not found or not authorized', 404));

  // mark offers as cancelled (or remove them)
  await Offer.updateMany({ request: req.params.id, status: 'pending' }, { status: 'cancelled' });

  request.status = 'closed';
  request.history = request.history || [];
  request.history.push({ action: 'deleted', timestamp: new Date(), user: req.user.id, details: 'Request closed/deleted by owner' });
  await request.save();

  res.status(200).json({ status: 'success', data: { request } });
});

// Buyer marks request as fulfilled (only requester)
exports.markFulfilled = catchAsync(async (req, res, next) => {
  const request = await Request.findOne({ _id: req.params.id, requester: req.user.id });
  if (!request) return next(new AppError('Request not found or not authorized', 404));

  request.status = 'fulfilled';
  request.history = request.history || [];
  request.history.push({ action: 'fulfilled', timestamp: new Date(), user: req.user.id, details: 'Request marked fulfilled by requester' });
  await request.save();

  // optional: mark other offers as rejected
  await Offer.updateMany({ request: req.params.id, status: 'pending' }, { status: 'rejected' });

  res.status(200).json({ status: 'success', data: { request } });
});

// -----------------------------------------------------------------------------
// Fallback / stub handlers for routes that are referenced in the router but
// not yet fully implemented. These prevent the router from receiving
// undefined values (which causes "argument handler must be a function").
// Implement full behavior as needed later.
// -----------------------------------------------------------------------------

// Simple search that delegates to getAllRequests (keeps behavior consistent)
exports.searchRequests = catchAsync(async (req, res, next) => {
  // reuse existing listing logic
  return exports.getAllRequests(req, res, next);
});

// Request analytics: aggregated metrics over a period / filters
exports.getRequestAnalytics = catchAsync(async (req, res, next) => {
  const { period = '30d', campus, category, requester, groupBy = 'day' } = req.query;

  const now = new Date();
  let startDate;
  switch (period) {
    case '7d': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
    case '30d': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
    case '90d': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
    case '1y': startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); break;
    default: startDate = new Date(0);
  }

  const match = { createdAt: { $gte: startDate } };
  if (campus) match.campus = mongoose.Types.ObjectId.isValid(campus) ? new mongoose.Types.ObjectId(campus) : campus;
  if (category) match.category = mongoose.Types.ObjectId.isValid(category) ? new mongoose.Types.ObjectId(category) : category;
  if (requester && mongoose.Types.ObjectId.isValid(requester)) match.requester = new mongoose.Types.ObjectId(requester);

  // Aggregation pipeline
  const pipeline = [
    { $match: match },
    // lookup earliest offer per request to compute response time
    {
      $lookup: {
        from: 'offers',
        let: { requestId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$request', '$$requestId'] } } },
          { $sort: { createdAt: 1 } },
          { $limit: 1 },
          { $project: { createdAt: 1 } }
        ],
        as: 'firstOffer'
      }
    },
    {
      $addFields: {
        firstOfferAt: { $arrayElemAt: ['$firstOffer.createdAt', 0] },
        responseHours: {
          $cond: [
            { $and: [{ $gt: [{ $size: '$firstOffer' }, 0] }, { $ifNull: ['$firstOffer', false] }] },
            { $divide: [{ $subtract: [{ $arrayElemAt: ['$firstOffer.createdAt', 0] }, '$createdAt'] }, 1000 * 60 * 60] },
            null
          ]
        }
      }
    },
    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              totalRequests: { $sum: 1 },
              fulfilledCount: { $sum: { $cond: [{ $eq: ['$status', 'fulfilled'] }, 1, 0] } },
              avgViews: { $avg: '$analytics.views' },
              avgOffers: { $avg: '$analytics.offersCount' },
              avgResponseHours: { $avg: '$responseHours' }
            }
          }
        ],
        byStatus: [
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ],
        viewTrend: [
          { $project: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, views: '$analytics.views' } },
          { $group: { _id: '$date', views: { $sum: { $ifNull: ['$views', 0] } } } },
          { $sort: { _id: 1 } }
        ],
        offersTrend: [
          { $project: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, offers: '$analytics.offersCount' } },
          { $group: { _id: '$date', offers: { $sum: { $ifNull: ['$offers', 0] } } } },
          { $sort: { _id: 1 } }
        ],
        topRequestsByViews: [
          { $sort: { 'analytics.views': -1 } },
          { $limit: 10 },
          { $project: { title: 1, requester: 1, analytics: 1, createdAt: 1 } }
        ]
      }
    }
  ];

  const result = await Request.aggregate(pipeline);
  const data = result && result[0] ? result[0] : {};

  const summary = (data.summary && data.summary[0]) || { totalRequests: 0, fulfilledCount: 0, avgViews: 0, avgOffers: 0, avgResponseHours: null };
  const fulfillmentRate = summary.totalRequests > 0 ? (summary.fulfilledCount / summary.totalRequests) : 0;

  res.status(200).json({ status: 'success', data: {
    totalRequests: summary.totalRequests || 0,
    fulfilledCount: summary.fulfilledCount || 0,
    fulfillmentRate,
    avgViews: summary.avgViews || 0,
    avgOffers: summary.avgOffers || 0,
    avgResponseHours: summary.avgResponseHours || null,
    byStatus: data.byStatus || [],
    viewTrend: data.viewTrend || [],
    offersTrend: data.offersTrend || [],
    topRequestsByViews: data.topRequestsByViews || []
  } });
});

// Expired / popular / urgent stubs
exports.getExpiredRequests = catchAsync(async (req, res, next) => {
  const requests = await Request.find({ expiresAt: { $lt: new Date() } })
    .limit(50)
    .sort('-expiresAt')
    .select('title description category campus status desiredPrice createdAt expiresAt analytics.views')
    .populate('category', 'name slug')
    .lean();
  res.status(200).json({ status: 'success', results: requests.length, data: { requests } });
});

exports.getPopularRequests = catchAsync(async (req, res, next) => {
  const requests = await Request.find()
    .sort('-analytics.views')
    .limit(50)
    .select('title description category campus status desiredPrice createdAt analytics.views analytics.offersCount')
    .populate('category', 'name slug')
    .lean();
  res.status(200).json({ status: 'success', results: requests.length, data: { requests } });
});

exports.getUrgentRequests = catchAsync(async (req, res, next) => {
  const requests = await Request.find({ priority: { $in: ['urgent', 'high'] } })
    .sort('-createdAt')
    .limit(50)
    .select('title description category campus status priority desiredPrice createdAt analytics.views')
    .populate('category', 'name slug')
    .lean();
  res.status(200).json({ status: 'success', results: requests.length, data: { requests } });
});

// Listing helpers
exports.getRequestsByRequester = catchAsync(async (req, res, next) => {
  const requesterId = req.params.requesterId || req.query.requester || req.user && req.user._id;
  if (!requesterId) return next(new AppError('Requester ID not provided', 400));
  const requests = await Request.find({ requester: requesterId })
    .sort('-createdAt')
    .select('title description category campus status desiredPrice createdAt analytics.views analytics.offersCount')
    .populate('category', 'name slug')
    .lean();
  res.status(200).json({ status: 'success', results: requests.length, data: { requests } });
});

exports.getRequestsByCategory = catchAsync(async (req, res, next) => {
  const categoryId = req.params.categoryId;
  if (!categoryId) return next(new AppError('Category ID not provided', 400));
  const requests = await Request.find({ category: categoryId })
    .sort('-createdAt')
    .select('title description category campus status desiredPrice createdAt analytics.views')
    .populate('category', 'name slug')
    .lean();
  res.status(200).json({ status: 'success', results: requests.length, data: { requests } });
});

exports.getRequestsByCampus = catchAsync(async (req, res, next) => {
  const campusId = req.params.campusId;
  if (!campusId) return next(new AppError('Campus ID not provided', 400));
  const requests = await Request.find({ campus: campusId })
    .sort('-createdAt')
    .select('title description category campus status desiredPrice createdAt analytics.views')
    .populate('category', 'name slug')
    .lean();
  res.status(200).json({ status: 'success', results: requests.length, data: { requests } });
});

// Status-related operations
exports.updateRequestStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  const request = await Request.findOneAndUpdate({ _id: req.params.id }, { status }, { new: true });
  if (!request) return next(new AppError('Request not found', 404));
  res.status(200).json({ status: 'success', data: { request } });
});

exports.extendRequestExpiration = catchAsync(async (req, res, next) => {
  const { extendByDays, extendTo } = req.body;

  // Find request
  const requestDoc = await Request.findById(req.params.id);
  if (!requestDoc) return next(new AppError('Request not found', 404));

  // Only requester or admin/moderator can extend
  if (requestDoc.requester.toString() !== req.user.id && !['admin', 'moderator'].includes(req.user.role)) {
    return next(new AppError('Not authorized to extend this request', 403));
  }

  // Determine new expiry
  let newExpiresAt;
  if (extendTo) {
    const parsed = new Date(extendTo);
    if (Number.isNaN(parsed.getTime())) return next(new AppError('Invalid extendTo date', 400));
    newExpiresAt = parsed;
  } else {
    const days = parseInt(extendByDays, 10) || 7;
    if (days <= 0) return next(new AppError('extendByDays must be a positive integer', 400));
    const maxDays = 365; // cap maximum extension
    const safeDays = Math.min(days, maxDays);

    const base = requestDoc.expiresAt && requestDoc.expiresAt instanceof Date ? requestDoc.expiresAt : new Date();
    newExpiresAt = new Date(base.getTime() + safeDays * 24 * 60 * 60 * 1000);
  }

  // Update and record history
  requestDoc.expiresAt = newExpiresAt;
  requestDoc.history = requestDoc.history || [];
  requestDoc.history.push({
    action: 'extended',
    timestamp: new Date(),
    user: req.user.id,
    details: `Expiration extended to ${newExpiresAt.toISOString()}`
  });

  await requestDoc.save();

  res.status(200).json({ status: 'success', data: { request: requestDoc } });
});

exports.uploadRequestImages = catchAsync(async (req, res, next) => {
  const requestId = req.params.id;
  const requestDoc = await Request.findById(requestId);
  if (!requestDoc) return next(new AppError('Request not found', 404));

  // Only requester or admins/moderators can upload images
  if (requestDoc.requester.toString() !== req.user.id && !['admin', 'moderator'].includes(req.user.role)) {
    return next(new AppError('Not authorized to upload images for this request', 403));
  }

  // Collect images from middleware (preferred) or from body URLs
  // Middleware sets req.uploadedFiles or req.chatAttachments or req.files
  const uploaded = req.uploadedFiles || req.chatAttachments || req.uploadedImages || req.files || [];

  // If middleware didn't upload, also accept image URLs in body.images
  let formatted = [];
  if (Array.isArray(uploaded) && uploaded.length > 0) {
    // Normalize shapes from different middlewares
    formatted = uploaded.map(f => ({
      url: f.url || f.secure_url || f.path || f.toString(),
      public_id: f.public_id || f.publicId || f.publicId || null,
      originalName: f.originalname || f.originalName || f.original_filename || '',
      mimeType: f.mimeType || f.mimetype || f.format || ''
    }));
  } else if (Array.isArray(req.body.images) && req.body.images.length > 0) {
    formatted = req.body.images.map(u => ({ url: u, public_id: null, originalName: '', mimeType: '' }));
  } else {
    return next(new AppError('No images provided', 400));
  }

  // Enforce max images per request (5)
  const MAX_IMAGES = 5;
  const existingCount = Array.isArray(requestDoc.images) ? requestDoc.images.length : 0;
  if (existingCount + formatted.length > MAX_IMAGES) {
    return next(new AppError(`A maximum of ${MAX_IMAGES} images are allowed per request`, 400));
  }

  // If raw buffers were provided in req.files, upload them (handle buffers)
  if (req.files && req.files.length > 0 && (!req.uploadedFiles && !req.chatAttachments)) {
    const cloudinary = require('../config/cloudinary');
    const uploads = [];
    try {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        // Basic validation
        if (!file.mimetype.startsWith('image/')) {
          return next(new AppError(`Invalid file type: ${file.mimetype}`, 400));
        }
        const MAX_SIZE = 5 * 1024 * 1024; // 5MB
        if (file.size > MAX_SIZE) {
          return next(new AppError(`File ${file.originalname} exceeds maximum size of 5MB`, 400));
        }

        // Upload to Cloudinary
        const dataURI = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        uploads.push(new Promise((resolve, reject) => {
          cloudinary.uploader.upload(dataURI, { folder: process.env.CLOUDINARY_REQUEST_FOLDER || 'requests' }, (err, result) => {
            if (err) return reject(err);
            resolve(result);
          });
        }));
      }

      const results = await Promise.all(uploads);
      const cloudFiles = results.map(r => ({ url: r.secure_url, public_id: r.public_id, originalName: r.original_filename || '', mimeType: r.format || '' }));
      formatted = formatted.concat(cloudFiles);
    } catch (err) {
      // Try cleanup of any uploaded files
      try {
        const cloudinary = require('../config/cloudinary');
        // Attempt to remove any partial uploads (best-effort)
        if (Array.isArray(formatted)) {
          await Promise.all(formatted.map(f => f.public_id ? cloudinary.uploader.destroy(f.public_id).catch(()=>null) : Promise.resolve()));
        }
      } catch (cleanupErr) {
        console.error('Failed to cleanup partial uploads', cleanupErr);
      }
      return next(new AppError(err.message || 'Image upload failed', 500));
    }
  }

  // Persist images to request
  try {
    requestDoc.images = (requestDoc.images || []).concat(formatted.map(f => f.url));
    requestDoc.images_meta = (requestDoc.images_meta || []).concat(formatted.map(f => ({ url: f.url, public_id: f.public_id })));
    requestDoc.history = requestDoc.history || [];
    requestDoc.history.push({ action: 'images_uploaded', timestamp: new Date(), user: req.user.id, details: `Uploaded ${formatted.length} images` });
    await requestDoc.save();
  } catch (err) {
    return next(new AppError(err.message || 'Failed to save request images', 500));
  }

  res.status(200).json({ status: 'success', data: { request: requestDoc } });
});

exports.getRequestHistory = catchAsync(async (req, res, next) => {
  const requestId = req.params.id;
  const { page = 1, limit = 20, action, startDate, endDate } = req.query;
  const requestDoc = await Request.findById(requestId).select('history');
  if (!requestDoc) return next(new AppError('Request not found', 404));

  // populate user references in history entries
  await requestDoc.populate({ path: 'history.user', select: 'fullName email role' });

  let history = Array.isArray(requestDoc.history) ? requestDoc.history.slice() : [];

  // filter by action
  if (action) history = history.filter(h => h.action === action);

  // filter by date range
  if (startDate) {
    const s = new Date(startDate);
    if (!Number.isNaN(s.getTime())) history = history.filter(h => new Date(h.timestamp) >= s);
  }
  if (endDate) {
    const e = new Date(endDate);
    if (!Number.isNaN(e.getTime())) history = history.filter(h => new Date(h.timestamp) <= e);
  }

  // sort desc
  history.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));

  // paginate
  const p = parseInt(page, 10) || 1;
  const l = parseInt(limit, 10) || 20;
  const start = (p - 1) * l;
  const paged = history.slice(start, start + l);

  res.status(200).json({ status: 'success', results: history.length, page: p, limit: l, data: { history: paged } });
});

// Bulk operations
exports.bulkDeleteRequests = catchAsync(async (req, res, next) => {
  const { requestIds } = req.body;
  if (!Array.isArray(requestIds) || requestIds.length === 0) return next(new AppError('No request IDs provided', 400));
  await Request.deleteMany({ _id: { $in: requestIds } });
  res.status(200).json({ status: 'success', message: 'Requests deleted' });
});

exports.bulkUpdateRequestStatus = catchAsync(async (req, res, next) => {
  const { requestIds, status } = req.body;
  if (!Array.isArray(requestIds) || requestIds.length === 0) return next(new AppError('No request IDs provided', 400));
  await Request.updateMany({ _id: { $in: requestIds } }, { status });
  res.status(200).json({ status: 'success', message: 'Requests updated' });
});

// Build advanced filter for requests
const buildAdvancedRequestFilter = (filters) => {
  const {
    search, category, requester, campus, status, minPrice, maxPrice,
    minResponseTime, maxResponseTime, minViews, maxViews, minOffers, maxOffers,
    priority, hasImages, tags, expiringIn, fulfilled, popularity
  } = filters;

  const filter = {};

  // Text search across title and description
  if (search && search.trim()) {
    filter.$text = { $search: search.trim() };
  }

  // Status filter
  if (status) {
    const statuses = Array.isArray(status) ? status : [status];
    if (statuses.length === 1) {
      filter.status = statuses[0];
    } else if (statuses.length > 1) {
      filter.status = { $in: statuses };
    }
  }

  // Category filter
  if (category) {
    const categories = Array.isArray(category) ? category : [category];
    filter.category = categories.length === 1 ? categories[0] : { $in: categories };
  }

  // Campus filter
  if (campus) {
    const campuses = Array.isArray(campus) ? campus : [campus];
    filter.campus = campuses.length === 1 ? campuses[0] : { $in: campuses };
  }

  // Requester filter
  if (requester && /^[0-9a-fA-F]{24}$/.test(requester)) {
    filter.requester = requester;
  }

  // Price range filter
  const priceRange = {};
  if (minPrice !== undefined && minPrice !== '') {
    priceRange.$gte = Math.max(0, parseFloat(minPrice));
  }
  if (maxPrice !== undefined && maxPrice !== '') {
    priceRange.$lte = Math.max(0, parseFloat(maxPrice));
  }
  if (Object.keys(priceRange).length > 0) {
    filter.desiredPrice = priceRange;
  }

  // Views filter
  const viewsRange = {};
  if (minViews !== undefined && minViews !== '') {
    viewsRange.$gte = Math.max(0, parseInt(minViews, 10));
  }
  if (maxViews !== undefined && maxViews !== '') {
    viewsRange.$lte = Math.max(0, parseInt(maxViews, 10));
  }
  if (Object.keys(viewsRange).length > 0) {
    filter['analytics.views'] = viewsRange;
  }

  // Offers count filter
  const offersRange = {};
  if (minOffers !== undefined && minOffers !== '') {
    offersRange.$gte = Math.max(0, parseInt(minOffers, 10));
  }
  if (maxOffers !== undefined && maxOffers !== '') {
    offersRange.$lte = Math.max(0, parseInt(maxOffers, 10));
  }
  if (Object.keys(offersRange).length > 0) {
    filter['analytics.offersCount'] = offersRange;
  }

  // Response time filter (in hours)
  const respTimeRange = {};
  if (minResponseTime !== undefined && minResponseTime !== '') {
    respTimeRange.$gte = Math.max(0, parseFloat(minResponseTime));
  }
  if (maxResponseTime !== undefined && maxResponseTime !== '') {
    respTimeRange.$lte = Math.max(0, parseFloat(maxResponseTime));
  }
  if (Object.keys(respTimeRange).length > 0) {
    filter['analytics.responseTime'] = respTimeRange;
  }

  // Priority filter
  if (priority) {
    const priorities = Array.isArray(priority) ? priority : [priority];
    filter.priority = priorities.length === 1 ? priorities[0] : { $in: priorities };
  }

  // Tags filter
  if (tags) {
    const tagArray = Array.isArray(tags) ? tags : [tags];
    filter.tags = { $in: tagArray };
  }

  // Images filter
  if (hasImages === 'true' || hasImages === true) {
    filter.images = { $exists: true, $ne: [] };
  } else if (hasImages === 'false' || hasImages === false) {
    filter.$or = [{ images: { $exists: false } }, { images: [] }];
  }

  // Expiration filter (expiringIn hours)
  if (expiringIn && expiringIn !== '') {
    const hours = parseInt(expiringIn, 10);
    if (hours > 0) {
      const now = new Date();
      const expirationThreshold = new Date(now.getTime() + hours * 60 * 60 * 1000);
      filter.expiresAt = { $lte: expirationThreshold, $gt: now };
    }
  }

  // Fulfilled filter
  if (fulfilled === 'true' || fulfilled === true) {
    filter.status = 'fulfilled';
  } else if (fulfilled === 'false' || fulfilled === false) {
    filter.status = { $ne: 'fulfilled' };
  }

  // Popularity filter (high views and offers)
  if (popularity === 'high') {
    filter['analytics.views'] = { $gte: 50 };
    filter['analytics.offersCount'] = { $gte: 5 };
  } else if (popularity === 'medium') {
    filter['analytics.views'] = { $gte: 20, $lt: 50 };
    filter['analytics.offersCount'] = { $gte: 2, $lt: 5 };
  }

  return filter;
};

// Build sort object for requests
const buildAdvancedRequestSort = (sortBy, order) => {
  const sortObj = {};
  const orderValue = order === 'asc' ? 1 : -1;

  switch (sortBy) {
    case 'newest':
      sortObj.createdAt = -1;
      break;
    case 'oldest':
      sortObj.createdAt = 1;
      break;
    case 'priceAsc':
      sortObj.desiredPrice = 1;
      break;
    case 'priceDesc':
      sortObj.desiredPrice = -1;
      break;
    case 'views':
      sortObj['analytics.views'] = -1;
      break;
    case 'offers':
      sortObj['analytics.offersCount'] = -1;
      break;
    case 'priority':
      // Sort by priority (urgent > high > medium > low)
      sortObj.priority = 1;
      break;
    case 'responseTime':
      sortObj['analytics.responseTime'] = 1;
      break;
    case 'expiringsoon':
      sortObj.expiresAt = 1;
      break;
    case 'fulfillmentRate':
      sortObj['analytics.fulfillmentRate'] = -1;
      break;
    case 'trending':
      // Combine views and recent date
      sortObj['analytics.views'] = -1;
      sortObj.createdAt = -1;
      break;
    case 'mostOffers':
      sortObj['analytics.offersCount'] = -1;
      break;
    case 'leastOffers':
      sortObj['analytics.offersCount'] = 1;
      break;
    default:
      sortObj.createdAt = orderValue;
  }

  return sortObj;
};

// ===== SEARCH ENDPOINTS =====

/**
 * Get search suggestions based on query
 * GET /api/v1/requests/search/suggestions?query=keyword
 */
exports.getSearchSuggestions = catchAsync(async (req, res, next) => {
  const { query } = req.query;
  
  if (!query || query.length < 2) {
    return res.status(200).json({
      status: 'success',
      data: []
    });
  }

  const suggestions = await Request.find(
    {
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    },
    { title: 1, _id: 1 }
  )
    .limit(10)
    .sort({ 'analytics.views': -1 })
    .lean();

  const formattedSuggestions = suggestions.map((req) => ({
    title: req.title,
    query: req.title,
    id: req._id
  }));

  res.status(200).json({
    status: 'success',
    data: formattedSuggestions
  });
});

/**
 * Get popular searches based on search history
 * GET /api/v1/requests/search/popular
 */
exports.getPopularSearches = catchAsync(async (req, res, next) => {
  const popularSearches = await RequestSearchHistory.aggregate([
    {
      $group: {
        _id: '$query',
        searchCount: { $sum: '$searchCount' },
        lastSearched: { $max: '$createdAt' }
      }
    },
    { $sort: { searchCount: -1, lastSearched: -1 } },
    { $limit: 10 }
  ]);

  const formatted = popularSearches.map((item) => ({
    query: item._id,
    searchCount: item.searchCount
  }));

  res.status(200).json({
    status: 'success',
    data: formatted
  });
});

/**
 * Get user's search history
 * GET /api/v1/requests/search/history
 */
exports.getSearchHistory = catchAsync(async (req, res, next) => {
  const history = await RequestSearchHistory.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const formatted = history.map((item) => ({
    id: item._id,
    query: item.query,
    timestamp: item.createdAt
  }));

  res.status(200).json({
    status: 'success',
    data: formatted
  });
});

/**
 * Save search to history
 * POST /api/v1/requests/search/history
 */
exports.saveSearchHistory = catchAsync(async (req, res, next) => {
  const { query } = req.body;

  if (!query || query.trim().length < 2) {
    return next(new AppError('Search query must be at least 2 characters', 400));
  }

  const trimmedQuery = query.trim();

  // Try to update existing entry, or create new one
  const searchEntry = await RequestSearchHistory.findOneAndUpdate(
    { user: req.user.id, query: trimmedQuery },
    {
      user: req.user.id,
      query: trimmedQuery,
      $inc: { searchCount: 1 },
      updatedAt: new Date()
    },
    { upsert: true, new: true }
  );

  res.status(201).json({
    status: 'success',
    data: {
      id: searchEntry._id,
      query: searchEntry.query
    }
  });
});

/**
 * Delete specific search history entry
 * DELETE /api/v1/requests/search/history/:id
 */
exports.deleteSearchHistoryEntry = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const entry = await RequestSearchHistory.findOneAndDelete({
    _id: id,
    user: req.user.id
  });

  if (!entry) {
    return next(new AppError('Search history entry not found', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Search history entry deleted'
  });
});

/**
 * Clear all search history for current user
 * DELETE /api/v1/requests/search/history
 */
exports.clearSearchHistory = catchAsync(async (req, res, next) => {
  await RequestSearchHistory.deleteMany({ user: req.user.id });

  res.status(200).json({
    status: 'success',
    message: 'All search history cleared'
  });
});



