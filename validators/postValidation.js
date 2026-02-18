const { body, param, query } = require('express-validator');

const postValidation = {
  create: [
    body('campus').notEmpty().withMessage('Campus is required'),
    body('content').optional().isString().isLength({ max: 2000 }).withMessage('Content too long'),
    body('visibility').optional().isIn(['public', 'campus', 'private']).withMessage('Invalid visibility'),
    body('tags').optional().custom((val) => {
      if (Array.isArray(val)) return true;
      if (typeof val === 'string') return true; // comma-separated
      throw new Error('Tags must be array or comma-separated string');
    }),
  ],

  update: [
    param('id').isMongoId().withMessage('Invalid post id'),
    body('content').optional().isString().isLength({ max: 2000 }).withMessage('Content too long'),
    body('visibility').optional().isIn(['public', 'campus', 'private']).withMessage('Invalid visibility'),
    body('tags').optional().custom((val) => {
      if (Array.isArray(val)) return true;
      if (typeof val === 'string') return true;
      throw new Error('Tags must be array or comma-separated string');
    }),
    body('replaceMedia').optional().isBoolean().withMessage('replaceMedia must be boolean'),
  ],

  list: [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('visibility').optional().isIn(['public', 'campus', 'private']).withMessage('Invalid visibility'),
  ],

  idParam: [param('id').isMongoId().withMessage('Invalid post id')],
};

module.exports = postValidation;

