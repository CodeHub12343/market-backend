const AppError = require('../utils/appError');
const Activity = require('../models/activityModel');

/**
 * Check if user is admin
 */
exports.checkAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return next(new AppError('Only admins can perform this action', 403));
  }
  next();
};

/**
 * Check admin permissions based on resource
 */
exports.checkAdminPermission = (resource) => {
  return async (req, res, next) => {
    const adminPermissions = {
      'users': ['view', 'edit', 'ban', 'reset_password'],
      'shops': ['view', 'verify', 'suspend', 'analytics'],
      'products': ['view', 'reject', 'delete'],
      'orders': ['view', 'update_status', 'refund'],
      'documents': ['view', 'approve', 'reject', 'delete'],
      'reports': ['view', 'resolve'],
      'chats': ['view', 'delete_message'],
      'system': ['view_health', 'view_logs', 'clear_cache'],
      'analytics': ['view_all']
    };

    if (!adminPermissions[resource]) {
      return next(new AppError('Invalid resource', 400));
    }

    // Admin has all permissions by default
    next();
  };
};

/**
 * Audit log for admin actions
 */
exports.auditLog = (action, resourceType) => {
  return async (req, res, next) => {
    // Capture original send function
    const originalSend = res.send;

    // Override send function to log after response
    res.send = function (data) {
      // Only log if request was successful (status 200-299)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        Activity.create({
          user: req.user.id,
          action: `ADMIN_${action}`,
          description: `Admin ${action}: ${resourceType} - ${req.params.id || 'bulk'}`,
          ipAddress: req.ip,
          metadata: {
            resource: resourceType,
            method: req.method,
            url: req.originalUrl,
            resourceId: req.params.id,
            requestBody: req.body
          }
        }).catch(err => console.error('Audit log failed:', err));
      }

      // Call original send
      originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Rate limit for admin actions
 */
const adminActionLimits = {
  ban: 10, // max 10 bans per minute
  delete: 20, // max 20 deletions per minute
  refund: 15 // max 15 refunds per minute
};

exports.adminActionRateLimit = (actionType) => {
  const limits = {};

  return (req, res, next) => {
    const adminId = req.user.id;
    const now = Date.now();
    const limit = adminActionLimits[actionType] || 30;

    if (!limits[adminId]) {
      limits[adminId] = {};
    }

    if (!limits[adminId][actionType]) {
      limits[adminId][actionType] = [];
    }

    // Remove timestamps older than 1 minute
    limits[adminId][actionType] = limits[adminId][actionType].filter(
      timestamp => now - timestamp < 60000
    );

    if (limits[adminId][actionType].length >= limit) {
      return next(new AppError(
        `Rate limit exceeded for ${actionType}. Max ${limit} per minute`,
        429
      ));
    }

    limits[adminId][actionType].push(now);
    next();
  };
};

/**
 * Validate admin request body
 */
exports.validateAdminRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }
    req.validatedBody = value;
    next();
  };
};

/**
 * Require specific admin permission
 */
exports.requireAdminPermission = (permission) => {
  return (req, res, next) => {
    const adminPermissions = req.user.adminPermissions || [];
    
    if (!adminPermissions.includes(permission) && permission !== 'all') {
      return next(new AppError(
        `You don't have permission to perform this action: ${permission}`,
        403
      ));
    }
    next();
  };
};

/**
 * Validate resource exists before admin action
 */
exports.validateResourceExists = (Model, paramName = 'id') => {
  return async (req, res, next) => {
    try {
      const resource = await Model.findById(req.params[paramName]);
      
      if (!resource) {
        return next(new AppError('Resource not found', 404));
      }

      req.resource = resource;
      next();
    } catch (error) {
      next(new AppError('Invalid resource ID', 400));
    }
  };
};

/**
 * Prevent self-targeting actions
 */
exports.preventSelfTargeting = (req, res, next) => {
  if (req.params.id === req.user.id) {
    return next(new AppError('You cannot perform this action on your own account', 400));
  }
  next();
};

/**
 * Log sensitive admin operations
 */
exports.logSensitiveOperation = (operationType) => {
  return async (req, res, next) => {
    const sensitiveOps = [
      'ban_user',
      'delete_content',
      'process_refund',
      'reset_password',
      'clear_cache'
    ];

    if (sensitiveOps.includes(operationType)) {
      await Activity.create({
        user: req.user.id,
        action: `ADMIN_SENSITIVE_${operationType}`,
        description: `Sensitive operation: ${operationType} on resource ${req.params.id}`,
        ipAddress: req.ip,
        metadata: {
          operationType,
          resourceId: req.params.id,
          timestamp: new Date(),
          adminEmail: req.user.email
        }
      }).catch(err => console.error('Sensitive operation log failed:', err));
    }

    next();
  };
};

/**
 * Verify admin has access to resource
 */
exports.verifyResourceAccess = (Model, paramName = 'id') => {
  return async (req, res, next) => {
    try {
      const resource = await Model.findById(req.params[paramName]);

      if (!resource) {
        return next(new AppError('Resource not found', 404));
      }

      // Admins have access to all resources
      next();
    } catch (error) {
      next(new AppError('Invalid resource ID', 400));
    }
  };
};

/**
 * Paginate admin list requests
 */
exports.paginateAdminRequests = (req, res, next) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

  req.pagination = {
    page,
    limit,
    skip: (page - 1) * limit
  };

  next();
};

/**
 * Validate date range filters
 */
exports.validateDateRange = (req, res, next) => {
  if (req.query.dateFrom || req.query.dateTo) {
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom) : null;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo) : null;

    if (dateFrom && isNaN(dateFrom.getTime())) {
      return next(new AppError('Invalid dateFrom format', 400));
    }

    if (dateTo && isNaN(dateTo.getTime())) {
      return next(new AppError('Invalid dateTo format', 400));
    }

    if (dateFrom && dateTo && dateFrom > dateTo) {
      return next(new AppError('dateFrom cannot be after dateTo', 400));
    }

    req.validatedDates = { dateFrom, dateTo };
  }

  next();
};

module.exports = exports;
