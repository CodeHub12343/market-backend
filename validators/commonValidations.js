// src/validators/commonValidations.js
const { query } = require('express-validator');

const commonValidations = {
  // Pagination validation
  page: () => query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  limit: () => query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  // Sort validation
  sort: () => query('sort')
    .optional()
    .isString()
    .withMessage('Sort must be a string'),
  
  order: () => query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Order must be asc or desc'),
  
  // Date validation
  dateFrom: () => query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('Start date must be valid ISO 8601 date'),
  
  dateTo: () => query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('End date must be valid ISO 8601 date'),
  
  // Search validation
  search: () => query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  
  // Status validation
  status: () => query('status')
    .optional()
    .isString()
    .withMessage('Status must be a string'),
  
  // Boolean validation
  boolean: (field) => query(field)
    .optional()
    .isBoolean()
    .withMessage(`${field} must be boolean`),
  
  // ID validation
  id: () => query('id')
    .optional()
    .isMongoId()
    .withMessage('Invalid ID format')
};

module.exports = commonValidations;