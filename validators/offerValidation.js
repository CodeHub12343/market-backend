const { body, query, param } = require('express-validator');
const commonValidations = require('./authValidation');

const offerValidation = {
  // Create offer validation
  create: [
    body('request')
      .notEmpty()
      .isMongoId()
      .withMessage('Valid request ID is required'),
    
    body('product')
      .optional()
      .isMongoId()
      .withMessage('Product ID must be valid if provided'),
    
    body('amount')
      .isFloat({ min: 0.01, max: 1000000 })
      .withMessage('Amount must be between $0.01 and $1,000,000'),
    
    body('message')
      .optional()
      .isLength({ min: 0, max: 500 })
      .withMessage('Message cannot exceed 500 characters')
      .trim()
  ],

  // Update offer validation
  update: [
    body('amount')
      .optional()
      .isFloat({ min: 0.01, max: 1000000 })
      .withMessage('Amount must be between $0.01 and $1,000,000'),
    
    body('message')
      .optional()
      .isLength({ min: 0, max: 500 })
      .withMessage('Message cannot exceed 500 characters')
      .trim(),
    
    body('status')
      .optional()
      .isIn(['pending', 'accepted', 'rejected', 'withdrawn', 'cancelled'])
      .withMessage('Invalid status value')
  ],

  // Search offers validation
  search: [
    query('q')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be between 1 and 100 characters')
      .trim(),
    
    query('status')
      .optional()
      .isIn(['pending', 'accepted', 'rejected', 'withdrawn', 'cancelled'])
      .withMessage('Invalid status filter'),
    
    query('seller')
      .optional()
      .isMongoId()
      .withMessage('Invalid seller ID'),
    
    query('request')
      .optional()
      .isMongoId()
      .withMessage('Invalid request ID'),
    
    query('minAmount')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Minimum amount must be positive'),
    
    query('maxAmount')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Maximum amount must be positive'),
    
    query('sortBy')
      .optional()
      .isIn(['amount', 'createdAt', 'updatedAt', 'status'])
      .withMessage('Invalid sort field'),
    
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc'),
    
    query('page')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Page must be between 1 and 1000'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],

  // Bulk operations validation
  bulkWithdraw: [
    body('offerIds')
      .isArray({ min: 1, max: 50 })
      .withMessage('Must provide 1-50 offer IDs'),
    
    body('offerIds.*')
      .isMongoId()
      .withMessage('Each offer ID must be valid')
  ],

  bulkReject: [
    body('offerIds')
      .isArray({ min: 1, max: 50 })
      .withMessage('Must provide 1-50 offer IDs'),
    
    body('offerIds.*')
      .isMongoId()
      .withMessage('Each offer ID must be valid')
  ],

  // Analytics validation
  analytics: [
    query('period')
      .optional()
      .isIn(['7d', '30d', '90d', '1y', 'all'])
      .withMessage('Invalid period filter'),
    
    query('seller')
      .optional()
      .isMongoId()
      .withMessage('Invalid seller ID'),
    
    query('request')
      .optional()
      .isMongoId()
      .withMessage('Invalid request ID')
  ],

  // ID parameter validation
  id: [
    param('id')
      .isMongoId()
      .withMessage('Invalid offer ID')
  ],

  // Status update validation
  updateStatus: [
    body('status')
      .isIn(['pending', 'accepted', 'rejected', 'withdrawn', 'cancelled'])
      .withMessage('Invalid status value'),
    
    body('reason')
      .optional()
      .isLength({ min: 0, max: 200 })
      .withMessage('Reason cannot exceed 200 characters')
      .trim()
  ]
};

module.exports = offerValidation;