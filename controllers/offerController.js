const Offer = require('../models/offerModel');
const Request = require('../models/requestModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const OrderController = require('./orderController');
const APIFeatures = require('../utils/apiFeatures');
const { sendToUser } = require('../socketManager'); // adjust path if needed

// Sellers create an offer for a buyer's request
exports.createOffer = catchAsync(async (req, res, next) => {
  const { request: requestId, product: productId, amount, message, settings } = req.body;

  if (!requestId || !amount) return next(new AppError('Request ID and amount are required', 400));

  const requestDoc = await Request.findById(requestId);
  if (!requestDoc) return next(new AppError('Request not found', 404));
  if (requestDoc.status !== 'open') return next(new AppError('Cannot make offers on a closed/fulfilled request', 400));

  // Check if seller already has an offer for this request
  const existingOffer = await Offer.findOne({ 
    request: requestId, 
    seller: req.user.id, 
    status: 'pending' 
  });
  
  if (existingOffer) {
    return next(new AppError('You already have a pending offer for this request', 400));
  }

  const offerData = {
    request: requestId,
    product: productId,
    seller: req.user.id,
    amount,
    message,
    settings: settings || {}
  };

  const offer = await Offer.create(offerData);

  // Add creation to history
  offer.history.push({
    action: 'created',
    timestamp: new Date(),
    user: req.user.id,
    details: 'Offer created'
  });
  await offer.save();

  // Increment offers count on request
  try {
    await Request.findByIdAndUpdate(
      requestId,
      { $inc: { 'analytics.offersCount': 1 } },
      { new: true }
    );
  } catch (err) {
    console.error('Failed to update request offers count:', err);
  }

  // Notify the requester about the new offer
  try {
    const Notification = require('../models/notificationModel');
    const requestDoc = await Request.findById(requestId).populate('requester', 'fullName');
    
    // Create database notification
    const notification = await Notification.create({
      user: requestDoc.requester._id,
      title: 'New Offer Received',
      message: `${req.user.fullName || 'A seller'} made an offer of $${amount} for your request: ${requestDoc.title}`,
      type: 'offer',
      category: 'info',
      priority: 'normal',
      data: { 
        offerId: offer._id, 
        requestId: requestId, 
        sellerId: req.user.id,
        amount: offer.amount 
      },
      channels: ['in_app', 'push']
    });
    
    // Send real-time notification
    sendToUser(requestDoc.requester._id.toString(), 'newOffer', {
      message: `New offer received for your request: ${requestDoc.title}`,
      offerId: offer._id,
      requestId: requestId,
      amount: offer.amount,
      notificationId: notification._id
    });
  } catch (err) {
    console.error('Failed to send offer notification:', err);
  }

  res.status(201).json({ status: 'success', data: { offer } });
});

// Get all offers with advanced filtering and search
exports.getAllOffers = catchAsync(async (req, res) => {
  // Build campus filter: DEFAULT to user's campus, UNLESS they explicitly request allCampuses
  const campusFilter = {};
  if (req.query.allCampuses === 'true') {
    // User explicitly requested all campuses
    // For offers, we need to filter through the related request's campus
    // This will be handled in the query if campus is provided
  } else {
    // DEFAULT: Show only user's campus
    // Get all requests from user's campus first
    if (req.user?.campus) {
      const userCampusRequests = await require('../models/requestModel').find(
        { campus: req.user.campus },
        { _id: 1 }
      );
      const requestIds = userCampusRequests.map(r => r._id);
      campusFilter.request = { $in: requestIds };
    }
  }

  const features = new APIFeatures(
    require('../models/offerModel').find(campusFilter),
    req.query
  )
    .filter()
    .search()
    .sort()
    .limitFields()
    .paginate();

  const offers = await features.query;

  res.status(200).json({ 
    status: 'success', 
    results: offers.length, 
    data: { offers } 
  });
});

// Get single offer with view tracking
exports.getOffer = catchAsync(async (req, res, next) => {
  const offer = await Offer.findById(req.params.id)
    .populate('request', 'title description status requester')
    .populate('product', 'name price images');
    
  if (!offer) return next(new AppError('Offer not found', 404));
  
  // Increment view count
  await offer.incrementViews();
  
  res.status(200).json({ status: 'success', data: { offer } });
});

// Seller withdraws their offer
exports.withdrawOffer = catchAsync(async (req, res, next) => {
  const { reason } = req.body;
  
  const offer = await Offer.findOneAndUpdate(
    { _id: req.params.id, seller: req.user.id, status: 'pending' },
    { status: 'withdrawn', reason },
    { new: true }
  );
  
  if (!offer) return next(new AppError('Offer not found or not allowed to withdraw', 404));
  
  // Add withdrawal to history
  offer.history.push({
    action: 'withdrawn',
    timestamp: new Date(),
    user: req.user.id,
    details: reason || 'Offer withdrawn by seller'
  });
  await offer.save();

  // Decrement offers count on request
  try {
    await Request.findByIdAndUpdate(
      offer.request,
      { $inc: { 'analytics.offersCount': -1 } },
      { new: true }
    );
  } catch (err) {
    console.error('Failed to update request offers count:', err);
  }
  
  res.status(200).json({ status: 'success', data: { offer } });
});

// Buyer (request owner) accepts an offer
exports.acceptOffer = catchAsync(async (req, res, next) => {
  // 1️⃣ Find the offer
  const offer = await Offer.findById(req.params.id)
    .populate('seller', 'fullName')
    .populate('request');
  if (!offer) return next(new AppError('Offer not found', 404));

  // 2️⃣ Find the related request
  const requestDoc = await Request.findById(offer.request).populate('requester', 'fullName');
  if (!requestDoc) return next(new AppError('Related request not found', 404));

  // 3️⃣ Authorization check — only the requester can accept
  if (String(requestDoc.requester._id) !== String(req.user.id))
    return next(new AppError('Not authorized to accept this offer', 403));

  // 4️⃣ Ensure request is open
  if (requestDoc.status !== 'open')
    return next(new AppError('Request is not open', 400));

  // 5️⃣ Accept this offer
  offer.status = 'accepted';
  await offer.save();

  // 6️⃣ Mark the request as fulfilled
  requestDoc.status = 'fulfilled';
  await requestDoc.save();

  // 7️⃣ Reject other offers for this request
  await Offer.updateMany(
    { request: offer.request, _id: { $ne: offer._id }, status: 'pending' },
    { status: 'rejected' }
  );

  // 8️⃣ Create order automatically
  const order = await OrderController.createOrderFromOffer(offer._id);

  // 9️⃣ Emit real-time socket notifications and create database notifications
  const Notification = require('../models/notificationModel');
  const buyerId = requestDoc.requester._id.toString();
  const sellerId = offer.seller._id.toString();

  // Create notification for seller
  const sellerNotification = await Notification.create({
    user: offer.seller._id,
    title: 'Offer Accepted!',
    message: `${requestDoc.requester.fullName} accepted your offer of $${offer.amount} for "${requestDoc.title}"`,
    type: 'offer',
    category: 'success',
    priority: 'high',
    data: { 
      offerId: offer._id, 
      requestId: requestDoc._id, 
      orderId: order._id,
      buyerId: requestDoc.requester._id
    },
    channels: ['in_app', 'push', 'email']
  });

  // Create notification for buyer
  const buyerNotification = await Notification.create({
    user: requestDoc.requester._id,
    title: 'Offer Accepted',
    message: `You accepted ${offer.seller.fullName}'s offer of $${offer.amount} for "${requestDoc.title}"`,
    type: 'offer',
    category: 'success',
    priority: 'normal',
    data: { 
      offerId: offer._id, 
      requestId: requestDoc._id, 
      orderId: order._id,
      sellerId: offer.seller._id
    },
    channels: ['in_app', 'push']
  });

  // Send real-time notifications
  sendToUser(buyerId, 'offerAccepted', {
    message: `You accepted an offer from ${offer.seller.fullName}`,
    offerId: offer._id,
    requestId: requestDoc._id,
    orderId: order._id,
    notificationId: buyerNotification._id
  });

  sendToUser(sellerId, 'offerAccepted', {
    message: `${requestDoc.requester.fullName} accepted your offer!`,
    offerId: offer._id,
    requestId: requestDoc._id,
    orderId: order._id,
    notificationId: sellerNotification._id
  });

  // 🔟 Respond to the client
  res.status(200).json({
    status: 'success',
    data: { offer, order }
  });
});


// Buyer rejects an offer
exports.rejectOffer = catchAsync(async (req, res, next) => {
  const { reason } = req.body;
  
  const offer = await Offer.findById(req.params.id);
  if (!offer) return next(new AppError('Offer not found', 404));

  const requestDoc = await Request.findById(offer.request);
  if (!requestDoc) return next(new AppError('Related request not found', 404));
  if (String(requestDoc.requester._id) !== String(req.user.id)) return next(new AppError('Not authorized to reject this offer', 403));

  await offer.updateStatus('rejected', reason, req.user.id);
  await offer.calculateResponseTime();

  // Notify the seller about offer rejection
  try {
    const Notification = require('../models/notificationModel');
    const seller = await User.findById(offer.seller);
    
    const notification = await Notification.create({
      user: offer.seller,
      title: 'Offer Rejected',
      message: `${req.user.fullName || 'A buyer'} rejected your offer${reason ? `: ${reason}` : ''}`,
      type: 'offer',
      category: 'warning',
      priority: 'normal',
      data: { 
        offerId: offer._id, 
        requestId: requestDoc._id, 
        buyerId: req.user.id,
        reason: reason || null
      },
      channels: ['in_app', 'push']
    });
    
    // Send real-time notification
    sendToUser(offer.seller.toString(), 'offerRejected', {
      message: `Your offer was rejected${reason ? `: ${reason}` : ''}`,
      offerId: offer._id,
      requestId: requestDoc._id,
      notificationId: notification._id
    });
  } catch (err) {
    console.error('Failed to send offer rejection notification:', err);
  }

  // Decrement offers count on request
  try {
    await Request.findByIdAndUpdate(
      offer.request,
      { $inc: { 'analytics.offersCount': -1 } },
      { new: true }
    );
  } catch (err) {
    console.error('Failed to update request offers count:', err);
  }

  res.status(200).json({ status: 'success', data: { offer } });
});

// Update offer (seller only)
exports.updateOffer = catchAsync(async (req, res, next) => {
  const { amount, message, settings } = req.body;
  
  const offer = await Offer.findOneAndUpdate(
    { _id: req.params.id, seller: req.user.id, status: 'pending' },
    { amount, message, settings },
    { new: true, runValidators: true }
  );
  
  if (!offer) return next(new AppError('Offer not found or not allowed to update', 404));
  
  // Add update to history
  offer.history.push({
    action: 'updated',
    timestamp: new Date(),
    user: req.user.id,
    details: 'Offer updated by seller'
  });
  await offer.save();
  
  res.status(200).json({ status: 'success', data: { offer } });
});

// Search offers with advanced filtering
exports.searchOffers = catchAsync(async (req, res) => {
  const { q, status, seller, request, minAmount, maxAmount, sortBy, sortOrder } = req.query;
  
  const filters = {};
  if (status) filters.status = status;
  if (seller) filters.seller = seller;
  if (request) filters.request = request;
  if (minAmount) filters.minAmount = parseFloat(minAmount);
  if (maxAmount) filters.maxAmount = parseFloat(maxAmount);
  
  const offers = await Offer.searchOffers(q, filters);
  
  // Apply sorting
  if (sortBy) {
    const sortOrderValue = sortOrder === 'desc' ? -1 : 1;
    offers.sort((a, b) => {
      if (sortBy === 'amount') return (a.amount - b.amount) * sortOrderValue;
      if (sortBy === 'createdAt') return (new Date(a.createdAt) - new Date(b.createdAt)) * sortOrderValue;
      if (sortBy === 'updatedAt') return (new Date(a.updatedAt) - new Date(b.updatedAt)) * sortOrderValue;
      return 0;
    });
  }
  
  res.status(200).json({ 
    status: 'success', 
    results: offers.length, 
    data: { offers } 
  });
});

// Get offers by seller
exports.getOffersBySeller = catchAsync(async (req, res) => {
  const { status } = req.query;
  const sellerId = req.params.sellerId || req.user.id;
  
  const offers = await Offer.getOffersBySeller(sellerId, status);
  
  res.status(200).json({ 
    status: 'success', 
    results: offers.length, 
    data: { offers } 
  });
});

// Get offers by request
exports.getOffersByRequest = catchAsync(async (req, res) => {
  const requestId = req.params.requestId;
  
  const offers = await Offer.getOffersByRequest(requestId);
  
  res.status(200).json({ 
    status: 'success', 
    results: offers.length, 
    data: { offers } 
  });
});

// Get all offers received by the current user (for their requests)
exports.getOffersReceivedByMe = catchAsync(async (req, res) => {
  const RequestModel = require('../models/requestModel');
  const APIFeatures = require('../utils/apiFeatures');
  
  // Get all requests created by the current user
  const myRequests = await RequestModel.find({ requester: req.user.id }, { _id: 1 });
  const requestIds = myRequests.map(r => r._id);
  
  console.log('🔍 getOffersReceivedByMe:');
  console.log('   Current user ID:', req.user.id);
  console.log('   My requests count:', myRequests.length);
  console.log('   Request IDs:', requestIds);
  
  // Get all offers for those requests with campus filtering
  const campusFilter = { request: { $in: requestIds } };
  
  const features = new APIFeatures(
    Offer.find(campusFilter),
    req.query
  )
    .filter()
    .search()
    .sort()
    .limitFields()
    .paginate();

  const offers = await features.query;
  
  console.log('   Total offers received:', offers.length);
  
  res.status(200).json({ 
    status: 'success', 
    results: offers.length, 
    data: { offers } 
  });
});


// Get offer analytics
exports.getOfferAnalytics = catchAsync(async (req, res) => {
  const { period = '30d', seller, request } = req.query;
  const sellerId = seller || req.user.id;
  
  const analytics = await Offer.getAnalytics(sellerId, period);
  
  // Get additional metrics
  const totalOffers = await Offer.countDocuments({ seller: sellerId });
  const pendingOffers = await Offer.countDocuments({ seller: sellerId, status: 'pending' });
  const acceptedOffers = await Offer.countDocuments({ seller: sellerId, status: 'accepted' });
  const rejectedOffers = await Offer.countDocuments({ seller: sellerId, status: 'rejected' });
  
  const acceptanceRate = totalOffers > 0 ? (acceptedOffers / totalOffers) * 100 : 0;
  
  res.status(200).json({ 
    status: 'success', 
    data: { 
      analytics,
      summary: {
        totalOffers,
        pendingOffers,
        acceptedOffers,
        rejectedOffers,
        acceptanceRate: Math.round(acceptanceRate * 100) / 100
      }
    } 
  });
});

// Bulk withdraw offers
exports.bulkWithdrawOffers = catchAsync(async (req, res) => {
  const { offerIds, reason } = req.body;
  
  const offers = await Offer.find({ 
    _id: { $in: offerIds }, 
    seller: req.user.id, 
    status: 'pending' 
  });
  
  if (offers.length === 0) {
    return next(new AppError('No valid offers found to withdraw', 404));
  }
  
  const updatePromises = offers.map(offer => {
    offer.status = 'withdrawn';
    offer.reason = reason;
    offer.history.push({
      action: 'withdrawn',
      timestamp: new Date(),
      user: req.user.id,
      details: reason || 'Bulk withdrawal by seller'
    });
    return offer.save();
  });
  
  await Promise.all(updatePromises);
  
  res.status(200).json({ 
    status: 'success', 
    message: `${offers.length} offers withdrawn successfully`,
    data: { withdrawnCount: offers.length } 
  });
});

// Bulk reject offers (buyer)
exports.bulkRejectOffers = catchAsync(async (req, res) => {
  const { offerIds, reason } = req.body;
  
  const offers = await Offer.find({ 
    _id: { $in: offerIds }, 
    status: 'pending' 
  }).populate('request', 'requester');
  
  // Check if user is authorized to reject these offers
  const unauthorizedOffers = offers.filter(offer => 
    offer.request.requester.toString() !== req.user.id
  );
  
  if (unauthorizedOffers.length > 0) {
    return next(new AppError('You can only reject offers for your own requests', 403));
  }
  
  const updatePromises = offers.map(offer => {
    offer.status = 'rejected';
    offer.reason = reason;
    offer.history.push({
      action: 'rejected',
      timestamp: new Date(),
      user: req.user.id,
      details: reason || 'Bulk rejection by buyer'
    });
    return offer.save();
  });
  
  await Promise.all(updatePromises);
  
  res.status(200).json({ 
    status: 'success', 
    message: `${offers.length} offers rejected successfully`,
    data: { rejectedCount: offers.length } 
  });
});

// Extend offer expiration
exports.extendOfferExpiration = catchAsync(async (req, res, next) => {
  const { days = 7 } = req.body;
  
  const offer = await Offer.findOne({ 
    _id: req.params.id, 
    seller: req.user.id, 
    status: 'pending' 
  });
  
  if (!offer) return next(new AppError('Offer not found or not allowed to extend', 404));
  
  await offer.extendExpiration(days);
  
  res.status(200).json({ 
    status: 'success', 
    message: `Offer expiration extended by ${days} days`,
    data: { offer } 
  });
});

// Get expired offers
exports.getExpiredOffers = catchAsync(async (req, res) => {
  const offers = await Offer.getExpiredOffers();
  
  res.status(200).json({ 
    status: 'success', 
    results: offers.length, 
    data: { offers } 
  });
});

// Get offer history
exports.getOfferHistory = catchAsync(async (req, res, next) => {
  const offer = await Offer.findById(req.params.id);
  
  if (!offer) return next(new AppError('Offer not found', 404));
  
  // Check if user can view history
  const canView = offer.seller.toString() === req.user.id || 
                  req.user.role === 'admin' ||
                  (offer.request && offer.request.requester.toString() === req.user.id);
  
  if (!canView) {
    return next(new AppError('Not authorized to view offer history', 403));
  }
  
  res.status(200).json({ 
    status: 'success', 
    data: { history: offer.history } 
  });
});

// Advanced filter and sort offers with comprehensive options
exports.advancedSearchOffers = catchAsync(async (req, res, next) => {
  const {
    search,
    request,
    seller,
    status = 'pending',
    minAmount,
    maxAmount,
    minViews,
    maxViews,
    minResponseTime,
    maxResponseTime,
    sortBy = 'createdAt',
    order = 'desc',
    page = 1,
    limit = 20,
    expiringIn,
    acceptanceRate,
    autoExpire
  } = req.query;

  // Build advanced filter
  const filter = buildAdvancedOfferFilter({
    search, request, seller, status, minAmount, maxAmount,
    minViews, maxViews, minResponseTime, maxResponseTime,
    expiringIn, acceptanceRate, autoExpire
  });

  // Build sort object
  const sortObj = buildAdvancedOfferSort(sortBy, order);

  // Pagination
  const pageNum = Math.max(1, parseInt(page, 10)) || 1;
  const limitNum = Math.min(100, parseInt(limit, 10)) || 20;
  const skip = (pageNum - 1) * limitNum;

  // Execute query with sorting and pagination
  const [offers, total] = await Promise.all([
    Offer.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .populate('request', 'title category requester')
      .populate('seller', 'fullName email')
      .populate('product', 'name'),
    Offer.countDocuments(filter)
  ]);

  // Calculate pagination info
  const pages = Math.ceil(total / limitNum);
  const hasNextPage = pageNum < pages;
  const hasPrevPage = pageNum > 1;

  res.status(200).json({
    status: 'success',
    results: offers.length,
    pagination: {
      total,
      page: pageNum,
      pages,
      limit: limitNum,
      hasNextPage,
      hasPrevPage
    },
    data: { offers }
  });
});

// Build advanced filter for offers
const buildAdvancedOfferFilter = (filters) => {
  const {
    search, request, seller, status, minAmount, maxAmount,
    minViews, maxViews, minResponseTime, maxResponseTime,
    expiringIn, acceptanceRate, autoExpire
  } = filters;

  const filter = {};

  // Status filter
  if (status) {
    const statuses = Array.isArray(status) ? status : [status];
    if (statuses.length === 1) {
      filter.status = statuses[0];
    } else if (statuses.length > 1) {
      filter.status = { $in: statuses };
    }
  }

  // Request filter
  if (request && /^[0-9a-fA-F]{24}$/.test(request)) {
    filter.request = request;
  }

  // Seller filter
  if (seller && /^[0-9a-fA-F]{24}$/.test(seller)) {
    filter.seller = seller;
  }

  // Amount range filter
  const amountRange = {};
  if (minAmount !== undefined && minAmount !== '') {
    amountRange.$gte = Math.max(0, parseFloat(minAmount));
  }
  if (maxAmount !== undefined && maxAmount !== '') {
    amountRange.$lte = Math.max(0, parseFloat(maxAmount));
  }
  if (Object.keys(amountRange).length > 0) {
    filter.amount = amountRange;
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

  // Text search in message field
  if (search && search.trim()) {
    filter.$text = { $search: search.trim() };
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

  // Acceptance rate filter
  if (acceptanceRate) {
    if (acceptanceRate === 'high') {
      filter['analytics.acceptanceRate'] = { $gte: 0.7 };
    } else if (acceptanceRate === 'medium') {
      filter['analytics.acceptanceRate'] = { $gte: 0.4, $lt: 0.7 };
    } else if (acceptanceRate === 'low') {
      filter['analytics.acceptanceRate'] = { $lt: 0.4 };
    }
  }

  // Auto-expire setting filter
  if (autoExpire === 'true' || autoExpire === true) {
    filter['settings.autoExpire'] = true;
  } else if (autoExpire === 'false' || autoExpire === false) {
    filter['settings.autoExpire'] = false;
  }

  return filter;
};

// Build sort object for offers
const buildAdvancedOfferSort = (sortBy, order) => {
  const sortObj = {};
  const orderValue = order === 'asc' ? 1 : -1;

  switch (sortBy) {
    case 'newest':
      sortObj.createdAt = -1;
      break;
    case 'oldest':
      sortObj.createdAt = 1;
      break;
    case 'amountAsc':
      sortObj.amount = 1;
      break;
    case 'amountDesc':
      sortObj.amount = -1;
      break;
    case 'views':
      sortObj['analytics.views'] = -1;
      break;
    case 'responseTime':
      sortObj['analytics.responseTime'] = 1;
      break;
    case 'acceptanceRate':
      sortObj['analytics.acceptanceRate'] = -1;
      break;
    case 'expiringsoon':
      sortObj.expiresAt = 1;
      break;
    case 'pending':
      // Prioritize pending offers first
      sortObj.status = 1;
      sortObj.createdAt = -1;
      break;
    case 'trending':
      // Combine views and recent date
      sortObj['analytics.views'] = -1;
      sortObj.createdAt = -1;
      break;
    case 'mostViewed':
      sortObj['analytics.views'] = -1;
      break;
    case 'leastViewed':
      sortObj['analytics.views'] = 1;
      break;
    default:
      sortObj.createdAt = orderValue;
  }

  return sortObj;
};


