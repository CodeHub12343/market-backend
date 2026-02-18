const logger = require('./logger');

class ErrorHandler {
  constructor() {
    this.errorTypes = {
      VALIDATION: 'ValidationError',
      AUTHENTICATION: 'AuthenticationError',
      AUTHORIZATION: 'AuthorizationError',
      NOT_FOUND: 'NotFoundError',
      DUPLICATE: 'DuplicateError',
      RATE_LIMIT: 'RateLimitError',
      NETWORK: 'NetworkError',
      DATABASE: 'DatabaseError',
      FILE_UPLOAD: 'FileUploadError',
      THIRD_PARTY: 'ThirdPartyError',
      UNKNOWN: 'UnknownError'
    };
  }

  // Categorize error based on error object
  categorizeError(err) {
    if (err.name === 'ValidationError' || err.name === 'CastError') {
      return this.errorTypes.VALIDATION;
    }
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return this.errorTypes.AUTHENTICATION;
    }
    if (err.statusCode === 403) {
      return this.errorTypes.AUTHORIZATION;
    }
    if (err.statusCode === 404) {
      return this.errorTypes.NOT_FOUND;
    }
    if (err.code === 11000) {
      return this.errorTypes.DUPLICATE;
    }
    if (err.type === 'entity.too.large') {
      return this.errorTypes.FILE_UPLOAD;
    }
    if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
      return this.errorTypes.NETWORK;
    }
    if (err.name === 'MongoError' || err.name === 'MongooseError') {
      return this.errorTypes.DATABASE;
    }
    return this.errorTypes.UNKNOWN;
  }

  // Log error with appropriate level and details
  logError(err, req = null) {
    const errorType = this.categorizeError(err);
    const errorDetails = {
      type: errorType,
      message: err.message,
      stack: err.stack,
      statusCode: err.statusCode || 500,
      path: req ? req.originalUrl : null,
      method: req ? req.method : null,
      body: req ? req.body : null,
      user: req && req.user ? req.user.id : null,
      timestamp: new Date().toISOString()
    };

    // Log based on error type and severity
    switch (errorType) {
      case this.errorTypes.VALIDATION:
      case this.errorTypes.AUTHENTICATION:
      case this.errorTypes.AUTHORIZATION:
        logger.warn(JSON.stringify(errorDetails));
        break;
      case this.errorTypes.NOT_FOUND:
        logger.info(JSON.stringify(errorDetails));
        break;
      default:
        logger.error(JSON.stringify(errorDetails));
    }

    return errorDetails;
  }

  // Format error response for client
  formatError(err, includeStack = false) {
    const errorType = this.categorizeError(err);
    const response = {
      status: 'error',
      type: errorType,
      message: this.getClientMessage(err),
      code: err.statusCode || 500
    };

    if (includeStack && process.env.NODE_ENV === 'development') {
      response.stack = err.stack;
    }

    return response;
  }

  // Get user-friendly error message
  getClientMessage(err) {
    switch (this.categorizeError(err)) {
      case this.errorTypes.VALIDATION:
        return this.formatValidationError(err);
      case this.errorTypes.AUTHENTICATION:
        return 'Authentication failed. Please log in again.';
      case this.errorTypes.AUTHORIZATION:
        return 'You do not have permission to perform this action.';
      case this.errorTypes.NOT_FOUND:
        return 'The requested resource was not found.';
      case this.errorTypes.DUPLICATE:
        return 'This record already exists.';
      case this.errorTypes.RATE_LIMIT:
        return 'Too many requests. Please try again later.';
      case this.errorTypes.FILE_UPLOAD:
        return 'File upload failed. Please check file size and type.';
      case this.errorTypes.NETWORK:
        return 'Network error occurred. Please try again.';
      case this.errorTypes.DATABASE:
        return 'Database operation failed. Please try again.';
      case this.errorTypes.THIRD_PARTY:
        return 'External service error. Please try again later.';
      default:
        return process.env.NODE_ENV === 'development' 
          ? err.message 
          : 'Something went wrong. Please try again later.';
    }
  }

  // Format validation errors into readable message
  formatValidationError(err) {
    if (err.errors) {
      const messages = Object.values(err.errors).map(e => e.message);
      return messages.join('. ');
    }
    return err.message;
  }

  // Attempt recovery based on error type
  async attemptRecovery(err, req) {
    const errorType = this.categorizeError(err);
    
    switch (errorType) {
      case this.errorTypes.NETWORK:
        // Implement retry logic for network errors
        return await this.retryOperation(err.operation, 3);
      
      case this.errorTypes.DATABASE:
        // Attempt to reconnect to database
        return await this.reconnectDatabase();
      
      case this.errorTypes.FILE_UPLOAD:
        // Cleanup any partial uploads
        return await this.cleanupPartialUploads(req);
      
      default:
        return false;
    }
  }

  // Retry failed operations
  async retryOperation(operation, maxRetries) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (err) {
        if (i === maxRetries - 1) throw err;
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      }
    }
  }

  // Reconnect to database
  async reconnectDatabase() {
    try {
      if (process.env.NODE_ENV !== 'production') return false;
      
      const mongoose = require('mongoose');
      await mongoose.connect(process.env.DATABASE.replace(
        '<PASSWORD>',
        process.env.DATABASE_PASSWORD
      ));
      return true;
    } catch (err) {
      logger.error('Database reconnection failed:', err);
      return false;
    }
  }

  // Cleanup partial uploads
  async cleanupPartialUploads(req) {
    try {
      if (req.files && Array.isArray(req.files)) {
        const fileHandler = require('./fileHandler');
        await fileHandler.cleanupFiles();
        return true;
      }
      return false;
    } catch (err) {
      logger.error('Cleanup failed:', err);
      return false;
    }
  }
}

module.exports = new ErrorHandler();