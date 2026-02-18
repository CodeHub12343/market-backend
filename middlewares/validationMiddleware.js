const { validationResult, body, param, query } = require('express-validator');
const AppError = require('../utils/appError');

// Custom sanitizers
const customSanitizers = {
  // Trim and convert to lowercase
  normalizeEmail: (value) => {
    return value ? value.trim().toLowerCase() : value;
  },
  // Remove all HTML tags
  stripHtml: (value) => {
    return value ? value.replace(/<[^>]*>/g, '') : value;
  },
  // Remove special characters
  removeSpecialChars: (value) => {
    return value ? value.replace(/[^\w\s-]/g, '') : value;
  },
  // Convert to boolean
  toBoolean: (value) => {
    if (typeof value === 'string') {
      value = value.toLowerCase();
      return value === 'true' || value === '1' || value === 'yes';
    }
    return Boolean(value);
  }
};

// Common validation chains
const commonValidations = {
  // User related validations
  email: () => 
    body('email')
      .trim()
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
  
  password: () =>
    body('password')
      .isLength({ min: 8 })
      .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}$/)
      .withMessage('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  name: (fieldName = 'name') =>
    body(fieldName)
      .trim()
      .isLength({ min: 2, max: 50 })
      .matches(/^[a-zA-Z\s-]+$/)
      .withMessage(`${fieldName} must be between 2 and 50 characters and contain only letters, spaces, and hyphens`),
  
  // Common field validations
  id: (paramName = 'id') =>
    param(paramName)
      .isMongoId()
      .withMessage('Invalid ID format'),
  
  page: () =>
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
  
  limit: () =>
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),

  // Price validation
  price: () =>
    body('price')
      .isFloat({ min: 0 })
      .withMessage('Price must be a positive number'),

  // Date validation
  date: (fieldName) =>
    body(fieldName)
      .optional()
      .isISO8601()
      .withMessage('Invalid date format. Please use ISO 8601 format'),

  // Array validation
  array: (fieldName, minItems = 1, maxItems = 100) =>
    body(fieldName)
      .isArray({ min: minItems, max: maxItems })
      .withMessage(`${fieldName} must be an array with ${minItems}-${maxItems} items`)
};

// File validation middleware
const validateFile = (allowedTypes, maxSize = 5 * 1024 * 1024) => (req, res, next) => {
  if (!req.file && !req.files) {
    return next();
  }

  const files = req.files ? Object.values(req.files).flat() : [req.file];

  for (const file of files) {
    // Check file size
    if (file.size > maxSize) {
      return next(new AppError(`File size exceeds ${maxSize / 1024 / 1024}MB limit`, 400));
    }

    // Check file type
    const fileType = file.mimetype;
    if (!allowedTypes.includes(fileType)) {
      return next(new AppError(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`, 400));
    }
  }

  next();
};

// Validation result middleware
const validate = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) {
    console.log('Request body:', req.body);
    return next();
  }

  const allErrors = result.array();

  // Filter out nested-field errors when their parent object/array is not present in the request body.
  // This makes nested fields effectively optional if the containing object/array is omitted.
  const filtered = allErrors.filter(err => {
    const param = err.param;

    // If parameter is not nested (no dot or wildcard), keep the error.
    if (!/[\.\*\[]/.test(param)) return true;

    // Get the root key before the first dot, bracket or wildcard
    const root = param.split(/[\.\[\*]/)[0];

    // If root exists in req.body (even if it's null/empty object) then we should keep the error.
    // If it doesn't exist, treat nested fields as optional and discard the error.
    return req.body && Object.prototype.hasOwnProperty.call(req.body, root);
  });

  if (filtered.length === 0) {
    // No actionable errors remain after filtering nested-fields that weren't present
    return next();
  }

  console.log('Validation errors:', filtered);
  const errorMessages = filtered.map(err => ({
    field: err.param,
    message: err.msg,
    value: err.value
  }));
  return next(new AppError('Validation failed', 400, errorMessages));
};

module.exports = {
  customSanitizers,
  commonValidations,
  validateFile,
  validate
};