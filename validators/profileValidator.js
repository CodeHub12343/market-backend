const { body } = require('express-validator');
const { validate } = require('../middlewares/validationMiddleware');

exports.validateProfileUpdate = [
  // Basic Info
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),

  body('phoneNumber')
    .optional()
    .trim()
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/)
    .withMessage('Please provide a valid phone number'),

  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),

  body('department')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Department must be between 2 and 100 characters'),

  body('graduationYear')
    .optional()
    .isInt({ min: 2000, max: 2100 })
    .withMessage('Please provide a valid graduation year'),

  // Social Links
  body('socialLinks.facebook')
    .optional()
    .trim()
    .isURL()
    .withMessage('Please provide a valid Facebook URL'),

  body('socialLinks.twitter')
    .optional()
    .trim()
    .isURL()
    .withMessage('Please provide a valid Twitter URL'),

  body('socialLinks.instagram')
    .optional()
    .trim()
    .isURL()
    .withMessage('Please provide a valid Instagram URL'),

  body('socialLinks.linkedin')
    .optional()
    .trim()
    .isURL()
    .withMessage('Please provide a valid LinkedIn URL'),

  body('socialLinks.whatsapp')
    .optional()
    .trim()
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/)
    .withMessage('Please provide a valid WhatsApp number'),

  validate
];

exports.validatePreferencesUpdate = [
  body('preferences.emailNotifications')
    .optional()
    .isBoolean()
    .withMessage('Email notifications must be true or false'),

  body('preferences.pushNotifications')
    .optional()
    .isBoolean()
    .withMessage('Push notifications must be true or false'),

  body('preferences.profileVisibility')
    .optional()
    .isIn(['public', 'campus-only', 'private'])
    .withMessage('Invalid profile visibility option'),

  body('preferences.language')
    .optional()
    .isLength({ min: 2, max: 5 })
    .withMessage('Please provide a valid language code'),

  body('preferences.currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Please provide a valid currency code'),

  validate
];