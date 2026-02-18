const { body, param, query } = require('express-validator');
const { validate } = require('../middlewares/validationMiddleware');

const shopValidation = {
  create: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Shop name must be between 2 and 100 characters')
      .matches(/^[a-zA-Z0-9\s\-&.,'"]+$/)
      .withMessage('Shop name contains invalid characters'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    
    body('campus')
      .isMongoId()
      .withMessage('Invalid campus ID'),
    
    body('categories')
      .optional()
      .isArray({ min: 1, max: 5 })
      .withMessage('Categories must be an array with 1-5 items'),
    
    body('categories.*')
      .optional()
      .trim()
      .isLength({ min: 2, max: 30 })
      .withMessage('Each category must be 2-30 characters'),
    
    body('tags')
      .optional()
      .isArray({ max: 10 })
      .withMessage('Tags must be an array with maximum 10 items'),
    
    body('tags.*')
      .optional()
      .trim()
      .isLength({ min: 2, max: 20 })
      .withMessage('Each tag must be 2-20 characters'),
    
    body('contactInfo.phone')
      .optional()
      .trim()
      .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/)
      .withMessage('Please provide a valid phone number'),
    
    body('contactInfo.email')
      .optional()
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email address'),
    
    body('contactInfo.address')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Address cannot exceed 200 characters'),
    
    body('socialLinks.website')
      .optional()
      .trim()
      .isURL()
      .withMessage('Please provide a valid website URL'),
    
    body('socialLinks.facebook')
      .optional()
      .trim()
      .isURL()
      .withMessage('Please provide a valid Facebook URL'),
    
    body('socialLinks.instagram')
      .optional()
      .trim()
      .isURL()
      .withMessage('Please provide a valid Instagram URL'),
    
    body('whatsappNumber')
      .optional()
      .trim()
      .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/)
      .withMessage('Please provide a valid WhatsApp number (e.g., +234 8012345678)'),
    
    validate
  ],

  update: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Shop name must be between 2 and 100 characters')
      .matches(/^[a-zA-Z0-9\s\-&.,'"]+$/)
      .withMessage('Shop name contains invalid characters'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    
    body('categories')
      .optional()
      .isArray({ min: 1, max: 5 })
      .withMessage('Categories must be an array with 1-5 items'),
    
    body('categories.*')
      .optional()
      .trim()
      .isLength({ min: 2, max: 30 })
      .withMessage('Each category must be 2-30 characters'),
    
    body('tags')
      .optional()
      .isArray({ max: 10 })
      .withMessage('Tags must be an array with maximum 10 items'),
    
    body('tags.*')
      .optional()
      .trim()
      .isLength({ min: 2, max: 20 })
      .withMessage('Each tag must be 2-20 characters'),
    
    body('status')
      .optional()
      .isIn(['active', 'suspended', 'closed'])
      .withMessage('Status must be active, suspended, or closed'),
    
    body('contactInfo.phone')
      .optional()
      .trim()
      .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/)
      .withMessage('Please provide a valid phone number'),
    
    body('contactInfo.email')
      .optional()
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email address'),
    
    body('contactInfo.address')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Address cannot exceed 200 characters'),
    
    body('socialLinks.website')
      .optional()
      .trim()
      .isURL()
      .withMessage('Please provide a valid website URL'),
    
    body('socialLinks.facebook')
      .optional()
      .trim()
      .isURL()
      .withMessage('Please provide a valid Facebook URL'),
    
    body('socialLinks.instagram')
      .optional()
      .trim()
      .isURL()
      .withMessage('Please provide a valid Instagram URL'),
    
    body('whatsappNumber')
      .optional()
      .trim()
      .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/)
      .withMessage('Please provide a valid WhatsApp number (e.g., +234 8012345678)'),
    
    validate
  ],

  search: [
    query('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Search name must be 2-100 characters'),
    
    query('campus')
      .optional()
      .isMongoId()
      .withMessage('Invalid campus ID'),
    
    query('category')
      .optional()
      .trim()
      .isLength({ min: 2, max: 30 })
      .withMessage('Category must be 2-30 characters'),
    
    query('status')
      .optional()
      .isIn(['active', 'suspended', 'closed'])
      .withMessage('Status must be active, suspended, or closed'),
    
    query('minRating')
      .optional()
      .isFloat({ min: 1, max: 5 })
      .withMessage('Minimum rating must be between 1 and 5'),
    
    query('maxRating')
      .optional()
      .isFloat({ min: 1, max: 5 })
      .withMessage('Maximum rating must be between 1 and 5'),
    
    query('sort')
      .optional()
      .isIn(['name', 'rating', 'createdAt', 'views'])
      .withMessage('Sort must be name, rating, createdAt, or views'),
    
    query('order')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Order must be asc or desc'),
    
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50'),
    
    validate
  ],

  id: [
    param('id')
      .isMongoId()
      .withMessage('Invalid shop ID'),
    validate
  ]
};

module.exports = shopValidation;