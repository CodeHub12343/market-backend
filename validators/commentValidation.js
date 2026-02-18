const { body, param, query } = require('express-validator');

const commentValidation = {
  create: [
    param('postId').isMongoId().withMessage('Invalid post id'),
    body('text').isString().trim().isLength({ min: 1, max: 300 }).withMessage('Comment must be 1-300 chars'),
  ],

  update: [
    param('id').isMongoId().withMessage('Invalid comment id'),
    body('text').isString().trim().isLength({ min: 1, max: 300 }).withMessage('Comment must be 1-300 chars'),
  ],

  listByPost: [
    param('postId').isMongoId().withMessage('Invalid post id'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('sort').optional().isIn(['createdAt', '-createdAt']).withMessage('Invalid sort'),
  ],

  idParam: [param('id').isMongoId().withMessage('Invalid comment id')],
};

module.exports = commentValidation;

