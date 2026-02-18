const { body } = require('express-validator');
const { commonValidations } = require('../middlewares/validationMiddleware');

const productValidation = {
  create: [
    body('name')
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Product name must be between 3 and 100 characters'),
    body('description')
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage('Description must be between 10 and 1000 characters'),
    commonValidations.price(),
    body('category')
      .isMongoId()
      .withMessage('Invalid category ID'),
    body('quantity')
      .isInt({ min: 0 })
      .withMessage('Quantity must be a non-negative integer'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
    body('tags.*')
      .trim()
      .isLength({ min: 2, max: 20 })
      .withMessage('Each tag must be between 2 and 20 characters'),
    body('condition')
      .isIn(['new', 'like-new', 'good', 'fair', 'poor'])
      .withMessage('Invalid condition specified'),
    body('location')
      .optional()
      .isObject()
      .withMessage('Location must be an object'),
    body('location.coordinates')
      .optional()
      .isArray({ min: 2, max: 2 })
      .withMessage('Coordinates must be an array of [longitude, latitude]'),
    body('location.coordinates.*')
      .optional()
      .isFloat()
      .withMessage('Coordinates must be valid numbers')
  ],

  update: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Product name must be between 3 and 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage('Description must be between 10 and 1000 characters'),
    body('price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Price must be a positive number'),
    body('category')
      .optional()
      .isMongoId()
      .withMessage('Invalid category ID'),
    body('quantity')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Quantity must be a non-negative integer'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
    body('tags.*')
      .optional()
      .trim()
      .isLength({ min: 2, max: 20 })
      .withMessage('Each tag must be between 2 and 20 characters'),
    body('condition')
      .optional()
      .isIn(['new', 'like-new', 'good', 'fair', 'poor'])
      .withMessage('Invalid condition specified')
  ]
};

module.exports = productValidation;