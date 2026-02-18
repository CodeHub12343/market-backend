const AppError = require('../utils/appError');
const errorHandler = require('../utils/errorHandler');
const logger = require('../utils/logger');

const handleDuplicateFieldsDB = err => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  console.log(value);

  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(el => el.message);

  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401);

const sendErrorDev = (err, req, res) => {
  // A) API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  }

  // B) RENDERED WEBSITE
  console.error('ERROR ðŸ’¥', err);
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: err.message
  });
};

const sendErrorProd = (err, req, res) => {
  // A) API
  if (req.originalUrl.startsWith('/api')) {
    // A) Operational, trusted error: send message to client
    if (err.isOperational) {
      const errorResponse = {
        status: err.status,
        message: err.message
      };
      // Include validation details if available
      if (err.details) {
        errorResponse.details = err.details;
      }
      return res.status(err.statusCode).json(errorResponse);
    }
    // B) Programming or other unknown error: don't leak error details
    // 1) Log error
    console.error('ERROR ðŸ’¥', err);
    // 2) Send generic message
    return res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!'
    });
  }

  // B) RENDERED WEBSITE
  // A) Operational, trusted error: send message to client
  if (err.isOperational) {
    console.log(err);
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message
    });
  }
  // B) Programming or other unknown error: don't leak error details
  // 1) Log error
  console.error('ERROR ðŸ’¥', err);
  // 2) Send generic message
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: 'Please try again later.'
  });
};

module.exports = async (err, req, res, next) => {
  // Log error with details
  const errorDetails = errorHandler.logError(err, req);

  // Attempt recovery if possible
  const recovered = await errorHandler.attemptRecovery(err, req);
  
  if (recovered) {
    logger.info(`Successfully recovered from ${errorDetails.type}`);
    // If recovery was successful and the error is retryable, retry the request
    if (req.method === 'GET') {
      return res.redirect(req.originalUrl);
    }
  }

  // Format error for client response
  const formattedError = errorHandler.formatError(
    err,
    process.env.NODE_ENV === 'development'
  );

  // Send response
  res.status(formattedError.code).json(formattedError);
};