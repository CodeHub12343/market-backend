const Request = require('../models/requestModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Check if user has permission to view analytics
exports.checkAnalyticsPermission = catchAsync(async (req, res, next) => {
  const user = req.user;
  
  // Only admins and moderators can access analytics
  if (!['admin', 'moderator'].includes(user.role)) {
    return next(new AppError('Insufficient permissions to access analytics', 403));
  }
  
  next();
});

// Check user role for request operations
exports.checkUserRole = catchAsync(async (req, res, next) => {
  const user = req.user;
  
    // Allow all users to create requests
    // ...existing code...
  
  if (req.method === 'DELETE' && !['admin', 'moderator'].includes(user.role)) {
    return next(new AppError('Only admins and moderators can delete requests', 403));
  }
  
  next();
});

// Validate request data
exports.validateRequestData = catchAsync(async (req, res, next) => {
  const { title, description, category, priority, budget } = req.body;
  
  if (!title || title.trim().length < 5) {
    return next(new AppError('Title must be at least 5 characters long', 400));
  }
  
  if (!description || description.trim().length < 10) {
    return next(new AppError('Description must be at least 10 characters long', 400));
  }
  
  if (budget && (isNaN(budget) || budget < 0)) {
    return next(new AppError('Budget must be a positive number', 400));
  }
  
  next();
});

// Rate limit request creation
exports.rateLimitRequestCreation = catchAsync(async (req, res, next) => {
  const user = req.user;
  
  // Check if user has created too many requests recently
  const recentRequests = await Request.countDocuments({
    requester: user._id,
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
  });
  
  if (recentRequests >= 10) {
    return next(new AppError('Too many requests created in the last 24 hours', 429));
  }
  
  next();
});

// Increment request views
exports.incrementRequestViews = catchAsync(async (req, res, next) => {
  if (req.request) {
    await Request.findByIdAndUpdate(req.request._id, { $inc: { views: 1 } });
  }
  next();
});

// Populate request data
exports.populateRequestData = catchAsync(async (req, res, next) => {
  let query = Request.findById(req.params.id);

  // Handle dynamic population based on query parameters
  if (req.query.populate) {
    const fields = req.query.populate.split(',');
    fields.forEach(field => {
      if (field === 'offers') {
        query = query.populate({
          path: 'offers',
          select: '-__v',
          populate: {
            path: 'seller',
            select: 'fullName email'
          }
        });
      } else if (field === 'requester') {
        query = query.populate('requester', 'fullName email whatsapp phoneNumber');
      } else if (field === 'category') {
        query = query.populate('category', 'name');
      }
    });
  }

  const request = await query;
  
  if (!request) {
    return next(new AppError('Request not found', 404));
  }
  
  req.request = request;
  next();
});

// Check request ownership
exports.checkRequestOwnership = catchAsync(async (req, res, next) => {
  const request = req.request;
  const user = req.user;
  
  // Admin and moderators can access any request
  if (['admin', 'moderator'].includes(user.role)) {
    return next();
  }
  
  // Check if user owns the request
  const requesterId = request.requester && (request.requester._id ? request.requester._id.toString() : String(request.requester));
  if (requesterId !== user._id.toString()) {
    return next(new AppError('You can only access your own requests', 403));
  }
  
  next();
});

// Check update permission
exports.checkUpdatePermission = catchAsync(async (req, res, next) => {
  const request = req.request;
  const user = req.user;
  
  // Admin and moderators can update any request
  if (['admin', 'moderator'].includes(user.role)) {
    return next();
  }
  
  // Only request owner can update their request
  const requesterIdForUpdate = request.requester && (request.requester._id ? request.requester._id.toString() : String(request.requester));
  if (requesterIdForUpdate !== user._id.toString()) {
    return next(new AppError('You can only update your own requests', 403));
  }
  
  // Check if request is already fulfilled
  if (request.status === 'fulfilled') {
    return next(new AppError('Cannot update fulfilled requests', 400));
  }
  
  next();
});

// Check delete permission
exports.checkDeletePermission = catchAsync(async (req, res, next) => {
  const request = req.request;
  const user = req.user;
  
  // Admin and moderators can delete any request
  if (['admin', 'moderator'].includes(user.role)) {
    return next();
  }
  
  // Only request owner can delete their request
  const requesterIdForDelete = request.requester && (request.requester._id ? request.requester._id.toString() : String(request.requester));
  if (requesterIdForDelete !== user._id.toString()) {
    return next(new AppError('You can only delete your own requests', 403));
  }
  
  // Check if request is already fulfilled
  if (request.status === 'fulfilled') {
    return next(new AppError('Cannot delete fulfilled requests', 400));
  }
  
  next();
});

// Check fulfill permission
exports.checkFulfillPermission = catchAsync(async (req, res, next) => {
  const request = req.request;
  const user = req.user;
  
  // Only admin and moderators can fulfill requests
  if (!['admin', 'moderator'].includes(user.role)) {
    return next(new AppError('Only admins and moderators can fulfill requests', 403));
  }
  
  // Check if request is already fulfilled
  if (request.status === 'fulfilled') {
    return next(new AppError('Request is already fulfilled', 400));
  }
  
  next();
});

// Validate image upload
exports.validateImageUpload = catchAsync(async (req, res, next) => {
  if (req.files && req.files.length > 0) {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    
    for (let file of req.files) {
      if (file.size > maxSize) {
        return next(new AppError('Image size must be less than 5MB', 400));
      }
      
      if (!allowedTypes.includes(file.mimetype)) {
        return next(new AppError('Only JPEG, PNG, and GIF images are allowed', 400));
      }
    }
  }
  
  next();
});

// Validate bulk operation
exports.validateBulkOperation = catchAsync(async (req, res, next) => {
  const { operation, requestIds } = req.body;
  
  if (!operation || !requestIds || !Array.isArray(requestIds)) {
    return next(new AppError('Operation and requestIds are required', 400));
  }
  
  if (requestIds.length === 0) {
    return next(new AppError('At least one request ID is required', 400));
  }
  
  if (requestIds.length > 100) {
    return next(new AppError('Cannot process more than 100 requests at once', 400));
  }
  
  const validOperations = ['delete', 'archive', 'activate', 'deactivate', 'fulfill'];
  if (!validOperations.includes(operation)) {
    return next(new AppError('Invalid bulk operation', 400));
  }
  
  next();
});

// Check bulk operation permission
exports.checkBulkOperationPermission = catchAsync(async (req, res, next) => {
  const user = req.user;
  const { operation } = req.body;
  
  // Only admin and moderators can perform bulk operations
  if (!['admin', 'moderator'].includes(user.role)) {
    return next(new AppError('Only admins and moderators can perform bulk operations', 403));
  }
  
  // Additional checks for specific operations
  if (operation === 'fulfill' && user.role !== 'admin') {
    return next(new AppError('Only admins can fulfill requests in bulk', 403));
  }
  
  next();
});

// Check request status transition
exports.checkStatusTransition = catchAsync(async (req, res, next) => {
  const request = req.request;
  const { status } = req.body;
  
  const validTransitions = {
    'pending': ['active', 'cancelled'],
    'active': ['fulfilled', 'cancelled'],
    'fulfilled': [], // No transitions from fulfilled
    'cancelled': [] // No transitions from cancelled
  };
  
  if (!validTransitions[request.status] || !validTransitions[request.status].includes(status)) {
    return next(new AppError(`Invalid status transition from ${request.status} to ${status}`, 400));
  }
  
  next();
});

// Validate request search parameters
exports.validateSearchParameters = catchAsync(async (req, res, next) => {
  const { search, status, category, priority, minBudget, maxBudget, sortBy, sortOrder } = req.query;
  
  if (search && search.length > 100) {
    return next(new AppError('Search query cannot exceed 100 characters', 400));
  }
  
  if (status && !['pending', 'active', 'fulfilled', 'cancelled'].includes(status)) {
    return next(new AppError('Invalid status filter', 400));
  }
  
  if (priority && !['low', 'medium', 'high', 'urgent'].includes(priority)) {
    return next(new AppError('Invalid priority filter', 400));
  }
  
  if (minBudget && (isNaN(minBudget) || minBudget < 0)) {
    return next(new AppError('Minimum budget must be a positive number', 400));
  }
  
  if (maxBudget && (isNaN(maxBudget) || maxBudget < 0)) {
    return next(new AppError('Maximum budget must be a positive number', 400));
  }
  
  if (minBudget && maxBudget && parseFloat(minBudget) > parseFloat(maxBudget)) {
    return next(new AppError('Minimum budget cannot be greater than maximum budget', 400));
  }
  
  if (sortBy && !['createdAt', 'updatedAt', 'title', 'budget', 'priority', 'views'].includes(sortBy)) {
    return next(new AppError('Invalid sort field', 400));
  }
  
  if (sortOrder && !['asc', 'desc'].includes(sortOrder)) {
    return next(new AppError('Sort order must be asc or desc', 400));
  }
  
  next();
});

// Check request dependencies
exports.checkRequestDependencies = catchAsync(async (req, res, next) => {
  const request = req.request;
  
  // Check if request has any dependencies (e.g., offers, messages)
  const dependencies = await Promise.all([
    Request.db.collection('offers').countDocuments({ request: request._id }),
    Request.db.collection('messages').countDocuments({ request: request._id })
  ]);
  
  const totalDependencies = dependencies.reduce((sum, count) => sum + count, 0);
  
  if (totalDependencies > 0) {
    req.requestDependencies = {
      offers: dependencies[0],
      messages: dependencies[1],
      total: totalDependencies
    };
  }
  
  next();
});

// Prevent deletion with dependencies
exports.preventDeletionWithDependencies = catchAsync(async (req, res, next) => {
  if (req.requestDependencies && req.requestDependencies.total > 0) {
    return next(new AppError(
      `Cannot delete request. It has ${req.requestDependencies.total} associated items. ` +
      `Offers: ${req.requestDependencies.offers}, Messages: ${req.requestDependencies.messages}`,
      400
    ));
  }
  
  next();
});

// Rate limit request operations
exports.rateLimitRequestOperations = catchAsync(async (req, res, next) => {
  const user = req.user;
  const operation = req.method + req.route.path;
  
  // Different rate limits for different operations
  const rateLimits = {
    'POST/requests': 5, // 5 creations per hour
    'PUT/requests': 20, // 20 updates per hour
    'DELETE/requests': 3, // 3 deletions per hour
    'POST/requests/bulk': 2 // 2 bulk operations per hour
  };
  
  const limit = rateLimits[operation] || 100; // Default limit
  
  // This would integrate with your rate limiting system
  // For now, just pass through
  next();
});

// All functions are already exported using exports.functionName above
// No need for additional module.exports