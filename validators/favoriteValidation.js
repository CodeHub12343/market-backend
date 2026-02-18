const { body, param, query } = require('express-validator');
const commonValidations = require('./commonValidations');

// Favorite creation validation
const createFavorite = [
  body('itemId')
    .notEmpty()
    .withMessage('Item ID is required')
    .isMongoId()
    .withMessage('Invalid item ID format'),
  
  body('itemType')
    .notEmpty()
    .withMessage('Item type is required')
    .isIn(['Post', 'Product', 'Service', 'Event', 'Document'])
    .withMessage('Invalid item type. Must be one of: Post, Product, Service, Event, Document')
];

// Favorite toggle validation
const toggleFavorite = [
  body('itemId')
    .notEmpty()
    .withMessage('Item ID is required')
    .isMongoId()
    .withMessage('Invalid item ID format'),
  
  body('itemType')
    .notEmpty()
    .withMessage('Item type is required')
    .isIn(['Post', 'Product', 'Service', 'Event', 'Document'])
    .withMessage('Invalid item type. Must be one of: Post, Product, Service, Event, Document')
];

// Favorite list validation
const listFavorites = [
  query('itemType')
    .optional()
    .isIn(['Post', 'Product', 'Service', 'Event', 'Document'])
    .withMessage('Invalid item type filter'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  
  query('sort')
    .optional()
    .isIn(['createdAt', '-createdAt', 'itemType', '-itemType'])
    .withMessage('Invalid sort field. Use: createdAt, -createdAt, itemType, -itemType'),
  
  commonValidations.page(),
  commonValidations.limit()
];

// Bulk favorite operations validation
const bulkFavoriteOperations = [
  body('operation')
    .isIn(['add', 'remove', 'clear'])
    .withMessage('Invalid bulk operation. Must be: add, remove, clear'),
  
  body('items')
    .optional()
    .isArray({ min: 1, max: 100 })
    .withMessage('Items must be an array with 1-100 items')
    .custom((items) => {
      if (items) {
        items.forEach((item, index) => {
          if (!item.itemId || !item.itemType) {
            throw new Error(`Item at index ${index} must have itemId and itemType`);
          }
          if (!item.itemId.match(/^[0-9a-fA-F]{24}$/)) {
            throw new Error(`Invalid itemId format at index ${index}`);
          }
          if (!['Post', 'Product', 'Service', 'Event', 'Document'].includes(item.itemType)) {
            throw new Error(`Invalid itemType at index ${index}`);
          }
        });
      }
      return true;
    }),
  
  body('itemType')
    .optional()
    .isIn(['Post', 'Product', 'Service', 'Event', 'Document'])
    .withMessage('Invalid item type filter for bulk operations')
];

// Favorite analytics validation
const getFavoriteAnalytics = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  
  query('itemType')
    .optional()
    .isIn(['Post', 'Product', 'Service', 'Event', 'Document'])
    .withMessage('Invalid item type filter')
];

// Favorite ID parameter validation
const favoriteIdParam = [
  param('id')
    .isMongoId()
    .withMessage('Invalid favorite ID')
];

// User ID parameter validation (for admin routes)
const userIdParam = [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID')
];

// Favorite search validation
const searchFavorites = [
  query('q')
    .notEmpty()
    .withMessage('Search query is required')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  
  query('itemType')
    .optional()
    .isIn(['Post', 'Product', 'Service', 'Event', 'Document'])
    .withMessage('Invalid item type filter'),
  
  commonValidations.page(),
  commonValidations.limit()
];

module.exports = {
  createFavorite,
  toggleFavorite,
  listFavorites,
  bulkFavoriteOperations,
  getFavoriteAnalytics,
  favoriteIdParam,
  userIdParam,
  searchFavorites
};