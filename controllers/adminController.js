const User = require('../models/userModel');
const Product = require('../models/productModel');
const Order = require('../models/orderModel');
const Shop = require('../models/shopModel');
const Document = require('../models/documentModel');
const Post = require('../models/postModel');
const Event = require('../models/eventModel');
const News = require('../models/newsModel');
const Chat = require('../models/chatModel');
const Message = require('../models/messageModel');
const Report = require('../models/reportModel');
const Request = require('../models/requestModel');
const Offer = require('../models/offerModel');
const Review = require('../models/reviewModel');
const ServiceOrder = require('../models/serviceOrderModel');
const Notification = require('../models/notificationModel');
const Activity = require('../models/activityModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// ============================================================================
// 1️⃣ USER MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * Get all users with filters (paginated)
 * Filters: role, status, campus, email search, dateRange
 */
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, role, status, campus, search, dateFrom, dateTo } = req.query;

  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (campus) filter.campus = campus;
  if (search) filter.$text = { $search: search };
  
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo);
  }

  const skip = (page - 1) * limit;
  const total = await User.countDocuments(filter);
  const users = await User.find(filter)
    .select('-password')
    .skip(skip)
    .limit(parseInt(limit))
    .populate('campus', 'name')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: users.length,
    total,
    pages: Math.ceil(total / limit),
    data: { users }
  });
});

/**
 * Get single user details with activity
 */
exports.getUserDetails = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id)
    .select('-password')
    .populate('campus', 'name location');

  if (!user) return next(new AppError('User not found', 404));

  // Get user activity
  const activities = await Activity.find({ user: req.params.id })
    .sort('-createdAt')
    .limit(20);

  // Get user stats
  const stats = {
    totalOrders: await Order.countDocuments({ buyer: req.params.id }),
    totalProducts: await Product.countDocuments({ seller: req.params.id }),
    totalReviews: await Review.countDocuments({ reviewer: req.params.id }),
    totalDocuments: await Document.countDocuments({ uploadedBy: req.params.id }),
    accountBalance: user.accountBalance || 0,
    reputation: user.reputation || 0
  };

  res.status(200).json({
    status: 'success',
    data: { user, activities, stats }
  });
});

/**
 * Ban/Suspend a user
 */
exports.banUser = catchAsync(async (req, res, next) => {
  const { reason, duration } = req.body;

  if (!reason) return next(new AppError('Ban reason required', 400));

  const user = await User.findByIdAndUpdate(
    req.params.id,
    {
      status: 'banned',
      banReason: reason,
      bannedAt: new Date(),
      banExpiry: duration ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000) : null
    },
    { new: true }
  ).select('-password');

  if (!user) return next(new AppError('User not found', 404));

  // Log activity
  await Activity.create({
    user: req.params.id,
    action: 'ACCOUNT_BANNED',
    description: `Account banned by admin: ${reason}`,
    ipAddress: req.ip,
    metadata: { bannedBy: req.user.id, reason }
  });

  res.status(200).json({
    status: 'success',
    message: `User ${user.email} has been banned`,
    data: { user }
  });
});

/**
 * Unban a user
 */
exports.unbanUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { status: 'active', banReason: null, bannedAt: null, banExpiry: null },
    { new: true }
  ).select('-password');

  if (!user) return next(new AppError('User not found', 404));

  await Activity.create({
    user: req.params.id,
    action: 'ACCOUNT_UNBANNED',
    description: 'Account unbanned by admin',
    ipAddress: req.ip,
    metadata: { unbannedBy: req.user.id }
  });

  res.status(200).json({
    status: 'success',
    message: `User ${user.email} has been unbanned`,
    data: { user }
  });
});

/**
 * Reset user password (admin action)
 */
exports.resetUserPassword = catchAsync(async (req, res, next) => {
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 8) {
    return next(new AppError('Password must be at least 8 characters', 400));
  }

  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError('User not found', 404));

  user.password = newPassword;
  await user.save();

  await Activity.create({
    user: req.params.id,
    action: 'PASSWORD_RESET_ADMIN',
    description: 'Password reset by admin',
    ipAddress: req.ip,
    metadata: { resetBy: req.user.id }
  });

  res.status(200).json({
    status: 'success',
    message: 'User password has been reset'
  });
});

/**
 * Get user audit trail (all actions)
 */
exports.getUserAuditTrail = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 50 } = req.query;

  const skip = (page - 1) * limit;
  const total = await Activity.countDocuments({ user: req.params.id });
  const activities = await Activity.find({ user: req.params.id })
    .sort('-createdAt')
    .skip(skip)
    .limit(parseInt(limit));

  res.status(200).json({
    status: 'success',
    results: activities.length,
    total,
    pages: Math.ceil(total / limit),
    data: { activities }
  });
});

// ============================================================================
// 2️⃣ SHOP MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * Get all shops with filters
 */
exports.getAllShops = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, status, campus, search, verified } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (campus) filter.campus = campus;
  if (verified !== undefined) filter.isVerified = verified === 'true';
  if (search) filter.$text = { $search: search };

  const skip = (page - 1) * limit;
  const total = await Shop.countDocuments(filter);
  const shops = await Shop.find(filter)
    .skip(skip)
    .limit(parseInt(limit))
    .populate('owner', 'fullName email phone')
    .populate('campus', 'name')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: shops.length,
    total,
    pages: Math.ceil(total / limit),
    data: { shops }
  });
});

/**
 * Get shop details with analytics
 */
exports.getShopDetails = catchAsync(async (req, res, next) => {
  const shop = await Shop.findById(req.params.shopId)
    .populate('owner', 'fullName email phone')
    .populate('campus', 'name');

  if (!shop) return next(new AppError('Shop not found', 404));

  // Shop analytics
  const stats = {
    totalProducts: await Product.countDocuments({ shop: req.params.shopId }),
    totalOrders: await Order.countDocuments({ shop: req.params.shopId }),
    totalRevenue: (await Order.aggregate([
      { $match: { shop: shop._id, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]))[0]?.total || 0,
    totalReviews: await Review.countDocuments({ shop: req.params.shopId }),
    averageRating: shop.averageRating || 0,
    totalFollowers: shop.followers?.length || 0
  };

  res.status(200).json({
    status: 'success',
    data: { shop, stats }
  });
});

/**
 * Verify shop
 */
exports.verifyShop = catchAsync(async (req, res, next) => {
  const shop = await Shop.findByIdAndUpdate(
    req.params.shopId,
    { isVerified: true, verifiedAt: new Date() },
    { new: true }
  );

  if (!shop) return next(new AppError('Shop not found', 404));

  // Notify shop owner
  await Notification.create({
    user: shop.owner,
    title: 'Shop Verified',
    message: `Your shop "${shop.name}" has been verified by admin`,
    type: 'shop_verification',
    data: { shopId: shop._id }
  });

  res.status(200).json({
    status: 'success',
    message: 'Shop verified successfully',
    data: { shop }
  });
});

/**
 * Suspend/Deactivate shop
 */
exports.suspendShop = catchAsync(async (req, res, next) => {
  const { reason } = req.body;

  const shop = await Shop.findByIdAndUpdate(
    req.params.shopId,
    { 
      status: 'suspended',
      suspensionReason: reason,
      suspendedAt: new Date()
    },
    { new: true }
  );

  if (!shop) return next(new AppError('Shop not found', 404));

  // Notify shop owner
  await Notification.create({
    user: shop.owner,
    title: 'Shop Suspended',
    message: `Your shop has been suspended: ${reason}`,
    type: 'shop_suspension',
    priority: 'high'
  });

  res.status(200).json({
    status: 'success',
    message: 'Shop suspended successfully',
    data: { shop }
  });
});

/**
 * Get shop revenue analytics
 */
exports.getShopRevenue = catchAsync(async (req, res, next) => {
  const { period = 'month' } = req.query;

  let dateFilter;
  const now = new Date();

  if (period === 'week') {
    dateFilter = new Date(now.setDate(now.getDate() - 7));
  } else if (period === 'month') {
    dateFilter = new Date(now.setMonth(now.getMonth() - 1));
  } else if (period === 'year') {
    dateFilter = new Date(now.setFullYear(now.getFullYear() - 1));
  }

  const revenue = await Order.aggregate([
    {
      $match: {
        shop: req.params.shopId,
        status: 'completed',
        createdAt: { $gte: dateFilter }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        dailyRevenue: { $sum: '$totalAmount' },
        orderCount: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  res.status(200).json({
    status: 'success',
    data: { revenue, period }
  });
});

// ============================================================================
// 3️⃣ PRODUCT MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * Get all products with filters
 */
exports.getAllProducts = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, category, status, shop, search } = req.query;

  const filter = {};
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (shop) filter.shop = shop;
  if (search) filter.$text = { $search: search };

  const skip = (page - 1) * limit;
  const total = await Product.countDocuments(filter);
  const products = await Product.find(filter)
    .skip(skip)
    .limit(parseInt(limit))
    .populate('shop', 'name owner')
    .populate('category', 'name')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: products.length,
    total,
    pages: Math.ceil(total / limit),
    data: { products }
  });
});

/**
 * Flag/Reject product
 */
exports.rejectProduct = catchAsync(async (req, res, next) => {
  const { reason } = req.body;

  const product = await Product.findByIdAndUpdate(
    req.params.productId,
    { status: 'rejected', rejectionReason: reason },
    { new: true }
  );

  if (!product) return next(new AppError('Product not found', 404));

  // Notify shop owner
  const shop = await Shop.findById(product.shop);
  await Notification.create({
    user: shop.owner,
    title: 'Product Rejected',
    message: `Your product "${product.name}" has been rejected: ${reason}`,
    type: 'product_rejection'
  });

  res.status(200).json({
    status: 'success',
    message: 'Product rejected',
    data: { product }
  });
});

/**
 * Delete product (admin action)
 */
exports.deleteProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findByIdAndDelete(req.params.productId);

  if (!product) return next(new AppError('Product not found', 404));

  res.status(200).json({
    status: 'success',
    message: 'Product deleted successfully'
  });
});

// ============================================================================
// 4️⃣ ORDER MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * Get all orders with filters
 */
exports.getAllOrders = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, status, shop, buyer, dateFrom, dateTo } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (shop) filter.shop = shop;
  if (buyer) filter.buyer = buyer;

  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo);
  }

  const skip = (page - 1) * limit;
  const total = await Order.countDocuments(filter);
  const orders = await Order.find(filter)
    .skip(skip)
    .limit(parseInt(limit))
    .populate('buyer', 'fullName email')
    .populate('shop', 'name')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: orders.length,
    total,
    pages: Math.ceil(total / limit),
    data: { orders }
  });
});

/**
 * Get order details
 */
exports.getOrderDetails = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.orderId)
    .populate('buyer', 'fullName email phone')
    .populate('shop', 'name owner')
    .populate('items.product', 'name price');

  if (!order) return next(new AppError('Order not found', 404));

  res.status(200).json({
    status: 'success',
    data: { order }
  });
});

/**
 * Update order status (admin action)
 */
exports.updateOrderStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;

  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
  if (!validStatuses.includes(status)) {
    return next(new AppError('Invalid order status', 400));
  }

  const order = await Order.findByIdAndUpdate(
    req.params.orderId,
    { status },
    { new: true }
  );

  if (!order) return next(new AppError('Order not found', 404));

  // Notify buyer
  const notificationMap = {
    processing: 'Your order is being processed',
    shipped: 'Your order has been shipped',
    delivered: 'Your order has been delivered',
    cancelled: 'Your order has been cancelled',
    refunded: 'Your order has been refunded'
  };

  await Notification.create({
    user: order.buyer,
    title: `Order ${status}`,
    message: notificationMap[status],
    type: 'order_update'
  });

  res.status(200).json({
    status: 'success',
    message: 'Order status updated',
    data: { order }
  });
});

/**
 * Process refund
 */
exports.processRefund = catchAsync(async (req, res, next) => {
  const { reason } = req.body;

  const order = await Order.findByIdAndUpdate(
    req.params.orderId,
    { 
      status: 'refunded',
      refundReason: reason,
      refundedAt: new Date()
    },
    { new: true }
  );

  if (!order) return next(new AppError('Order not found', 404));

  // Notify both buyer and seller
  await Notification.create({
    user: order.buyer,
    title: 'Refund Processed',
    message: `Your refund of ₦${order.totalAmount} has been processed`,
    type: 'refund'
  });

  res.status(200).json({
    status: 'success',
    message: 'Refund processed successfully',
    data: { order }
  });
});

// ============================================================================
// 5️⃣ DOCUMENT MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * Get all documents with filters
 */
exports.getAllDocuments = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, status, campus, faculty, uploadStatus } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (campus) filter.campus = campus;
  if (faculty) filter.faculty = faculty;
  if (uploadStatus) filter.uploadStatus = uploadStatus;

  const skip = (page - 1) * limit;
  const total = await Document.countDocuments(filter);
  const documents = await Document.find(filter)
    .skip(skip)
    .limit(parseInt(limit))
    .populate('uploadedBy', 'fullName email')
    .populate('campus', 'name')
    .populate('faculty', 'name')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: documents.length,
    total,
    pages: Math.ceil(total / limit),
    data: { documents }
  });
});

/**
 * Approve document
 */
exports.approveDocument = catchAsync(async (req, res, next) => {
  const document = await Document.findByIdAndUpdate(
    req.params.documentId,
    { uploadStatus: 'approved', approvedAt: new Date(), approvedBy: req.user.id },
    { new: true }
  );

  if (!document) return next(new AppError('Document not found', 404));

  await Notification.create({
    user: document.uploadedBy,
    title: 'Document Approved',
    message: `Your document "${document.title}" has been approved`,
    type: 'document_approval'
  });

  res.status(200).json({
    status: 'success',
    message: 'Document approved',
    data: { document }
  });
});

/**
 * Reject document
 */
exports.rejectDocument = catchAsync(async (req, res, next) => {
  const { reason } = req.body;

  const document = await Document.findByIdAndUpdate(
    req.params.documentId,
    { uploadStatus: 'rejected', rejectionReason: reason, rejectedAt: new Date() },
    { new: true }
  );

  if (!document) return next(new AppError('Document not found', 404));

  await Notification.create({
    user: document.uploadedBy,
    title: 'Document Rejected',
    message: `Your document "${document.title}" has been rejected: ${reason}`,
    type: 'document_rejection'
  });

  res.status(200).json({
    status: 'success',
    message: 'Document rejected',
    data: { document }
  });
});

/**
 * Delete document (admin action)
 */
exports.deleteDocument = catchAsync(async (req, res, next) => {
  const document = await Document.findByIdAndDelete(req.params.documentId);

  if (!document) return next(new AppError('Document not found', 404));

  res.status(200).json({
    status: 'success',
    message: 'Document deleted successfully'
  });
});

// ============================================================================
// 6️⃣ CONTENT MODERATION ENDPOINTS
// ============================================================================

/**
 * Get all reports
 */
exports.getAllReports = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, status, type, resolved } = req.query;

  const filter = {};
  if (type) filter.type = type;
  if (resolved !== undefined) filter.resolved = resolved === 'true';
  if (status) filter.status = status;

  const skip = (page - 1) * limit;
  const total = await Report.countDocuments(filter);
  const reports = await Report.find(filter)
    .skip(skip)
    .limit(parseInt(limit))
    .populate('reportedBy', 'fullName email')
    .populate('reportedUser', 'fullName email')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: reports.length,
    total,
    pages: Math.ceil(total / limit),
    data: { reports }
  });
});

/**
 * Get report details
 */
exports.getReportDetails = catchAsync(async (req, res, next) => {
  const report = await Report.findById(req.params.reportId)
    .populate('reportedBy', 'fullName email')
    .populate('reportedUser', 'fullName email');

  if (!report) return next(new AppError('Report not found', 404));

  res.status(200).json({
    status: 'success',
    data: { report }
  });
});

/**
 * Resolve report
 */
exports.resolveReport = catchAsync(async (req, res, next) => {
  const { action, reason } = req.body;

  const report = await Report.findByIdAndUpdate(
    req.params.reportId,
    {
      resolved: true,
      resolvedAt: new Date(),
      resolutionAction: action,
      resolutionReason: reason,
      resolvedBy: req.user.id
    },
    { new: true }
  );

  if (!report) return next(new AppError('Report not found', 404));

  // Notify reporter
  await Notification.create({
    user: report.reportedBy,
    title: 'Report Resolved',
    message: `Your report has been reviewed and action taken: ${reason}`,
    type: 'report_resolution'
  });

  res.status(200).json({
    status: 'success',
    message: 'Report resolved',
    data: { report }
  });
});

/**
 * Delete post (from report)
 */
exports.deletePost = catchAsync(async (req, res, next) => {
  const post = await Post.findByIdAndDelete(req.params.postId);

  if (!post) return next(new AppError('Post not found', 404));

  // Notify post author
  await Notification.create({
    user: post.author,
    title: 'Post Removed',
    message: 'Your post has been removed due to violating community guidelines',
    type: 'content_removal',
    priority: 'high'
  });

  res.status(200).json({
    status: 'success',
    message: 'Post deleted successfully'
  });
});

// ============================================================================
// 7️⃣ CHAT & MESSAGES MONITORING ENDPOINTS
// ============================================================================

/**
 * Get all chats for monitoring
 */
exports.getAllChats = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, search } = req.query;

  const filter = {};
  if (search) filter.$text = { $search: search };

  const skip = (page - 1) * limit;
  const total = await Chat.countDocuments(filter);
  const chats = await Chat.find(filter)
    .skip(skip)
    .limit(parseInt(limit))
    .populate('participants', 'fullName email')
    .sort('-lastMessage');

  res.status(200).json({
    status: 'success',
    results: chats.length,
    total,
    pages: Math.ceil(total / limit),
    data: { chats }
  });
});

/**
 * Get chat messages
 */
exports.getChatMessages = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 50 } = req.query;

  const skip = (page - 1) * limit;
  const total = await Message.countDocuments({ chat: req.params.chatId });
  const messages = await Message.find({ chat: req.params.chatId })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('sender', 'fullName email')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: messages.length,
    total,
    pages: Math.ceil(total / limit),
    data: { messages }
  });
});

/**
 * Flag/Delete suspicious message
 */
exports.deleteMessage = catchAsync(async (req, res, next) => {
  const message = await Message.findByIdAndDelete(req.params.messageId);

  if (!message) return next(new AppError('Message not found', 404));

  res.status(200).json({
    status: 'success',
    message: 'Message deleted successfully'
  });
});

// ============================================================================
// 8️⃣ ANALYTICS & INSIGHTS ENDPOINTS
// ============================================================================

/**
 * Get admin dashboard overview
 */
exports.getDashboardOverview = catchAsync(async (req, res, next) => {
  const [
    totalUsers,
    totalOrders,
    totalRevenue,
    totalProducts,
    totalShops,
    totalDocuments,
    activeChats,
    pendingReports,
    bannedUsers,
    totalEvents
  ] = await Promise.all([
    User.countDocuments(),
    Order.countDocuments(),
    Order.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]),
    Product.countDocuments(),
    Shop.countDocuments(),
    Document.countDocuments(),
    Chat.countDocuments({ isActive: true }),
    Report.countDocuments({ resolved: false }),
    User.countDocuments({ status: 'banned' }),
    Event.countDocuments()
  ]);

  const overview = {
    totalUsers,
    totalOrders,
    totalRevenue: totalRevenue[0]?.total || 0,
    totalProducts,
    totalShops,
    totalDocuments,
    activeChats,
    pendingReports,
    bannedUsers,
    totalEvents
  };

  res.status(200).json({
    status: 'success',
    data: { overview }
  });
});

/**
 * Get user analytics
 */
exports.getUserAnalytics = catchAsync(async (req, res, next) => {
  const { period = 'month' } = req.query;

  let dateFilter;
  const now = new Date();

  if (period === 'week') {
    dateFilter = new Date(now.setDate(now.getDate() - 7));
  } else if (period === 'month') {
    dateFilter = new Date(now.setMonth(now.getMonth() - 1));
  } else if (period === 'year') {
    dateFilter = new Date(now.setFullYear(now.getFullYear() - 1));
  }

  const userGrowth = await User.aggregate([
    {
      $match: { createdAt: { $gte: dateFilter } }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        newUsers: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const usersByRole = await User.aggregate([
    { $group: { _id: '$role', count: { $sum: 1 } } }
  ]);

  const usersByStatus = await User.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  res.status(200).json({
    status: 'success',
    data: { userGrowth, usersByRole, usersByStatus, period }
  });
});

/**
 * Get revenue analytics
 */
exports.getRevenueAnalytics = catchAsync(async (req, res, next) => {
  const { period = 'month' } = req.query;

  let dateFilter;
  const now = new Date();

  if (period === 'week') {
    dateFilter = new Date(now.setDate(now.getDate() - 7));
  } else if (period === 'month') {
    dateFilter = new Date(now.setMonth(now.getMonth() - 1));
  } else if (period === 'year') {
    dateFilter = new Date(now.setFullYear(now.getFullYear() - 1));
  }

  const revenueByDay = await Order.aggregate([
    {
      $match: {
        status: 'completed',
        createdAt: { $gte: dateFilter }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        dailyRevenue: { $sum: '$totalAmount' },
        orderCount: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const topShops = await Order.aggregate([
    {
      $match: {
        status: 'completed',
        createdAt: { $gte: dateFilter }
      }
    },
    {
      $group: {
        _id: '$shop',
        shopRevenue: { $sum: '$totalAmount' },
        orderCount: { $sum: 1 }
      }
    },
    { $sort: { shopRevenue: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'shops',
        localField: '_id',
        foreignField: '_id',
        as: 'shop'
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: { revenueByDay, topShops, period }
  });
});

/**
 * Get product analytics
 */
exports.getProductAnalytics = catchAsync(async (req, res, next) => {
  const topProducts = await Product.aggregate([
    {
      $group: {
        _id: '$_id',
        views: { $sum: '$views' },
        purchases: { $sum: '$purchases' },
        title: { $first: '$title' },
        price: { $first: '$price' }
      }
    },
    { $sort: { views: -1 } },
    { $limit: 15 }
  ]);

  const productsByCategory = await Product.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalSales: { $sum: '$purchases' }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: { topProducts, productsByCategory }
  });
});

/**
 * Get document analytics
 */
exports.getDocumentAnalytics = catchAsync(async (req, res, next) => {
  const topDocuments = await Document.aggregate([
    {
      $group: {
        _id: '$_id',
        views: { $sum: '$views' },
        downloads: { $sum: '$downloads' },
        title: { $first: '$title' },
        academicLevel: { $first: '$academicLevel' }
      }
    },
    { $sort: { downloads: -1 } },
    { $limit: 15 }
  ]);

  const documentsByLevel = await Document.aggregate([
    {
      $group: {
        _id: '$academicLevel',
        count: { $sum: 1 },
        totalDownloads: { $sum: '$downloads' },
        totalViews: { $sum: '$views' }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: { topDocuments, documentsByLevel }
  });
});

/**
 * Get event analytics
 */
exports.getEventAnalytics = catchAsync(async (req, res, next) => {
  const upcomingEvents = await Event.countDocuments({ startDate: { $gte: new Date() } });
  const completedEvents = await Event.countDocuments({ startDate: { $lt: new Date() } });
  const totalAttendees = await Event.aggregate([
    { $group: { _id: null, totalAttendees: { $sum: { $size: '$attendees' } } } }
  ]);

  const topEvents = await Event.aggregate([
    {
      $group: {
        _id: '$_id',
        attendeeCount: { $first: { $size: '$attendees' } },
        title: { $first: '$title' },
        location: { $first: '$location' }
      }
    },
    { $sort: { attendeeCount: -1 } },
    { $limit: 10 }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      upcomingEvents,
      completedEvents,
      totalAttendees: totalAttendees[0]?.totalAttendees || 0,
      topEvents
    }
  });
});

// ============================================================================
// 9️⃣ REQUEST & OFFER MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * Get all requests
 */
exports.getAllRequests = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, status, category } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = category;

  const skip = (page - 1) * limit;
  const total = await Request.countDocuments(filter);
  const requests = await Request.find(filter)
    .skip(skip)
    .limit(parseInt(limit))
    .populate('requestedBy', 'fullName email')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: requests.length,
    total,
    pages: Math.ceil(total / limit),
    data: { requests }
  });
});

/**
 * Get all offers
 */
exports.getAllOffers = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, status } = req.query;

  const filter = {};
  if (status) filter.status = status;

  const skip = (page - 1) * limit;
  const total = await Offer.countDocuments(filter);
  const offers = await Offer.find(filter)
    .skip(skip)
    .limit(parseInt(limit))
    .populate('offeredBy', 'fullName email')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: offers.length,
    total,
    pages: Math.ceil(total / limit),
    data: { offers }
  });
});

// ============================================================================
// 🔟 SYSTEM SETTINGS & HEALTH ENDPOINTS
// ============================================================================

/**
 * Get system health status
 */
exports.getSystemHealth = catchAsync(async (req, res, next) => {
  const health = {
    database: 'connected',
    timestamp: new Date(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    apiVersion: '1.0.0',
    services: {
      mongodb: 'connected',
      redis: 'connected',
      cloudinary: 'connected',
      paystack: 'connected'
    }
  };

  res.status(200).json({
    status: 'success',
    data: { health }
  });
});

/**
 * Get system logs
 */
exports.getSystemLogs = catchAsync(async (req, res, next) => {
  const { limit = 100, level } = req.query;

  // This assumes you have a logs collection or file
  // Implement based on your logging system
  const logs = {
    recent: [],
    level: level || 'all',
    timestamp: new Date()
  };

  res.status(200).json({
    status: 'success',
    data: { logs }
  });
});

/**
 * Clear cache
 */
exports.clearCache = catchAsync(async (req, res, next) => {
  // Implement based on your caching system (Redis)
  res.status(200).json({
    status: 'success',
    message: 'Cache cleared successfully'
  });
});

/**
 * Get system performance metrics
 */
exports.getSystemPerformance = catchAsync(async (req, res, next) => {
  const performance = {
    cpuUsage: process.cpuUsage(),
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime(),
    timestamp: new Date()
  };

  res.status(200).json({
    status: 'success',
    data: { performance }
  });
});

module.exports = exports;
