const { body, query, param } = require('express-validator');
const commonValidations = require('./authValidation');

const requestValidation = {
  // Create request validation
  create: [
    body('title')
      .trim()
      .isLength({ min: 3, max: 200 })
      .withMessage('Request title must be between 3 and 200 characters')
      .matches(/^[a-zA-Z0-9\s\-–—.,!?'\"()&:;/]+$/)
      .withMessage('Request title contains invalid characters'),
    
    body('description')
      .optional()
      .isLength({ min: 0, max: 1000 })
      .withMessage('Description cannot exceed 1000 characters')
      .trim(),
    
    body('category')
      .optional()
      .isMongoId()
      .withMessage('Category ID must be valid if provided'),
    
    body('campus')
      .optional()
      .isMongoId()
      .withMessage('Campus ID must be valid if provided'),
    
    body('desiredPrice')
      .optional()
      .isFloat({ min: 0, max: 1000000 })
      .withMessage('Desired price must be between $0 and $1,000,000'),
    
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Priority must be low, medium, high, or urgent'),
    
    body('tags')
      .optional()
      .isArray({ max: 10 })
      .withMessage('Maximum 10 tags allowed'),
    
    body('tags.*')
      .optional()
      .isLength({ min: 1, max: 20 })
      .withMessage('Each tag must be between 1 and 20 characters')
      .trim(),
    
    body('location')
      .optional()
      .isObject()
      .withMessage('Location must be an object'),
    
    body('location.address')
      .optional()
      .isLength({ min: 0, max: 200 })
      .withMessage('Address cannot exceed 200 characters'),
    
    body('location.coordinates')
      .optional()
      .isArray({ min: 2, max: 2 })
      .withMessage('Coordinates must be an array of 2 numbers'),
    
    body('location.coordinates.*')
      .optional()
      .isFloat()
      .withMessage('Coordinates must be valid numbers'),
    
    body('expiresAt')
      .optional()
      .isISO8601()
      .withMessage('Expiration date must be a valid ISO 8601 date')
      .custom((value) => {
        if (new Date(value) <= new Date()) {
          throw new Error('Expiration date must be in the future');
        }
        return true;
      }),
    
    body('images')
      .optional()
      .isArray({ max: 5 })
      .withMessage('Maximum 5 images allowed'),
    
    body('images.*')
      .optional()
      .isURL()
      .withMessage('Each image must be a valid URL')
  ],

  // Update request validation
  update: [
    body('title')
      .optional()
      .trim()
      .isLength({ min: 3, max: 200 })
      .withMessage('Request title must be between 3 and 200 characters')
      .matches(/^[a-zA-Z0-9\s\-–—.,!?'\"()&:;/]+$/)
      .withMessage('Request title contains invalid characters'),
    
    body('description')
      .optional()
      .isLength({ min: 0, max: 1000 })
      .withMessage('Description cannot exceed 1000 characters')
      .trim(),
    
    body('category')
      .optional()
      .isMongoId()
      .withMessage('Category ID must be valid if provided'),
    
    body('campus')
      .optional()
      .isMongoId()
      .withMessage('Campus ID must be valid if provided'),
    
    body('desiredPrice')
      .optional()
      .isFloat({ min: 0, max: 1000000 })
      .withMessage('Desired price must be between $0 and $1,000,000'),
    
    body('status')
      .optional()
      .isIn(['open', 'fulfilled', 'closed'])
      .withMessage('Invalid status value'),
    
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Priority must be low, medium, high, or urgent'),
    
    body('tags')
      .optional()
      .isArray({ max: 10 })
      .withMessage('Maximum 10 tags allowed'),
    
    body('tags.*')
      .optional()
      .isLength({ min: 1, max: 20 })
      .withMessage('Each tag must be between 1 and 20 characters')
      .trim()
  ],

  // Search requests validation
  search: [
    query('q')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be between 1 and 100 characters')
      .trim(),
    
    query('status')
      .optional()
      .isIn(['open', 'fulfilled', 'closed'])
      .withMessage('Invalid status filter'),
    
    query('category')
      .optional()
      .isMongoId()
      .withMessage('Invalid category ID'),
    
    query('campus')
      .optional()
      .isMongoId()
      .withMessage('Invalid campus ID'),
    
    query('requester')
      .optional()
      .isMongoId()
      .withMessage('Invalid requester ID'),
    
    query('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Invalid priority filter'),
    
    query('minPrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Minimum price must be positive'),
    
    query('maxPrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Maximum price must be positive'),
    
    query('hasOffers')
      .optional()
      .isBoolean()
      .withMessage('hasOffers must be true or false'),
    
    query('expired')
      .optional()
      .isBoolean()
      .withMessage('expired must be true or false'),
    
    query('sortBy')
      .optional()
      .isIn(['title', 'createdAt', 'updatedAt', 'desiredPrice', 'priority', 'offersCount'])
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
  bulkDelete: [
    body('requestIds')
      .isArray({ min: 1, max: 50 })
      .withMessage('Must provide 1-50 request IDs'),
    
    body('requestIds.*')
      .isMongoId()
      .withMessage('Each request ID must be valid')
  ],

  bulkUpdateStatus: [
    body('requestIds')
      .isArray({ min: 1, max: 50 })
      .withMessage('Must provide 1-50 request IDs'),
    
    body('requestIds.*')
      .isMongoId()
      .withMessage('Each request ID must be valid'),
    
    body('status')
      .isIn(['open', 'fulfilled', 'closed'])
      .withMessage('Invalid status value'),
    
    body('reason')
      .optional()
      .isLength({ min: 0, max: 200 })
      .withMessage('Reason cannot exceed 200 characters')
      .trim()
  ],

  // Analytics validation
  analytics: [
    query('period')
      .optional()
      .isIn(['7d', '30d', '90d', '1y', 'all'])
      .withMessage('Invalid period filter'),
    
    query('requester')
      .optional()
      .isMongoId()
      .withMessage('Invalid requester ID'),
    
    query('category')
      .optional()
      .isMongoId()
      .withMessage('Invalid category ID'),
    
    query('campus')
      .optional()
      .isMongoId()
      .withMessage('Invalid campus ID')
  ],

  // ID parameter validation
  id: [
    param('id')
      .isMongoId()
      .withMessage('Invalid request ID')
  ],

  // Status update validation
  updateStatus: [
    body('status')
      .isIn(['open', 'fulfilled', 'closed'])
      .withMessage('Invalid status value'),
    
    body('reason')
      .optional()
      .isLength({ min: 0, max: 200 })
      .withMessage('Reason cannot exceed 200 characters')
      .trim()
  ],

  // Image upload validation
  uploadImages: [
    body('images')
      .isArray({ min: 1, max: 5 })
      .withMessage('Must provide 1-5 images'),
    
    body('images.*')
      .isURL()
      .withMessage('Each image must be a valid URL')
  ]
};

module.exports = requestValidation;