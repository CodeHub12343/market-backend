const { body, param, query } = require('express-validator');

const documentValidation = {
  create: [
    body('title')
      .isString()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Title must be 1-200 characters'),
    body('description')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must be less than 1000 characters'),
    body('campus')
      .isMongoId()
      .withMessage('Valid campus ID is required'),
    body('category')
      .optional()
      .isIn(['assignment', 'note', 'past-question', 'project', 'other'])
      .withMessage('Invalid category'),
    body('tags')
      .optional()
      .custom((val) => {
        if (Array.isArray(val)) {
          if (val.length > 10) throw new Error('Maximum 10 tags allowed');
          return val.every(tag => typeof tag === 'string' && tag.length <= 50);
        }
        if (typeof val === 'string') {
          const tags = val.split(',').map(t => t.trim());
          if (tags.length > 10) throw new Error('Maximum 10 tags allowed');
          return tags.every(tag => tag.length <= 50);
        }
        throw new Error('Tags must be array or comma-separated string');
      }),
    body('visibility')
      .optional()
      .isIn(['public', 'campus', 'private'])
      .withMessage('Invalid visibility setting'),
  ],

  update: [
    param('id').isMongoId().withMessage('Invalid document ID'),
    body('title')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Title must be 1-200 characters'),
    body('description')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must be less than 1000 characters'),
    body('category')
      .optional()
      .isIn(['assignment', 'note', 'past-question', 'project', 'other'])
      .withMessage('Invalid category'),
    body('tags')
      .optional()
      .custom((val) => {
        if (Array.isArray(val)) {
          if (val.length > 10) throw new Error('Maximum 10 tags allowed');
          return val.every(tag => typeof tag === 'string' && tag.length <= 50);
        }
        if (typeof val === 'string') {
          const tags = val.split(',').map(t => t.trim());
          if (tags.length > 10) throw new Error('Maximum 10 tags allowed');
          return tags.every(tag => tag.length <= 50);
        }
        throw new Error('Tags must be array or comma-separated string');
      }),
    body('visibility')
      .optional()
      .isIn(['public', 'campus', 'private'])
      .withMessage('Invalid visibility setting'),
  ],

  list: [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('category').optional().isIn(['assignment', 'note', 'past-question', 'project', 'other']),
    query('campus').optional().isMongoId().withMessage('Invalid campus ID'),
    query('uploadedBy').optional().isMongoId().withMessage('Invalid user ID'),
    query('sort').optional().isIn(['createdAt', '-createdAt', 'title', '-title', 'downloads', '-downloads', 'views', '-views']),
    query('search').optional().isString().isLength({ max: 100 }).withMessage('Search term too long'),
    query('tags').optional().isString().withMessage('Tags must be comma-separated string'),
    query('dateFrom').optional().isISO8601().withMessage('Invalid date format'),
    query('dateTo').optional().isISO8601().withMessage('Invalid date format'),
  ],

  search: [
    query('q').isString().isLength({ min: 1, max: 100 }).withMessage('Search query required'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50'),
    query('category').optional().isIn(['assignment', 'note', 'past-question', 'project', 'other']),
    query('campus').optional().isMongoId().withMessage('Invalid campus ID'),
  ],

  bulk: [
    body('documentIds')
      .isArray({ min: 1, max: 50 })
      .withMessage('Must provide 1-50 document IDs'),
    body('documentIds.*')
      .isMongoId()
      .withMessage('Invalid document ID'),
    body('action')
      .isIn(['delete', 'update', 'archive'])
      .withMessage('Invalid bulk action'),
    body('updateData')
      .optional()
      .isObject()
      .withMessage('Update data must be object'),
  ],

  favorite: [
    param('id').isMongoId().withMessage('Invalid document ID'),
  ],

  rating: [
    param('id').isMongoId().withMessage('Invalid document ID'),
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be 1-5'),
    body('review')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Review must be less than 500 characters'),
  ],

  comment: [
    param('id').isMongoId().withMessage('Invalid document ID'),
    body('text')
      .isString()
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Comment must be 1-500 characters'),
  ],

  idParam: [param('id').isMongoId().withMessage('Invalid document ID')],
};

module.exports = documentValidation;